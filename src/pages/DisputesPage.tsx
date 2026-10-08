import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClockAlert, FileText, Flag } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AuthImage, EmptyState, ErrorState, PageHeader, Pager, SearchBox, SegTabs, TableSkeleton, useDebounced } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { api, errorMessage } from "@/lib/api";
import { DISPUTE_TYPE_LABEL } from "@/lib/constants";
import { formatDateTime, formatDuration, formatKg, formatMoney, toNumber } from "@/lib/format";
import type { Dispute, DeliveryEvent, Order, Page, TimelineEntry } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";

const TABS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Past target" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function age(d: Dispute): string {
  const end = d.status === "RESOLVED" && d.resolution ? new Date(d.resolution.resolvedAt).getTime() : Date.now();
  return formatDuration(end - new Date(d.createdAt).getTime());
}

function DueTag({ dispute }: { dispute: Dispute }) {
  if (dispute.status === "RESOLVED") return <Tag tone="solid-sage">Resolved</Tag>;
  return dispute.overdue ? (
    <Tag tone="solid-dark" className="gap-1.5 px-3 py-1.5"><ClockAlert className="size-3.5" />{age(dispute)} open · target 24 h</Tag>
  ) : (
    <Tag tone="accent">{age(dispute)} open · due {formatDateTime(dispute.dueAt)}</Tag>
  );
}

export function DisputesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(params.get("overdue") === "true" ? "overdue" : "open");
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [page, setPage] = React.useState(0);
  const term = useDebounced(q);
  React.useEffect(() => setPage(0), [tab, term]);

  const query = useQuery({
    queryKey: ["disputes", tab, term, page],
    queryFn: () =>
      api.get<Page<Dispute>>("/admin/disputes", {
        status: tab === "open" || tab === "overdue" ? ["OPEN", "UNDER_REVIEW"] : tab === "resolved" ? ["RESOLVED"] : undefined,
        overdue: tab === "overdue" ? true : undefined,
        q: term || undefined,
        page,
        size: 20,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader title="Disputes" actions={<SearchBox value={q} onChange={setQ} placeholder="DSP-… or order number" />} />
      <SegTabs label="Dispute stage" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} />
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Flag className="size-6" />} title="No disputes here" hint="Problem reports from buyers, farmers and drivers land in this queue." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[860px]">
              <thead><tr><th>Dispute</th><th>Order</th><th>Type</th><th>Raised by</th><th>Against</th><th>Held</th><th>Clock</th></tr></thead>
              <tbody>
                {query.data?.items.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => navigate(`/disputes/${d.id}`)}>
                    <td><b>{d.disputeNumber}</b></td>
                    <td>{d.orderNumber}</td>
                    <td>{DISPUTE_TYPE_LABEL[d.type] ?? titleCase(d.type)}</td>
                    <td>{d.raisedBy?.fullName ?? "—"}<div className="text-xs text-sand-700">{d.raisedBy ? titleCase(d.raisedBy.role) : ""}</div></td>
                    <td>{d.against?.fullName ?? "—"}</td>
                    <td className="tabular">{formatMoney(d.totalHeldAmount)}</td>
                    <td><DueTag dispute={d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}
    </>
  );
}

type Resolution = "PARTIAL" | "FULL_REFUND" | "RELEASE_ALL";

interface OrderBundle {
  order: Order;
  timeline: TimelineEntry[];
  deliveryEvents: DeliveryEvent[];
}

export function DisputeDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["dispute", id], queryFn: () => api.get<{ dispute: Dispute; order: Order }>(`/admin/disputes/${id}`) });
  const orderId = detail.data?.dispute.orderId;
  const bundle = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.get<OrderBundle>(`/admin/orders/${orderId}`),
    enabled: !!orderId,
  });

  const assign = useMutation({
    mutationFn: () => api.post(`/admin/disputes/${id}/assign`),
    onSuccess: () => { toast.success("You are reviewing this dispute"); void qc.invalidateQueries({ queryKey: ["dispute", id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (detail.isLoading) return <TableSkeleton rows={8} cols={2} />;
  if (detail.isError || !detail.data) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  const { dispute, order } = detail.data;
  const delivery = order.delivery;
  const open = dispute.status !== "RESOLVED";

  const timeline = [
    ...(bundle.data?.timeline ?? []).map((t) => ({ at: t.at, text: `${titleCase(t.to)}${t.note ? ` — ${t.note}` : ""}`, strong: t.to === "DISPUTED" })),
    ...(bundle.data?.deliveryEvents ?? []).filter((e) => e.type !== "LOCATION").map((e) => ({ at: e.at, text: `${titleCase(e.type)}${e.note ? ` — ${e.note}` : ""}`, strong: e.type === "WEIGHT_VARIANCE" })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/disputes" className="inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft className="size-3.5" />Disputes /</Link>
        <h2>{dispute.disputeNumber} · {DISPUTE_TYPE_LABEL[dispute.type] ?? titleCase(dispute.type)}</h2>
        <DueTag dispute={dispute} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(290px,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3.5">
            <div className="rounded-[28px] bg-surface p-[18px]"><div className="text-[13px] text-sand-700">Ordered</div><div className="tabular text-2xl font-bold">{formatKg(dispute.orderedWeightKg)}</div></div>
            <div className="rounded-[28px] bg-sage-200 p-[18px]"><div className="text-[13px] text-sage-900">Weighed at pickup</div><div className="tabular text-2xl font-bold">{delivery?.pickedUpWeightKg ? formatKg(delivery.pickedUpWeightKg) : "—"}</div></div>
            <div className="rounded-[28px] bg-terra-200 p-[18px]"><div className="text-[13px] text-terra-900">Reported received</div><div className="tabular text-2xl font-bold">{dispute.claimedReceivedQuantityKg != null ? formatKg(dispute.claimedReceivedQuantityKg) : "—"}</div></div>
          </div>

          <section className="rounded-3xl bg-background px-5 py-4 text-sm">
            <b>{dispute.raisedBy?.fullName ?? "Someone"}</b> <span className="text-sand-700">({dispute.raisedBy ? titleCase(dispute.raisedBy.role) : ""}) reported:</span>
            <p className="mt-1 whitespace-pre-wrap">{dispute.description}</p>
            <p className="mt-2 text-xs text-sand-700">
              Order <Link to={`/orders/${dispute.orderId}`} className="font-semibold">{dispute.orderNumber}</Link> · {order.buyer.fullName} ← {order.farmer.fullName}{order.driver ? ` via ${order.driver.fullName}` : ""} · {formatMoney(dispute.totalHeldAmount)} held
            </p>
          </section>

          <section aria-label="Evidence">
            <h4 className="mb-3">Evidence</h4>
            {dispute.evidence.length === 0 ? <p className="text-sm text-sand-700">No evidence submitted yet.</p> : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                {dispute.evidence.map((e) => (
                  <figure key={e.id} className="flex flex-col gap-1.5">
                    <div className="grid h-[120px] place-items-center overflow-hidden rounded-[20px] bg-sand-300 p-2 text-sand-700">
                      {e.fileUrl ? <AuthImage src={e.fileUrl} alt={e.kind} fallback={<FileText className="size-7" />} /> : <p className="line-clamp-5 text-center text-xs text-foreground">{e.note}</p>}
                    </div>
                    <figcaption className="text-xs"><b>{titleCase(e.kind)}</b> · {e.submittedBy ? `${e.submittedBy.fullName} (${titleCase(e.submittedBy.role)})` : ""} · {formatDateTime(e.createdAt)}{e.fileUrl && e.note ? <span className="block text-sand-700">{e.note}</span> : null}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Timeline">
            <h4 className="mb-2">Timeline</h4>
            {bundle.isLoading ? <TableSkeleton rows={4} cols={1} /> : (
              <ol className="flex flex-col text-sm">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3.5 py-2"><span className="w-28 shrink-0 text-sand-700">{formatDateTime(t.at)}</span><span className={cn(t.strong && "font-bold")}>{t.text}</span></li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="self-start rounded-[36px] bg-surface p-6">
          {open ? (
            <ResolutionPanel dispute={dispute} order={order} assigned={!!dispute.assignedAdminId} onAssign={() => assign.mutate()} assigning={assign.isPending} />
          ) : (
            <ResolvedSummary dispute={dispute} />
          )}
        </aside>
      </div>
    </>
  );
}

function ResolvedSummary({ dispute }: { dispute: Dispute }) {
  const r = dispute.resolution!;
  return (
    <div className="flex flex-col gap-4">
      <h4>Resolution</h4>
      <Tag tone="solid-sage" className="self-start">{titleCase(r.type)}</Tag>
      <p className="text-sm">{r.notes}</p>
      <div className="flex flex-col gap-1.5 rounded-[22px] bg-background px-4 py-3.5 text-sm tabular">
        <Line label="Farmer" value={r.farmerAmount} /><Line label="Driver" value={r.driverAmount} /><Line label="Refund to buyer" value={r.buyerRefundAmount} /><Line label="AgriLink fee" value={r.platformRetainedAmount} />
      </div>
      <span className="text-xs text-sand-700">Decided {formatDateTime(r.resolvedAt)}</span>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: number | string; strong?: boolean }) {
  return <div className="flex justify-between"><span>{label}</span><b className={cn(strong && "text-terra-800")}>{formatMoney(value, { currency: false })}</b></div>;
}

function ResolutionPanel({
  dispute, order, assigned, onAssign, assigning,
}: { dispute: Dispute; order: Order; assigned: boolean; onAssign: () => void; assigning: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const total = toNumber(order.amounts.total);
  const subtotal = toNumber(order.amounts.subtotal);
  const fee = toNumber(order.amounts.deliveryFee);

  // Suggest refunding the value of the missing weight, paid out of the farmer's share.
  const ordered = toNumber(dispute.orderedWeightKg);
  const received = dispute.claimedReceivedQuantityKg != null ? toNumber(dispute.claimedReceivedQuantityKg) : null;
  const suggestedRefund = received !== null && ordered > 0 && received < ordered ? Math.round(subtotal * (1 - received / ordered) * 100) / 100 : 0;

  const [mode, setMode] = React.useState<Resolution>(suggestedRefund > 0 ? "PARTIAL" : "RELEASE_ALL");
  const [farmer, setFarmer] = React.useState(String(Math.max(0, subtotal - suggestedRefund)));
  const [driver, setDriver] = React.useState(String(order.driver ? fee : 0));
  const [refund, setRefund] = React.useState(String(suggestedRefund));
  const [notes, setNotes] = React.useState("");

  const amounts = mode === "FULL_REFUND"
    ? { farmer: 0, driver: 0, refund: total }
    : mode === "RELEASE_ALL"
      ? { farmer: subtotal, driver: order.driver ? fee : 0, refund: 0 }
      : { farmer: toNumber(farmer), driver: toNumber(driver), refund: toNumber(refund) };
  const platform = total - amounts.farmer - amounts.driver - amounts.refund;
  const invalid = platform < -0.004 || notes.trim().length < 3;

  const resolve = useMutation({
    mutationFn: () =>
      api.post(`/admin/disputes/${dispute.id}/resolve`, {
        resolution: mode,
        farmerAmount: mode === "PARTIAL" ? amounts.farmer : undefined,
        driverAmount: mode === "PARTIAL" ? amounts.driver : undefined,
        buyerRefundAmount: mode === "PARTIAL" ? amounts.refund : undefined,
        notes: notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Resolved. The money has moved and all parties are being notified.");
      void qc.invalidateQueries({ queryKey: ["dispute", dispute.id] });
      void qc.invalidateQueries({ queryKey: ["disputes"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/disputes");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <h4>Resolution</h4>
      {!assigned ? (
        <Button variant="secondary" onClick={onAssign} disabled={assigning}>{assigning ? "Taking…" : "Take this dispute"}</Button>
      ) : (
        <Tag tone="sage" className="self-start">Under review</Tag>
      )}
      <RadioGroup value={mode} onValueChange={(v) => setMode(v as Resolution)} aria-label="Outcome">
        <RadioItem value="PARTIAL" label="Partial release" description="Split the held money yourself; a refund goes back to the buyer." />
        <RadioItem value="FULL_REFUND" label="Full refund to buyer" description="Order is cancelled and everything held is returned." />
        <RadioItem value="RELEASE_ALL" label="Release all to farmer" description="The claim is not upheld; farmer and driver are paid as normal." />
      </RadioGroup>

      {mode === "PARTIAL" ? (
        <div className="grid gap-3">
          <Field label="Farmer receives (ETB)"><Input inputMode="decimal" value={farmer} onChange={(e) => setFarmer(e.target.value)} /></Field>
          <Field label="Driver receives (ETB)"><Input inputMode="decimal" value={driver} onChange={(e) => setDriver(e.target.value)} disabled={!order.driver} /></Field>
          <Field label="Refund to buyer (ETB)" hint={suggestedRefund > 0 ? `Suggested ${formatMoney(suggestedRefund)}: the value of the missing weight` : undefined}>
            <Input inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} />
          </Field>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 rounded-[22px] bg-background px-4 py-3.5 text-sm tabular">
        <Line label={`Farmer · ${order.farmer.displayName ?? order.farmer.fullName}`} value={amounts.farmer} />
        <Line label={`Driver · ${order.driver?.fullName ?? "none"}`} value={amounts.driver} />
        <Line label={`Refund · ${order.buyer.displayName ?? order.buyer.fullName}`} value={amounts.refund} />
        <div className={cn("flex justify-between border-t border-border pt-1.5", platform < -0.004 && "text-terra-800")}>
          <span>AgriLink fee kept</span><b>{formatMoney(platform, { currency: false })}</b>
        </div>
        <div className="flex justify-between text-xs text-sand-700"><span>Held in total</span><span>{formatMoney(total)}</span></div>
      </div>
      {platform < -0.004 ? <p role="alert" className="text-xs font-semibold text-terra-800">The amounts add up to more than the held total.</p> : null}

      <Field label="Decision notes" hint="Shown to the parties and kept in the audit trail.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </Field>
      <Button size="lg" disabled={invalid || resolve.isPending} onClick={() => resolve.mutate()}>{resolve.isPending ? "Settling…" : "Resolve and release"}</Button>
      <span className="text-xs text-sand-700">All parties get a notification with the decision.</span>
    </div>
  );
}
