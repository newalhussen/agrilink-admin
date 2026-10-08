import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import * as React from "react";
import { EmptyState, ErrorState, KeyValue, PageHeader, Pager, SegTabs, TableSkeleton } from "@/components/common/parts";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditLog, Page, Settings } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const LABELS: Record<string, string> = {
  platformFeePercent: "AgriLink fee (% of goods)",
  deliveryBaseFee: "Delivery base fee (ETB)",
  deliveryPerKm: "Per km (ETB)",
  deliveryPerKg: "Per kg (ETB)",
  deliveryMinFee: "Minimum delivery fee (ETB)",
  roadDistanceFactor: "Road distance factor",
  defaultDistanceKm: "Distance when GPS is missing (km)",
  farmerResponseWindow: "Farmer must answer within",
  paymentWindow: "Buyer must pay within",
  checkWindow: "Buyer check window after delivery",
  maxActiveDeliveriesPerDriver: "Active jobs per driver",
  maxCodeAttempts: "Wrong handover codes before lock",
  length: "Code length",
  ttl: "Code valid for",
  maxAttempts: "Attempts per code",
  resendCooldown: "Resend cooldown",
  resolutionTarget: "Dispute resolution target",
  requireVerifiedFarmers: "Only verified farmers appear in the market",
  provider: "Payment provider",
};

function humanise(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^PT/.test(value)) {
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
    if (m) return [m[1] && `${m[1]} h`, m[2] && `${m[2]} min`, m[3] && `${m[3]} s`].filter(Boolean).join(" ") || value;
  }
  return String(value);
}

export function SettingsPage() {
  const [tab, setTab] = React.useState<"rules" | "audit">("rules");
  return (
    <>
      <PageHeader
        title="Settings"
        actions={<SegTabs label="Section" value={tab} onChange={setTab} options={[{ value: "rules", label: "Business rules" }, { value: "audit", label: "Audit trail" }]} />}
      />
      {tab === "rules" ? <Rules /> : <Audit />}
    </>
  );
}

function Rules() {
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/admin/settings") });
  if (query.isLoading) return <TableSkeleton rows={6} cols={2} />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const s = query.data;
  const groups: [string, Record<string, string | number | boolean>][] = [
    ["Fees and delivery pricing", s.pricing],
    ["Order timers and limits", s.orders],
    ["Dispute handling", s.disputes],
    ["Sign-in codes (OTP)", s.otp],
    ["Marketplace", s.marketplace],
    ["Payments", s.payment],
  ];
  return (
    <>
      <p className="flex max-w-3xl items-start gap-2 rounded-3xl bg-sage-100 px-4 py-3 text-sm text-sage-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>{s.note} These values are the live configuration of the platform.</span>
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(([title, values]) => (
          <section key={title} className="rounded-[32px] bg-surface p-6">
            <h4 className="mb-4">{title}</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(values).map(([k, v]) => (
                <KeyValue key={k} label={LABELS[k] ?? titleCase(k.replace(/([A-Z])/g, "_$1"))}>{humanise(v)}</KeyValue>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Audit() {
  const [page, setPage] = React.useState(0);
  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api.get<Page<AuditLog>>("/admin/audit-logs", { page, size: 25 }),
    placeholderData: keepPreviousData,
  });
  if (query.isLoading) return <TableSkeleton />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data || query.data.items.length === 0) return <EmptyState title="Nothing recorded yet" hint="Verification decisions, dispute rulings, suspensions and cancellations are logged here." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="ds-table min-w-[760px]">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>On</th><th>Details</th></tr></thead>
          <tbody>
            {query.data.items.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{formatDateTime(l.at)}</td>
                <td>{l.adminName}</td>
                <td><b>{titleCase(l.action)}</b></td>
                <td>{titleCase(l.entityType)}</td>
                <td className="max-w-md truncate" title={l.details ?? ""}>{l.details ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} />
    </>
  );
}
