import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, PageHeader, SegTabs, StatCard, TableSkeleton } from "@/components/common/parts";
import { api } from "@/lib/api";
import { formatMoney, formatMoneyCompact, formatNumber, toNumber } from "@/lib/format";
import type { Report, TopEntry } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const RANGES = [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }];

function iso(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(d);
}

export function ReportsPage() {
  const [range, setRange] = React.useState("30");
  const { from, to } = React.useMemo(() => {
    const end = new Date();
    return { from: iso(new Date(end.getTime() - (Number(range) - 1) * 86_400_000)), to: iso(end) };
  }, [range]);
  const query = useQuery({ queryKey: ["report", from, to], queryFn: () => api.get<Report>("/admin/reports/summary", { from, to }) });
  const r = query.data;
  const daily = (r?.daily ?? []).map((d) => ({ ...d, value: toNumber(d.orderValue), label: d.date.slice(5) }));

  return (
    <>
      <PageHeader title="Reports" actions={<SegTabs label="Range" value={range} onChange={setRange} options={RANGES} />} />
      {query.isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : query.isError || !r ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            <StatCard label="Orders placed" value={formatNumber(r.totalOrders)} hint={`${formatNumber(r.completedOrders)} completed`} hintTone="sage" />
            <StatCard label="Order value" value={formatMoneyCompact(r.totalOrderValue)} hint="Goods + delivery + fee" />
            <StatCard label="Average order" value={formatMoneyCompact(r.averageOrderValue)} />
            <StatCard
              label="Completion rate"
              value={r.totalOrders ? `${Math.round((r.completedOrders / r.totalOrders) * 100)}%` : "—"}
              hint="Of orders placed in the range" tone="sage"
            />
          </div>

          <div className="grid gap-8 xl:grid-cols-2">
            <section className="rounded-[32px] bg-surface p-6" aria-label="Orders per day">
              <h4 className="mb-4">Orders per day</h4>
              <div className="h-64" role="img" aria-label="Bar chart of orders per day">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ left: -18, right: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-divider)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 16, border: "none", background: "var(--color-neutral-100)" }} />
                    <Bar dataKey="orders" name="Orders" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="completedOrders" name="Completed" fill="var(--color-accent-2-600)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded-[32px] bg-surface p-6" aria-label="Order value per day">
              <h4 className="mb-4">Order value per day (ETB)</h4>
              <div className="h-64" role="img" aria-label="Line chart of order value per day">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-divider)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))} width={44} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ borderRadius: 16, border: "none", background: "var(--color-neutral-100)" }} />
                    <Line type="monotone" dataKey="value" name="Order value" stroke="var(--color-accent)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid gap-8 xl:grid-cols-3">
            <Leaderboard title="Top products" rows={r.topProducts} unit={["order", "orders"]} />
            <Leaderboard title="Top farmers" rows={r.topFarmers} unit={["trade", "trades"]} link={(e) => `/users/${e.id}`} />
            <Leaderboard title="Busiest drivers" rows={r.topDrivers} unit={["delivery", "deliveries"]} link={(e) => `/users/${e.id}`} />
          </div>

          <section aria-label="Orders by status">
            <h4 className="mb-3">Orders by status</h4>
            {Object.keys(r.ordersByStatus).length === 0 ? (
              <EmptyState title="No orders in this range" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(r.ordersByStatus).map(([s, n]) => (
                  <span key={s} className="rounded-full bg-surface px-4 py-2 text-sm">{titleCase(s)} <b className="tabular ml-1">{n}</b></span>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Leaderboard({ title, rows, unit, link }: { title: string; rows: TopEntry[]; unit: [string, string]; link?: (e: TopEntry) => string }) {
  return (
    <section className="rounded-[32px] bg-surface p-6">
      <h4 className="mb-3">{title}</h4>
      {rows.length === 0 ? <p className="text-sm text-sand-700">Nothing completed in this range yet.</p> : (
        <ol className="flex flex-col gap-1">
          {rows.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 rounded-full px-2 py-1.5 text-sm">
              <span className="grid size-7 place-items-center rounded-full bg-sand-300 text-xs font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{link ? <Link to={link(e)} className="font-semibold">{e.name}</Link> : <b>{e.name}</b>}<span className="block text-xs text-sand-700">{e.count} {e.count === 1 ? unit[0] : unit[1]}</span></span>
              <b className="tabular">{formatMoneyCompact(e.value)}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
