import { useQuery } from "@tanstack/react-query";
import { BanknoteX, ClockAlert, Flag, HandCoins, Lock, Truck, UserCheck, UserRoundX } from "lucide-react";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, PageHeader, SegTabs, StatusTag, TableSkeleton, plural } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { DELIVERY_STATUS, ORDER_STATUS, ORDER_STATUS_FLOW } from "@/lib/constants";
import { formatKg, formatMoney, formatMoneyCompact, formatNumber } from "@/lib/format";
import type { AttentionItem, Dashboard, Delivery, OrderStatus, Page } from "@/lib/types";
import { cn } from "@/lib/utils";

type Period = "TODAY" | "WEEK" | "MONTH";

const PERIOD_LABEL: Record<Period, string> = { TODAY: "Today", WEEK: "7 days", MONTH: "30 days" };

function attentionLink(item: AttentionItem): { to: string; label: string } {
  switch (item.kind) {
    case "DISPUTE_OVERDUE": return { to: "/disputes?overdue=true", label: "Open" };
    case "VERIFICATION_QUEUE": return { to: "/verification", label: "Review" };
    case "PAYOUT_FAILED": return { to: "/payments?tab=payouts&status=FAILED", label: "Fix" };
    case "JOBS_UNASSIGNED": return { to: "/deliveries?status=OPEN", label: "Assign" };
    default: return { to: "/", label: "Open" };
  }
}

function attentionIcon(kind: string) {
  const cls = "mt-0.5 size-[18px]";
  switch (kind) {
    case "DISPUTE_OVERDUE": return <Flag className={cn(cls, "text-terra-800")} />;
    case "VERIFICATION_QUEUE": return <UserCheck className={cn(cls, "text-sage-700")} />;
    case "PAYOUT_FAILED": return <BanknoteX className={cn(cls, "text-sand-700")} />;
    case "JOBS_UNASSIGNED": return <ClockAlert className={cn(cls, "text-terra-800")} />;
    default: return <UserRoundX className={cls} />;
  }
}

export function OverviewPage() {
  const [period, setPeriod] = React.useState<Period>("TODAY");
  const navigate = useNavigate();
  const dashboard = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => api.get<Dashboard>("/admin/dashboard", { period }),
    refetchInterval: 60_000,
  });
  const live = useQuery({
    queryKey: ["deliveries", "live"],
    queryFn: () =>
      api.get<Page<Delivery>>("/admin/deliveries", { status: ["OPEN", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"], size: 8 }),
    refetchInterval: 30_000,
  });

  const d = dashboard.data;
  return (
    <>
      <PageHeader
        title={period === "TODAY" ? "Today on the corridor" : `Last ${PERIOD_LABEL[period]} on the corridor`}
        actions={
          <SegTabs
            label="Period"
            value={period}
            onChange={setPeriod}
            options={(Object.keys(PERIOD_LABEL) as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
          />
        }
      />

      {dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] rounded-[32px] bg-surface p-1.5">
          <KpiCell
            icon={<Lock />} label="Held for buyers" loading={!d}
            value={d ? formatMoneyCompact(d.heldInEscrow.amount) : ""}
            hint={d ? `${plural(d.ordersInPeriod, "order")} ${period === "TODAY" ? "today" : "in period"}` : ""}
          />
          <KpiCell
            icon={<HandCoins />} label={period === "TODAY" ? "Released today" : "Released"} loading={!d} divider
            value={d ? formatMoneyCompact(d.releasedInPeriod.amount) : ""}
            hint={d ? `AgriLink fee ${formatMoney(d.platformFeeInPeriod.amount)}` : ""} hintTone="sage"
          />
          <KpiCell
            icon={<Truck />} label="On the road" loading={!d} divider
            value={d ? formatNumber(d.deliveriesOnTheRoad) : ""}
            hint={d ? (d.openDeliveryJobs === 1 ? "1 job needs a driver" : `${formatNumber(d.openDeliveryJobs)} jobs need a driver`) : ""} hintTone={d && d.openDeliveryJobs > 0 ? "accent" : "muted"}
          />
          <KpiCell
            icon={<Flag />} label="Open disputes" loading={!d} divider
            value={d ? formatNumber(d.openDisputes) : ""}
            hint={d ? (d.overdueDisputes > 0 ? `${d.overdueDisputes} past 24 h target` : "All within target") : ""}
            hintTone={d && d.overdueDisputes > 0 ? "accent" : "muted"}
          />
        </div>
      )}

      <div className="grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-labelledby="attention" className="flex flex-col gap-1.5">
          <h4 id="attention" className="mb-2">Needs attention</h4>
          {!d ? (
            <TableSkeleton rows={4} cols={1} />
          ) : d.needsAttention.length === 0 ? (
            <div className="rounded-3xl bg-sage-100 px-4 py-5 text-sm text-sage-800"><b>All clear.</b> Nothing is waiting on the operations team.</div>
          ) : (
            d.needsAttention.map((item, i) => {
              const link = attentionLink(item);
              const urgent = item.kind === "DISPUTE_OVERDUE" || item.kind === "JOBS_UNASSIGNED";
              return (
                <div key={i} className={cn("flex items-start gap-3 rounded-3xl px-4 py-3.5", urgent && "bg-terra-100")}>
                  {attentionIcon(item.kind)}
                  <div className="flex-1 text-sm">
                    <b>{item.title}</b>
                    <br />
                    <span className="text-sand-700">{item.detail}</span>
                  </div>
                  <Link to={link.to} className="text-[13px] font-bold">{link.label}</Link>
                </div>
              );
            })
          )}

          <h4 className="mb-2 mt-6">Order pipeline</h4>
          {!d ? <TableSkeleton rows={3} cols={1} /> : <Pipeline counts={d.ordersByStatus} onPick={(s) => navigate(`/orders?status=${s}`)} />}
        </section>

        <section aria-labelledby="live" className="flex min-w-0 flex-col gap-1.5">
          <div className="mb-2 flex items-baseline gap-3">
            <h4 id="live" className="flex-1">Live deliveries</h4>
            <Link to="/deliveries" className="text-[13px] font-bold">All deliveries</Link>
          </div>
          {live.isLoading ? (
            <TableSkeleton />
          ) : live.isError ? (
            <ErrorState error={live.error} onRetry={() => live.refetch()} />
          ) : live.data && live.data.items.length === 0 ? (
            <EmptyState icon={<Truck className="size-6" />} title="No deliveries right now" hint="Jobs appear here as soon as an order is paid." />
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table min-w-[620px]">
                <thead>
                  <tr><th>Order</th><th>Route</th><th>Load</th><th>Driver</th><th>Status</th><th className="text-right">Fee</th></tr>
                </thead>
                <tbody>
                  {live.data?.items.map((dl) => (
                    <tr key={dl.id} className="clickable" onClick={() => navigate(`/orders/${dl.orderId}`)}>
                      <td><b>{dl.orderNumber}</b></td>
                      <td>{dl.pickup?.address?.town ?? "—"} → {dl.dropoff?.address?.town ?? "—"}</td>
                      <td>{dl.load[0]?.name ?? "—"}{dl.load.length > 1 ? ` +${dl.load.length - 1}` : ""} · {formatKg(dl.totalWeightKg)}</td>
                      <td>{dl.driver?.fullName ?? <span className="text-sand-700">Unassigned</span>}</td>
                      <td><StatusTag status={dl.status} map={DELIVERY_STATUS} /></td>
                      <td className="tabular text-right">{formatMoney(dl.driverFee, { currency: false })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-2">
            <Button variant="ghost" size="sm" asChild><Link to="/deliveries?status=OPEN">Jobs waiting for a driver</Link></Button>
          </div>
        </section>
      </div>
    </>
  );
}

function KpiCell({
  icon, label, value, hint, hintTone = "muted", divider, loading,
}: { icon: React.ReactNode; label: string; value: string; hint: string; hintTone?: "muted" | "accent" | "sage"; divider?: boolean; loading: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 px-[22px] py-[18px]", divider && "border-l border-border")}>
      <span className="flex items-center gap-1.5 text-[13px] text-sand-700 [&_svg]:size-3.5">{icon}{label}</span>
      <span className="tabular text-[30px] font-bold leading-tight">{loading ? <span className="ds-skeleton inline-block h-8 w-28 align-middle" /> : value}</span>
      <span className={cn("text-[13px]", hintTone === "muted" && "text-sand-700", hintTone === "accent" && "font-semibold text-terra-700", hintTone === "sage" && "font-semibold text-sage-700")}>{hint || " "}</span>
    </div>
  );
}

function Pipeline({ counts, onPick }: { counts: Record<string, number>; onPick: (status: OrderStatus) => void }) {
  const statuses: OrderStatus[] = [...ORDER_STATUS_FLOW, "DISPUTED"];
  const max = Math.max(1, ...statuses.map((s) => counts[s] ?? 0));
  return (
    <ul className="flex flex-col gap-1.5">
      {statuses.map((s) => {
        const n = counts[s] ?? 0;
        return (
          <li key={s}>
            <button type="button" onClick={() => onPick(s)} className="group flex w-full items-center gap-3 rounded-full px-3 py-1.5 text-left text-sm hover:bg-primary/10">
              <span className="w-32 shrink-0">{ORDER_STATUS[s].label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-sand-300">
                <span className={cn("block h-full rounded-full", s === "DISPUTED" ? "bg-terra-800" : s === "COMPLETED" ? "bg-sage-700" : "bg-primary")} style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="tabular w-8 text-right font-bold">{n}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
