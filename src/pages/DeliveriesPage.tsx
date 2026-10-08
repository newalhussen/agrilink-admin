import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Truck, UserRoundCheck, UserRoundX } from "lucide-react";
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/dialogs";
import { EmptyState, ErrorState, PageHeader, Pager, SearchBox, SegTabs, StatusTag, TableSkeleton, useDebounced } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { api, errorMessage } from "@/lib/api";
import { DELIVERY_STATUS } from "@/lib/constants";
import { formatDate, formatKg, formatMoney, toNumber } from "@/lib/format";
import type { Delivery, DriverOption, Page } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "OPEN", label: "Needs driver", statuses: ["OPEN"] },
  { key: "ACTIVE", label: "Active", statuses: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
  { key: "DELIVERED", label: "Delivered", statuses: ["DELIVERED"] },
  { key: "CANCELLED", label: "Cancelled", statuses: ["CANCELLED"] },
  { key: "ALL", label: "All", statuses: [] },
];

export function DeliveriesPage() {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const fromUrl = TABS.find((t) => t.statuses.length === 1 && t.statuses[0] === params.get("status"))?.key;
  const [tab, setTab] = React.useState(fromUrl ?? "ACTIVE");
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [page, setPage] = React.useState(0);
  const [assigning, setAssigning] = React.useState<Delivery | null>(null);
  const [unassign, setUnassign] = React.useState<Delivery | null>(null);
  const [resetting, setResetting] = React.useState<Delivery | null>(null);
  const term = useDebounced(q);
  React.useEffect(() => setPage(0), [tab, term]);

  const statuses = TABS.find((t) => t.key === tab)?.statuses ?? [];
  const query = useQuery({
    queryKey: ["deliveries", tab, term, page],
    queryFn: () => api.get<Page<Delivery>>("/admin/deliveries", { status: statuses, q: term || undefined, page, size: 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });

  const done = (message: string) => {
    toast.success(message);
    void qc.invalidateQueries({ queryKey: ["deliveries"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const unassignM = useMutation({
    mutationFn: (d: Delivery) => api.post(`/admin/deliveries/${d.id}/unassign`),
    onSuccess: () => { done("Job is back on the board"); setUnassign(null); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resetM = useMutation({
    mutationFn: (d: Delivery) => api.post(`/admin/deliveries/${d.id}/reset-codes`),
    onSuccess: () => { done("Handover codes unlocked"); setResetting(null); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Deliveries" actions={<SearchBox value={q} onChange={setQ} placeholder="Order number AL-…" />} />
      <SegTabs label="Delivery stage" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} />
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Truck className="size-6" />} title="No deliveries here" hint="Delivery jobs are created automatically when an order is paid." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[980px]">
              <thead><tr><th>Order</th><th>Route</th><th>Load</th><th>Driver</th><th>Status</th><th>Pickup</th><th className="text-right">Fee ETB</th><th /></tr></thead>
              <tbody>
                {query.data?.items.map((d) => {
                  const locked = d.pickupFailedAttempts >= 5 || d.deliveryFailedAttempts >= 5;
                  const canAssign = d.status === "OPEN" || d.status === "ASSIGNED";
                  return (
                    <tr key={d.id}>
                      <td><Link to={`/orders/${d.orderId}`} className="font-bold">{d.orderNumber}</Link></td>
                      <td>{d.pickup?.address?.town ?? "—"} → {d.dropoff?.address?.town ?? "—"}{d.distanceKm ? <div className="text-xs text-sand-700">{Number(d.distanceKm).toFixed(0)} km</div> : null}</td>
                      <td>{d.load[0]?.name ?? "—"}{d.load.length > 1 ? ` +${d.load.length - 1}` : ""}<div className="text-xs text-sand-700">{formatKg(d.totalWeightKg)}</div></td>
                      <td>{d.driver ? <div><b>{d.driver.fullName}</b><div className="text-xs text-sand-700">{d.driver.phone}</div></div> : <span className="text-sand-700">Unassigned</span>}</td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <StatusTag status={d.status} map={DELIVERY_STATUS} />
                          {locked ? <Tag tone="solid-dark"><KeyRound className="size-3" />Locked</Tag> : null}
                        </div>
                      </td>
                      <td>{formatDate(d.scheduledPickupDate)}</td>
                      <td className="tabular text-right">{formatMoney(d.driverFee, { currency: false })}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {canAssign ? <Button size="sm" variant={d.status === "OPEN" ? "primary" : "secondary"} onClick={() => setAssigning(d)}><UserRoundCheck />{d.driver ? "Reassign" : "Assign"}</Button> : null}
                          {d.status === "ASSIGNED" ? <Button size="sm" variant="ghost" onClick={() => setUnassign(d)}><UserRoundX />Unassign</Button> : null}
                          {locked ? <Button size="sm" variant="secondary" onClick={() => setResetting(d)}><KeyRound />Unlock</Button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}

      <AssignDialog delivery={assigning} onClose={() => setAssigning(null)} onDone={() => { done("Driver assigned. They have been notified."); setAssigning(null); }} />
      <ConfirmDialog
        open={!!unassign} onOpenChange={(o) => !o && setUnassign(null)}
        title="Unassign driver?" description={unassign ? `${unassign.orderNumber} goes back to the job board for another driver to take.` : undefined}
        confirmLabel="Unassign" pending={unassignM.isPending} onConfirm={() => unassign && unassignM.mutate(unassign)}
      />
      <ConfirmDialog
        open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}
        title="Unlock handover codes?" description="Too many wrong codes locked this handover. Unlock it only after confirming by phone that the driver is with the right person."
        confirmLabel="Unlock" pending={resetM.isPending} onConfirm={() => resetting && resetM.mutate(resetting)}
      />
    </>
  );
}

function AssignDialog({ delivery, onClose, onDone }: { delivery: Delivery | null; onClose: () => void; onDone: () => void }) {
  const [driverId, setDriverId] = React.useState("");
  const drivers = useQuery({ queryKey: ["drivers", "available"], queryFn: () => api.get<DriverOption[]>("/admin/drivers/available"), enabled: !!delivery });
  React.useEffect(() => setDriverId(""), [delivery]);
  const assign = useMutation({
    mutationFn: () => api.post(`/admin/deliveries/${delivery!.id}/assign`, { driverId }),
    onSuccess: onDone,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const weight = toNumber(delivery?.totalWeightKg);
  const options = (drivers.data ?? []).map((d) => ({ ...d, fits: toNumber(d.capacityKg) >= weight }));
  return (
    <Dialog open={!!delivery} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>Assign a driver to {delivery?.orderNumber}</DialogTitle>
          <DialogDescription>
            Load {formatKg(weight)} · {delivery?.pickup?.address?.town} → {delivery?.dropoff?.address?.town}. Only verified, online drivers are listed.
          </DialogDescription>
        </DialogHeader>
        {drivers.isLoading ? <TableSkeleton rows={3} cols={1} /> : options.length === 0 ? (
          <p className="rounded-3xl bg-background px-4 py-6 text-center text-sm text-sand-700">No driver is online with a complete vehicle profile right now.</p>
        ) : (
          <RadioGroup value={driverId} onValueChange={setDriverId} aria-label="Drivers">
            {options.map((d) => (
              <div key={d.id} className="rounded-3xl bg-background px-4 py-3">
                <RadioItem
                  value={d.id}
                  disabled={!d.fits}
                  label={<>{d.fullName} <span className="font-normal text-sand-700">· {d.phone}</span></>}
                  description={
                    <>
                      {titleCase(d.vehicleType)} {d.vehiclePlate} · {formatKg(d.capacityKg)} capacity · {d.activeJobs} active job{d.activeJobs === 1 ? "" : "s"}
                      {!d.fits ? <span className="ml-2 font-semibold text-terra-800">too small for this load</span> : null}
                    </>
                  }
                />
              </div>
            ))}
          </RadioGroup>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!driverId || assign.isPending} onClick={() => assign.mutate()}>{assign.isPending ? "Assigning…" : "Assign driver"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
