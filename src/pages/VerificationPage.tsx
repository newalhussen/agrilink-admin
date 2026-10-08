import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, EmptyState, ErrorState, PageHeader, Pager, SegTabs, StatusTag, TableSkeleton } from "@/components/common/parts";
import { SimpleSelect } from "@/components/ui/select";
import { UserDetailPanel } from "@/components/users/UserDetailPanel";
import { api } from "@/lib/api";
import { VERIFICATION_STATUS } from "@/lib/constants";
import type { Dashboard, Page, Role, User, VerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type QueueRole = Exclude<Role, "ADMIN">;

const ROLE_TABS: { value: QueueRole; label: string }[] = [
  { value: "FARMER", label: "Farmers" },
  { value: "BUYER", label: "Buyers" },
  { value: "DRIVER", label: "Drivers" },
];

const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: "PENDING", label: "Ready for review" },
  { value: "INFO_NEEDED", label: "Info needed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "VERIFIED", label: "Verified" },
  { value: "UNVERIFIED", label: "Not submitted" },
];

/** The design's Verification screen: queue on the left, the selected person's file and decision on the right. */
export function VerificationPage() {
  const [params, setParams] = useSearchParams();
  const role = (params.get("role") as QueueRole) || "FARMER";
  const status = (params.get("status") as VerificationStatus) || "PENDING";
  const selected = params.get("user");
  const [page, setPage] = React.useState(0);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === null ? next.delete(k) : next.set(k, v));
    setParams(next, { replace: true });
    setPage(0);
  };

  const dashboard = useQuery({ queryKey: ["dashboard", "TODAY"], queryFn: () => api.get<Dashboard>("/admin/dashboard", { period: "TODAY" }) });
  const queue = useQuery({
    queryKey: ["verifications", role, status, page],
    queryFn: () => api.get<Page<User>>("/admin/verifications", { role, status, page, size: 15 }),
    placeholderData: keepPreviousData,
  });

  const items = queue.data?.items ?? [];
  const activeId = selected && items.some((u) => u.id === selected) ? selected : items[0]?.id;

  return (
    <>
      <PageHeader
        title="Verification"
        actions={
          <>
            <SimpleSelect className="w-48" value={status} onValueChange={(v) => set({ status: v, user: null })} options={STATUS_OPTIONS} />
            <SegTabs
              label="Role"
              value={role}
              onChange={(v) => set({ role: v, user: null })}
              options={ROLE_TABS.map((t) => ({ ...t, count: status === "PENDING" ? dashboard.data?.pendingVerifications[t.value] : undefined }))}
            />
          </>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-1">
          {queue.isLoading ? (
            <TableSkeleton rows={5} cols={1} />
          ) : queue.isError ? (
            <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState title="Nobody here" hint="No one matches this status and role right now." />
          ) : (
            items.map((u) => {
              const active = u.id === activeId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => set({ user: u.id })}
                  className={cn("flex items-center gap-3 rounded-3xl px-3.5 py-3 text-left transition-colors", active ? "bg-terra-200" : "hover:bg-foreground/[0.05]")}
                  aria-current={active}
                >
                  <Avatar name={u.fullName} tone={active ? "accent" : "neutral"} />
                  <div className="min-w-0 flex-1 text-sm">
                    <b className="block truncate">{u.fullName}</b>
                    <span className="text-[13px] text-sand-700">{u.phone}</span>
                  </div>
                  <StatusTag status={u.verificationStatus} map={VERIFICATION_STATUS} />
                </button>
              );
            })
          )}
          {queue.data ? <Pager page={queue.data.page} size={queue.data.size} totalItems={queue.data.totalItems} totalPages={queue.data.totalPages} onPage={setPage} /> : null}
        </div>
        <div>{activeId ? <UserDetailPanel key={activeId} userId={activeId} /> : null}</div>
      </div>
    </>
  );
}
