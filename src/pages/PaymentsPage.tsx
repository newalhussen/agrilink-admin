import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BanknoteX, HandCoins, Lock, Percent } from "lucide-react";
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, PageHeader, Pager, SegTabs, StatCard, StatusTag, TableSkeleton } from "@/components/common/parts";
import { Tag } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { api } from "@/lib/api";
import { PAYMENT_STATUS, type Tone } from "@/lib/constants";
import { formatDateTime, formatMoney, formatMoneyCompact } from "@/lib/format";
import type { AdminPayment, AdminPayout, Dashboard, Page } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const PAYMENT_FILTERS = ["ALL", "PENDING", "HELD", "RELEASED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "CANCELLED", "EXPIRED"];
const PAYOUT_FILTERS = ["ALL", "PAID", "PROCESSING", "PENDING", "FAILED"];
const PAYOUT_TONE: Record<string, Tone> = { PAID: "solid-sage", PROCESSING: "accent", PENDING: "neutral", FAILED: "solid-dark" };

export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "payouts" ? "payouts" : "payments";
  const [status, setStatus] = React.useState(params.get("status") ?? "ALL");
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [tab, status]);

  const stats = useQuery({ queryKey: ["dashboard", "MONTH"], queryFn: () => api.get<Dashboard>("/admin/dashboard", { period: "MONTH" }) });
  const d = stats.data;

  return (
    <>
      <PageHeader
        title="Payments"
        actions={
          <SegTabs
            label="Section"
            value={tab}
            onChange={(v) => { setParams(v === "payouts" ? { tab: "payouts" } : {}, { replace: true }); setStatus("ALL"); }}
            options={[{ value: "payments", label: "Buyer payments" }, { value: "payouts", label: "Withdrawals" }]}
          />
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        <StatCard icon={<Lock className="size-3.5" />} label="Held in escrow" value={d ? formatMoneyCompact(d.heldInEscrow.amount) : "…"} hint="Waiting for delivery confirmation" />
        <StatCard icon={<HandCoins className="size-3.5" />} label="Released (30 days)" value={d ? formatMoneyCompact(d.releasedInPeriod.amount) : "…"} hint="To farmers and drivers" tone="sage" hintTone="sage" />
        <StatCard icon={<Percent className="size-3.5" />} label="AgriLink fee (30 days)" value={d ? formatMoneyCompact(d.platformFeeInPeriod.amount) : "…"} hint="Retained platform revenue" />
        <StatCard
          icon={<BanknoteX className="size-3.5" />} label="Failed withdrawals" value={d ? String(d.failedPayouts) : "…"}
          hint={d && d.failedPayouts > 0 ? "Contact the account holders" : "None"} tone={d && d.failedPayouts > 0 ? "accent" : "surface"} hintTone={d && d.failedPayouts > 0 ? "accent" : "muted"}
          onClick={d && d.failedPayouts > 0 ? () => { setParams({ tab: "payouts", status: "FAILED" }, { replace: true }); setStatus("FAILED"); } : undefined}
        />
      </div>
      <SimpleSelect
        className="w-52"
        value={status}
        onValueChange={setStatus}
        options={(tab === "payments" ? PAYMENT_FILTERS : PAYOUT_FILTERS).map((s) => ({ value: s, label: s === "ALL" ? "All statuses" : titleCase(s) }))}
      />
      {tab === "payments" ? <PaymentsTable status={status} page={page} onPage={setPage} /> : <PayoutsTable status={status} page={page} onPage={setPage} />}
    </>
  );
}

function PaymentsTable({ status, page, onPage }: { status: string; page: number; onPage: (p: number) => void }) {
  const query = useQuery({
    queryKey: ["payments", status, page],
    queryFn: () => api.get<Page<AdminPayment>>("/admin/payments", { status: status === "ALL" ? undefined : status, page, size: 20 }),
    placeholderData: keepPreviousData,
  });
  if (query.isLoading) return <TableSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || query.data.items.length === 0) return <EmptyState title="No payments" hint="Nothing matches this status yet." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="ds-table min-w-[980px]">
          <thead><tr><th>Reference</th><th>Order</th><th>Method</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Farmer</th><th className="text-right">Driver</th><th className="text-right">Refunded</th><th className="text-right">Fee kept</th><th>Date</th></tr></thead>
          <tbody>
            {query.data.items.map((p) => (
              <tr key={p.payment.id}>
                <td className="font-mono text-xs">{p.payment.transactionReference}{p.payment.failureReason ? <div className="font-sans text-terra-800">{p.payment.failureReason}</div> : null}</td>
                <td><Link to={`/orders/${p.payment.orderId}`} className="font-bold">Open order</Link></td>
                <td>{titleCase(p.payment.method)}<div className="text-xs text-sand-700">{p.payment.provider}</div></td>
                <td><StatusTag status={p.payment.status} map={PAYMENT_STATUS} /></td>
                <td className="tabular text-right font-bold">{formatMoney(p.payment.amount, { currency: false })}</td>
                <td className="tabular text-right">{formatMoney(p.releasedFarmerAmount, { currency: false })}</td>
                <td className="tabular text-right">{formatMoney(p.releasedDriverAmount, { currency: false })}</td>
                <td className="tabular text-right">{formatMoney(p.payment.refundedAmount, { currency: false })}</td>
                <td className="tabular text-right">{formatMoney(p.platformFeeRetained, { currency: false })}</td>
                <td>{formatDateTime(p.payment.initiatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={onPage} />
    </>
  );
}

function PayoutsTable({ status, page, onPage }: { status: string; page: number; onPage: (p: number) => void }) {
  const query = useQuery({
    queryKey: ["payouts", status, page],
    queryFn: () => api.get<Page<AdminPayout>>("/admin/payouts", { status: status === "ALL" ? undefined : status, page, size: 20 }),
    placeholderData: keepPreviousData,
  });
  if (query.isLoading) return <TableSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || query.data.items.length === 0) return <EmptyState title="No withdrawals" hint="Farmers and drivers appear here when they withdraw from their wallet." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="ds-table min-w-[820px]">
          <thead><tr><th>Account holder</th><th>Destination</th><th>Status</th><th className="text-right">Amount</th><th>Requested</th><th>Processed</th></tr></thead>
          <tbody>
            {query.data.items.map((p) => (
              <tr key={p.payout.id}>
                <td><Link to={`/users/${p.userId}`} className="font-bold">{p.destinationName ?? "View person"}</Link></td>
                <td>{titleCase(p.payout.method)} · {p.payout.destinationAccount}<div className="text-xs text-sand-700">{p.provider}</div></td>
                <td>
                  <Tag tone={PAYOUT_TONE[p.payout.status]}>{titleCase(p.payout.status)}</Tag>
                  {p.payout.failureReason ? <div className="mt-1 text-xs text-terra-800">{p.payout.failureReason}</div> : null}
                </td>
                <td className="tabular text-right font-bold">{formatMoney(p.payout.amount, { currency: false })}</td>
                <td>{formatDateTime(p.payout.createdAt)}</td>
                <td>{formatDateTime(p.payout.processedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={onPage} />
    </>
  );
}
