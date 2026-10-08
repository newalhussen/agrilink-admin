import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Eye, EyeOff, Flag, MapPin, Phone, Truck } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/common/dialogs";
import {
  Avatar, EmptyState, ErrorState, KeyValue, PageHeader, Pager, SearchBox, SegTabs, StatusTag, TableSkeleton, useDebounced,
} from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { api, errorMessage } from "@/lib/api";
import { DELIVERY_STATUS, DISPUTE_TYPE_LABEL, ORDER_FILTERS, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDateTime, formatKg, formatMoney, formatPhone, timeLeft } from "@/lib/format";
import type { AdminPayment, DeliveryEvent, Dispute, Order, OrderListItem, Page, PartyView, TimelineEntry } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";

/** Countdown shown next to the status when a timer is running for the order. */
function timerFor(o: OrderListItem): string | null {
  if (o.status === "PENDING") return timeLeft(o.deadlines.farmerResponseDeadline);
  if (o.status === "ACCEPTED" || o.status === "PAYMENT_PENDING") return timeLeft(o.deadlines.paymentDeadline);
  if (o.status === "DELIVERED") return timeLeft(o.deadlines.checkWindowEndsAt);
  return null;
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialFilter = ORDER_FILTERS.find((f) => f.statuses.length === 1 && f.statuses[0] === params.get("status"))?.key ?? params.get("filter") ?? "all";
  const [filter, setFilter] = React.useState(initialFilter);
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [page, setPage] = React.useState(0);
  const term = useDebounced(q);
  React.useEffect(() => setPage(0), [filter, term]);
  React.useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const statuses = ORDER_FILTERS.find((f) => f.key === filter)?.statuses ?? [];
  const singleStatus = params.get("status") && !ORDER_FILTERS.some((f) => f.statuses.length === 1 && f.statuses[0] === params.get("status")) ? [params.get("status")!] : null;
  const query = useQuery({
    queryKey: ["orders", filter, singleStatus, term, page],
    queryFn: () => api.get<Page<OrderListItem>>("/admin/orders", { status: singleStatus ?? statuses, q: term || undefined, page, size: 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        actions={<SearchBox value={q} onChange={(v) => { setQ(v); if (params.has("q")) setParams({}, { replace: true }); }} placeholder="Order number AL-…" />}
      />
      <SegTabs label="Order stage" value={filter} onChange={(v) => { setFilter(v); if (params.has("status")) setParams({}, { replace: true }); }} options={ORDER_FILTERS.map((f) => ({ value: f.key, label: f.label }))} />
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState title="No orders here" hint="Orders appear as soon as buyers place them." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[900px]">
              <thead><tr><th>Order</th><th>Buyer</th><th>Farmer</th><th>Product</th><th>Status</th><th>Driver</th><th className="text-right">Total ETB</th></tr></thead>
              <tbody>
                {query.data?.items.map((o) => {
                  const timer = timerFor(o);
                  return (
                    <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                      <td><b>{o.orderNumber}</b><div className="text-xs text-sand-700">{formatDateTime(o.createdAt)}</div></td>
                      <td>{o.buyerName}</td>
                      <td>{o.farmerName}</td>
                      <td className="max-w-[240px] truncate" title={o.itemsSummary}>{o.itemsSummary}</td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <StatusTag status={o.status} map={ORDER_STATUS} />
                          {timer ? <span className={cn("text-xs", timer === "overdue" ? "font-semibold text-terra-800" : "text-sand-700")}>{timer}</span> : null}
                        </div>
                      </td>
                      <td>{o.driverName ?? <span className="text-sand-700">—</span>}</td>
                      <td className="tabular text-right">{formatMoney(o.totalAmount, { currency: false })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}
    </>
  );
}

interface OrderDetailData {
  order: Order;
  timeline: TimelineEntry[];
  payments: AdminPayment[];
  deliveryEvents: DeliveryEvent[];
  disputes: Dispute[];
}

function Party({ title, party, icon }: { title: string; party: PartyView | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-background px-4 py-3">
      <Avatar name={party?.fullName ?? "?"} size={40} tone="sage" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="text-xs text-sand-700">{title}</div>
        {party ? (
          <>
            <Link to={`/users/${party.id}`} className="block truncate font-bold">{party.displayName ?? party.fullName}</Link>
            <span className="text-[13px] text-sand-700">{party.displayName ? `${party.fullName} · ` : ""}{formatPhone(party.phone)}</span>
          </>
        ) : (
          <span className="text-sand-700">Not assigned yet</span>
        )}
      </div>
      {icon}
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);
  const query = useQuery({ queryKey: ["order", id], queryFn: () => api.get<OrderDetailData>(`/admin/orders/${id}`), refetchInterval: 30_000 });
  const cancel = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      toast.success("Order cancelled. Any held payment is being refunded.");
      setCancelOpen(false);
      void qc.invalidateQueries({ queryKey: ["order", id] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (query.isLoading) return <TableSkeleton rows={8} cols={2} />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const { order, timeline, payments, deliveryEvents, disputes } = query.data;
  const canCancel = order.allowedActions.includes("CANCEL");
  const delivery = order.delivery;
  const activeDispute = disputes.find((d) => d.status !== "RESOLVED");

  return (
    <>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-3">{order.orderNumber}<StatusTag status={order.status} map={ORDER_STATUS} className="text-xs" /></span>}
        kicker={<Link to="/orders" className="inline-flex items-center gap-1 font-semibold"><ArrowLeft className="size-3.5" />Orders</Link>}
        actions={
          <>
            {activeDispute ? <Button asChild variant="secondary"><Link to={`/disputes/${activeDispute.id}`}><Flag />Open dispute</Link></Button> : null}
            {canCancel ? <Button variant="danger" onClick={() => setCancelOpen(true)}><Ban />Cancel order</Button> : null}
          </>
        }
      />
      {order.statusReason ? <p className="-mt-4 text-sm text-sand-700">Latest note: {order.statusReason}</p> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex flex-col gap-8">
          <section className="grid gap-3 md:grid-cols-3" aria-label="People">
            <Party title="Buyer" party={order.buyer} />
            <Party title="Farmer" party={order.farmer} />
            <Party title="Driver" party={order.driver} icon={order.driver ? <Truck className="size-4 text-sand-700" /> : undefined} />
          </section>

          <section aria-label="Items">
            <h4 className="mb-2">Items</h4>
            <div className="overflow-x-auto">
              <table className="ds-table min-w-[560px]">
                <thead><tr><th>Product</th><th>Grade</th><th className="text-right">Quantity</th><th className="text-right">Unit price</th><th className="text-right">Line total</th></tr></thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td><b>{i.productName}</b></td>
                      <td>{i.qualityGrade ?? "—"}</td>
                      <td className="tabular text-right">{Number(i.quantity)} {i.unit.toLowerCase()} · {formatKg(i.weightKg)}</td>
                      <td className="tabular text-right">{formatMoney(i.unitPrice, { currency: false })}</td>
                      <td className="tabular text-right">{formatMoney(i.lineTotal, { currency: false })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-3 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular">
              <dt>Goods</dt><dd className="text-right">{formatMoney(order.amounts.subtotal, { currency: false })}</dd>
              <dt>Delivery</dt><dd className="text-right">{formatMoney(order.amounts.deliveryFee, { currency: false })}</dd>
              <dt>AgriLink fee</dt><dd className="text-right">{formatMoney(order.amounts.platformFee, { currency: false })}</dd>
              <dt className="border-t border-border pt-1 font-bold">Total</dt><dd className="border-t border-border pt-1 text-right font-bold">{formatMoney(order.amounts.total)}</dd>
            </dl>
          </section>

          <section aria-label="Timeline">
            <h4 className="mb-2">Timeline</h4>
            <ol className="flex flex-col text-sm">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3.5 py-2">
                  <span className="w-28 shrink-0 text-sand-700">{formatDateTime(t.at)}</span>
                  <span>
                    <b>{ORDER_STATUS[t.to].label}</b> <span className="text-sand-700">· {titleCase(t.actorRole)}</span>
                    {t.note ? <span className="block text-sand-700">{t.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {deliveryEvents.length > 0 ? (
            <section aria-label="Tracking">
              <h4 className="mb-2">Delivery tracking</h4>
              <ol className="flex flex-col text-sm">
                {deliveryEvents.map((e, i) => (
                  <li key={i} className="flex gap-3.5 py-1.5">
                    <span className="w-28 shrink-0 text-sand-700">{formatDateTime(e.at)}</span>
                    <span>
                      <b>{titleCase(e.type)}</b>
                      {e.latitude != null ? <span className="ml-2 inline-flex items-center gap-1 text-sand-700"><MapPin className="size-3" />{e.latitude.toFixed(3)}, {e.longitude?.toFixed(3)}</span> : null}
                      {e.note ? <span className="block text-sand-700">{e.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 self-start rounded-[36px] bg-surface p-6">
          <KeyValue label="Placed">{formatDateTime(order.timestamps.createdAt)}</KeyValue>
          <KeyValue label="Weight">{formatKg(order.totalWeightKg)}</KeyValue>
          <KeyValue label="Deliver to">
            {[order.deliveryAddress?.addressLine, order.deliveryAddress?.town, order.deliveryAddress?.regionName].filter(Boolean).join(", ") || "—"}
            {order.deliveryContactName ? <span className="block font-normal text-sand-700"><Phone className="mr-1 inline size-3" />{order.deliveryContactName} · {formatPhone(order.deliveryContactPhone)}</span> : null}
          </KeyValue>
          {order.buyerNotes ? <KeyValue label="Buyer note">{order.buyerNotes}</KeyValue> : null}
          <KeyValue label="Timers">
            <span className="block font-normal">Farmer answer by {formatDateTime(order.deadlines.farmerResponseDeadline)}</span>
            <span className="block font-normal">Pay by {formatDateTime(order.deadlines.paymentDeadline)}</span>
            <span className="block font-normal">Check window ends {formatDateTime(order.deadlines.checkWindowEndsAt)}</span>
          </KeyValue>

          <div className="border-t border-border pt-4">
            <h5 className="mb-2 font-sans text-sm font-bold uppercase tracking-wide text-sand-700">Payments</h5>
            {payments.length === 0 ? <p className="text-sm text-sand-700">No payment attempts yet.</p> : (
              <ul className="flex flex-col gap-3">
                {payments.map((p) => (
                  <li key={p.payment.id} className="rounded-3xl bg-background px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <b className="tabular">{formatMoney(p.payment.amount)}</b>
                      <StatusTag status={p.payment.status} map={PAYMENT_STATUS} />
                    </div>
                    <div className="mt-1 text-xs text-sand-700">{titleCase(p.payment.method)} · {p.payment.transactionReference}</div>
                    {p.payment.failureReason ? <div className="mt-1 text-xs text-terra-800">{p.payment.failureReason}</div> : null}
                    {p.releasedAt ? (
                      <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 text-xs tabular text-sand-800">
                        <span>Farmer</span><span>{formatMoney(p.releasedFarmerAmount, { currency: false })}</span>
                        <span>Driver</span><span>{formatMoney(p.releasedDriverAmount, { currency: false })}</span>
                        <span>Refunded</span><span>{formatMoney(p.payment.refundedAmount, { currency: false })}</span>
                        <span>AgriLink</span><span>{formatMoney(p.platformFeeRetained, { currency: false })}</span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {delivery ? (
            <div className="border-t border-border pt-4">
              <h5 className="mb-2 flex items-center justify-between font-sans text-sm font-bold uppercase tracking-wide text-sand-700">
                Delivery <StatusTag status={delivery.status} map={DELIVERY_STATUS} />
              </h5>
              <div className="flex flex-col gap-2 text-sm">
                <div>Driver fee <b className="tabular">{formatMoney(delivery.driverFee)}</b>{delivery.distanceKm ? ` · ${Number(delivery.distanceKm).toFixed(0)} km` : ""}</div>
                {delivery.pickedUpWeightKg ? <div>Weighed at pickup <b>{formatKg(delivery.pickedUpWeightKg)}</b>{delivery.pickedUpCrateCount ? ` · ${delivery.pickedUpCrateCount} crates` : ""}</div> : null}
                <div className="flex items-center gap-2 rounded-3xl bg-background px-4 py-2.5">
                  <div className="flex-1 text-xs">
                    <div>Pickup code <b className="tabular text-sm">{reveal ? delivery.pickupCode : "••••••"}</b></div>
                    <div>Delivery code <b className="tabular text-sm">{reveal ? delivery.deliveryCode : "••••••"}</b></div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={reveal ? "Hide codes" : "Show codes"} onClick={() => setReveal((v) => !v)}>{reveal ? <EyeOff /> : <Eye />}</Button>
                </div>
                <Button variant="secondary" size="sm" asChild><Link to={`/deliveries?q=${order.orderNumber}`}><Truck />Manage delivery</Link></Button>
              </div>
            </div>
          ) : null}

          {disputes.length > 0 ? (
            <div className="border-t border-border pt-4">
              <h5 className="mb-2 font-sans text-sm font-bold uppercase tracking-wide text-sand-700">Disputes</h5>
              <ul className="flex flex-col gap-2 text-sm">
                {disputes.map((d) => (
                  <li key={d.id}>
                    <Link to={`/disputes/${d.id}`} className="flex items-center justify-between gap-2 rounded-3xl bg-background px-4 py-2.5 font-semibold">
                      <span>{d.disputeNumber} · {DISPUTE_TYPE_LABEL[d.type] ?? d.type}</span>
                      <Tag tone={d.status === "RESOLVED" ? "solid-sage" : "solid-dark"}>{titleCase(d.status)}</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <ReasonDialog
        open={cancelOpen} onOpenChange={setCancelOpen}
        title={`Cancel ${order.orderNumber}?`}
        description="The buyer gets a full refund of anything already paid, stock goes back on sale and everyone involved is told."
        confirmLabel="Cancel order" pending={cancel.isPending}
        onConfirm={(reason) => cancel.mutate(reason)}
      />
    </>
  );
}

