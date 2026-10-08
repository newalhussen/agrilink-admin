import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileCheck, IdCard, Image as ImageIcon, ShieldAlert, ShieldCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { ConfirmDialog, ReasonDialog } from "@/components/common/dialogs";
import { AuthImage, Avatar, ErrorState, KeyValue, StatusTag, TableSkeleton } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { api, errorMessage } from "@/lib/api";
import { DOCUMENT_LABEL, ROLE_LABEL, VERIFICATION_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime, formatKg, formatMoney, formatPhone, maskPhone } from "@/lib/format";
import type { BuyerProfile, DriverProfile, FarmerProfile, UserDetail } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const LANGUAGE: Record<string, string> = { en: "English", am: "Amharic", om: "Afaan Oromoo" };

function docIcon(type: string) {
  if (type.includes("ID")) return <IdCard className="size-7" />;
  if (type.includes("PHOTO")) return <ImageIcon className="size-7" />;
  return <FileCheck className="size-7" />;
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

function location(detail: UserDetail): string {
  const p = detail.profile as FarmerProfile | BuyerProfile | DriverProfile | null;
  if (!p) return "";
  if ("address" in p && p.address) return [p.address.town, p.address.zone, p.address.regionName].filter(Boolean).join(", ");
  if ("regionName" in p && p.regionName) return p.regionName;
  return "";
}

function ProfileFacts({ detail }: { detail: UserDetail }) {
  const { user, profile } = detail;
  if (!profile) return null;
  if (user.role === "FARMER") {
    const f = profile as FarmerProfile;
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-3">
        <KeyValue label={f.farmerType === "COOPERATIVE" ? "Cooperative" : "Farm"}>{f.farmName ?? "—"}{f.memberCount ? ` · ${f.memberCount} members` : ""}</KeyValue>
        <KeyValue label="Land">{f.landSizeHectares ? `${f.landSizeHectares} ha` : "—"}{f.irrigated ? " · irrigated" : ""}</KeyValue>
        <KeyValue label="Expected supply">{f.expectedMonthlySupplyKg ? `${formatKg(f.expectedMonthlySupplyKg)} / month` : "—"}</KeyValue>
        <KeyValue label="Grows">{f.products.map((p) => p.nameEn).join(", ") || "—"}</KeyValue>
        <KeyValue label="Fayda ID number">{f.faydaIdNumber ?? "—"}</KeyValue>
        <KeyValue label="Payout">{f.payoutMethod ? `${titleCase(f.payoutMethod)} · ${f.payoutAccountNumber ?? ""}` : "Not set"}{f.payoutAccountName ? ` · ${f.payoutAccountName}` : ""}</KeyValue>
        <KeyValue label="Trades completed">{f.completedTrades}</KeyValue>
        <KeyValue label="Location">{f.address?.latitude != null ? `GPS ${f.address.latitude.toFixed(2)}°N ${f.address.longitude?.toFixed(2)}°E` : "No GPS"}</KeyValue>
      </div>
    );
  }
  if (user.role === "BUYER") {
    const b = profile as BuyerProfile;
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-3">
        <KeyValue label="Business">{b.businessName ?? "—"} · {titleCase(b.buyerType)}</KeyValue>
        <KeyValue label="Contact person">{b.contactPerson ?? "—"}</KeyValue>
        <KeyValue label="TIN">{b.tinNumber ?? "—"}</KeyValue>
        <KeyValue label="Trade licence">{b.tradeLicenseNumber ?? "—"}</KeyValue>
        <KeyValue label="Address">{[b.address?.addressLine, b.address?.town].filter(Boolean).join(", ") || "—"}</KeyValue>
        <KeyValue label="Orders completed">{b.completedOrders}</KeyValue>
      </div>
    );
  }
  if (user.role === "DRIVER") {
    const d = profile as DriverProfile;
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-3">
        <KeyValue label="Vehicle">{d.vehicleType ? `${titleCase(d.vehicleType)}${d.vehicleMakeModel ? ` · ${d.vehicleMakeModel}` : ""}` : "—"}</KeyValue>
        <KeyValue label="Plate">{d.vehiclePlate ?? "—"}</KeyValue>
        <KeyValue label="Capacity">{d.capacityKg ? formatKg(d.capacityKg) : "—"}{d.refrigerated ? " · refrigerated" : ""}</KeyValue>
        <KeyValue label="Licence">{d.licenseNumber ?? "—"}{d.licenseExpiryDate ? ` · expires ${formatDate(d.licenseExpiryDate)}` : ""}</KeyValue>
        <KeyValue label="Availability">{titleCase(d.availability)}</KeyValue>
        <KeyValue label="Deliveries completed">{d.completedDeliveries}</KeyValue>
        <KeyValue label="Payout">{d.payoutMethod ? `${titleCase(d.payoutMethod)} · ${d.payoutAccountNumber ?? ""}` : "Not set"}</KeyValue>
        <KeyValue label="Home region">{d.regionName ?? "—"}</KeyValue>
      </div>
    );
  }
  return null;
}

/**
 * Everything operations needs about one person: identity, documents, profile facts, decision history and the
 * verify / ask for info / reject controls. `full` adds account suspension and the wallet balance.
 */
export function UserDetailPanel({ userId, full = false }: { userId: string; full?: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["user-detail", userId], queryFn: () => api.get<UserDetail>(`/admin/users/${userId}`) });
  const [dialog, setDialog] = React.useState<"verify" | "info" | "reject" | "suspend" | "activate" | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["user-detail", userId] });
    void qc.invalidateQueries({ queryKey: ["verifications"] });
    void qc.invalidateQueries({ queryKey: ["users"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const decide = useMutation({
    mutationFn: (v: { decision: "APPROVE" | "REJECT" | "REQUEST_INFO"; note?: string }) =>
      api.post(`/admin/verifications/${userId}/decision`, v),
    onSuccess: (_d, v) => {
      toast.success(v.decision === "APPROVE" ? "Verified. The user has been notified." : v.decision === "REJECT" ? "Rejected. The user has been notified." : "Asked for more information.");
      setDialog(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: (v: { status: "ACTIVE" | "SUSPENDED"; reason?: string }) => api.patch(`/admin/users/${userId}/status`, v),
    onSuccess: (_d, v) => {
      toast.success(v.status === "ACTIVE" ? "Account reactivated" : "Account suspended and signed out");
      setDialog(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (query.isLoading) return <TableSkeleton rows={6} cols={2} />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const detail = query.data;
  const { user } = detail;
  const reviewable = user.role !== "ADMIN";
  const lastReview = detail.reviews[0];

  return (
    <div className="flex flex-col gap-[22px] rounded-[36px] bg-surface p-7">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} size={56} tone="accent" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate">{user.fullName}</h3>
          <div className="text-sm text-sand-700">
            {ROLE_LABEL[user.role]}{location(detail) ? ` · ${location(detail)}` : ""} · {full ? formatPhone(user.phone) : maskPhone(user.phone)} · {LANGUAGE[user.preferredLanguage]}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusTag status={user.verificationStatus} map={VERIFICATION_STATUS} />
          {user.accountStatus !== "ACTIVE" ? <Tag tone="solid-dark">{titleCase(user.accountStatus)}</Tag> : null}
        </div>
      </div>

      {reviewable ? (
        <section aria-label="Documents">
          <h5 className="mb-2 font-sans text-sm font-bold uppercase tracking-wide text-sand-700">Documents</h5>
          {detail.documents.length === 0 ? (
            <p className="rounded-3xl bg-background px-4 py-3 text-sm text-sand-700">No documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
              {detail.documents.map((doc) => (
                <figure key={doc.id} className="flex flex-col gap-2">
                  <a
                    href={isPdf(doc.fileUrl) ? doc.fileUrl : undefined}
                    className="grid h-[110px] place-items-center overflow-hidden rounded-[20px] bg-sand-300 text-sand-700"
                  >
                    {isPdf(doc.fileUrl) ? docIcon(doc.type) : <AuthImage src={doc.fileUrl} alt={DOCUMENT_LABEL[doc.type] ?? doc.type} fallback={docIcon(doc.type)} />}
                  </a>
                  <figcaption className="text-[13px]">
                    <b>{DOCUMENT_LABEL[doc.type] ?? titleCase(doc.type)}</b> ·{" "}
                    <span className={doc.status === "APPROVED" ? "text-sage-700" : doc.status === "REJECTED" ? "text-terra-800" : "text-sand-700"}>{titleCase(doc.status)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <ProfileFacts detail={detail} />

      {full && detail.walletBalance !== null ? <KeyValue label="Wallet balance">{formatMoney(detail.walletBalance)}</KeyValue> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-3">
        <KeyValue label="Joined">{formatDate(user.createdAt)}</KeyValue>
        <KeyValue label="Phone verified">{user.phoneVerified ? "Yes" : "No"}</KeyValue>
        <KeyValue label="Rating">{Number(user.ratingAverage).toFixed(2)} ({user.ratingCount})</KeyValue>
        {detail.statusReason ? <KeyValue label="Status reason">{detail.statusReason}</KeyValue> : null}
      </div>

      {lastReview ? (
        <div className="rounded-3xl bg-background px-[18px] py-3.5 text-sm">
          <b>Last decision:</b> {titleCase(lastReview.decision)} · {formatDateTime(lastReview.at)}
          {lastReview.note ? <> — {lastReview.note}</> : null}
        </div>
      ) : null}

      {reviewable ? (
        <div className="flex flex-wrap gap-2.5">
          <Button size="lg" onClick={() => setDialog("verify")} disabled={user.verificationStatus === "VERIFIED"}>
            <BadgeCheck />Verify {ROLE_LABEL[user.role].toLowerCase()}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setDialog("info")}>Ask for more info</Button>
          <Button size="lg" variant="ghost" onClick={() => setDialog("reject")} disabled={user.verificationStatus === "REJECTED"}>Reject</Button>
          {full ? (
            user.accountStatus === "ACTIVE" ? (
              <Button size="lg" variant="secondary" className="ml-auto" onClick={() => setDialog("suspend")}><ShieldAlert />Suspend account</Button>
            ) : (
              <Button size="lg" variant="sage" className="ml-auto" onClick={() => setDialog("activate")}><ShieldCheck />Reactivate</Button>
            )
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-sand-700">Operations accounts do not go through verification.</p>
      )}

      <ConfirmDialog
        open={dialog === "verify"} onOpenChange={(o) => !o && setDialog(null)} tone="sage"
        title={`Verify ${user.fullName}?`}
        description="Their documents are approved and they can trade without limits. They are notified straight away."
        confirmLabel="Verify" pending={decide.isPending}
        onConfirm={() => decide.mutate({ decision: "APPROVE", note: "Documents and profile checked" })}
      />
      <ReasonDialog
        open={dialog === "info"} onOpenChange={(o) => !o && setDialog(null)} tone="primary"
        title="Ask for more information" description="The user sees this message in the app and by SMS."
        reasonLabel="What do you need from them?" confirmLabel="Send request" pending={decide.isPending}
        onConfirm={(note) => decide.mutate({ decision: "REQUEST_INFO", note })}
      />
      <ReasonDialog
        open={dialog === "reject"} onOpenChange={(o) => !o && setDialog(null)}
        title={`Reject ${user.fullName}?`} description="The user is told why and can submit again after fixing the problem."
        reasonLabel="Reason" confirmLabel="Reject" pending={decide.isPending}
        onConfirm={(note) => decide.mutate({ decision: "REJECT", note })}
      />
      <ReasonDialog
        open={dialog === "suspend"} onOpenChange={(o) => !o && setDialog(null)}
        title={`Suspend ${user.fullName}?`} description="They are signed out everywhere and cannot sign in until you reactivate the account."
        reasonLabel="Reason" confirmLabel="Suspend" pending={setStatus.isPending}
        onConfirm={(reason) => setStatus.mutate({ status: "SUSPENDED", reason })}
      />
      <ConfirmDialog
        open={dialog === "activate"} onOpenChange={(o) => !o && setDialog(null)} tone="sage"
        title={`Reactivate ${user.fullName}?`} confirmLabel="Reactivate" pending={setStatus.isPending}
        onConfirm={() => setStatus.mutate({ status: "ACTIVE" })}
      />
    </div>
  );
}
