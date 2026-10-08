import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Avatar, EmptyState, ErrorState, PageHeader, Pager, SearchBox, SegTabs, StatusTag, TableSkeleton, useDebounced } from "@/components/common/parts";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { UserDetailPanel } from "@/components/users/UserDetailPanel";
import { api, errorMessage } from "@/lib/api";
import { ROLE_LABEL, VERIFICATION_STATUS } from "@/lib/constants";
import { formatDate, formatPhone } from "@/lib/format";
import type { Page, Role, User } from "@/lib/types";

type RoleFilter = "ALL" | Role;

export function UsersPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = React.useState<RoleFilter>((params.get("role") as RoleFilter) || "ALL");
  const [status, setStatus] = React.useState(params.get("status") ?? "ALL");
  const [verification, setVerification] = React.useState(params.get("verification") ?? "ALL");
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [page, setPage] = React.useState(0);
  const [adding, setAdding] = React.useState(false);
  const term = useDebounced(q);

  React.useEffect(() => setQ(params.get("q") ?? ""), [params]);
  React.useEffect(() => setPage(0), [role, status, verification, term]);

  const query = useQuery({
    queryKey: ["users", role, status, verification, term, page],
    queryFn: () =>
      api.get<Page<User>>("/admin/users", {
        role: role === "ALL" ? undefined : role,
        status: status === "ALL" ? undefined : status,
        verificationStatus: verification === "ALL" ? undefined : verification,
        q: term || undefined,
        page,
        size: 20,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Users"
        actions={
          <>
            <SearchBox value={q} onChange={(v) => { setQ(v); if (params.has("q")) setParams({}, { replace: true }); }} placeholder="Name, phone or email" />
            <Button variant="secondary" onClick={() => setAdding(true)}><UserPlus />Add admin</Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SegTabs
          label="Role"
          value={role}
          onChange={setRole}
          options={[{ value: "ALL", label: "Everyone" }, { value: "FARMER", label: "Farmers" }, { value: "BUYER", label: "Buyers" }, { value: "DRIVER", label: "Drivers" }, { value: "ADMIN", label: "Admins" }]}
        />
        <SimpleSelect className="w-48" value={verification} onValueChange={setVerification} options={[
          { value: "ALL", label: "Any verification" }, { value: "UNVERIFIED", label: "Not submitted" }, { value: "PENDING", label: "Ready for review" },
          { value: "INFO_NEEDED", label: "Info needed" }, { value: "VERIFIED", label: "Verified" }, { value: "REJECTED", label: "Rejected" },
        ]} />
        <SimpleSelect className="w-44" value={status} onValueChange={setStatus} options={[
          { value: "ALL", label: "Any account status" }, { value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Suspended" }, { value: "DEACTIVATED", label: "Deactivated" },
        ]} />
      </div>

      {query.isLoading ? (
        <TableSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState title="No users found" hint="Try a different search or clear a filter." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="ds-table min-w-[820px]">
              <thead><tr><th>Person</th><th>Role</th><th>Phone</th><th>Verification</th><th>Account</th><th>Rating</th><th>Joined</th></tr></thead>
              <tbody>
                {query.data?.items.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => navigate(`/users/${u.id}`)}>
                    <td>
                      <div className="flex items-center gap-3"><Avatar name={u.fullName} size={34} /><b>{u.fullName}</b></div>
                    </td>
                    <td>{ROLE_LABEL[u.role]}</td>
                    <td className="tabular">{formatPhone(u.phone)}</td>
                    <td>{u.role === "ADMIN" ? <span className="text-sand-700">—</span> : <StatusTag status={u.verificationStatus} map={VERIFICATION_STATUS} />}</td>
                    <td>{u.accountStatus === "ACTIVE" ? <Tag tone="sage">Active</Tag> : <Tag tone="solid-dark">{u.accountStatus.toLowerCase()}</Tag>}</td>
                    <td className="tabular">{u.ratingCount ? `${Number(u.ratingAverage).toFixed(1)} (${u.ratingCount})` : "—"}</td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}
      <AddAdminDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}

function AddAdminDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  React.useEffect(() => {
    if (open) { setPhone(""); setFullName(""); setPassword(""); }
  }, [open]);
  const create = useMutation({
    mutationFn: () => api.post<User>("/admin/users/admins", { phone, fullName, password }),
    onSuccess: (u) => {
      toast.success(`${u.fullName} can now sign in to AgriLink Ops`);
      void qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an operations admin</DialogTitle>
          <DialogDescription>They sign in to this console with their phone number and this password.</DialogDescription>
        </DialogHeader>
        <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Phone number"><Input inputMode="tel" placeholder="0911 234 567" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Temporary password" hint="At least 8 characters. Ask them to change it after signing in."><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={create.isPending || fullName.trim().length < 2 || !phone || password.length < 8} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserDetailPage() {
  const { id } = useParams();
  if (!id) return null;
  return (
    <>
      <PageHeader
        title="Person"
        kicker={<Link to="/users" className="inline-flex items-center gap-1 font-semibold"><ArrowLeft className="size-3.5" />Users</Link>}
      />
      <div className="max-w-4xl"><UserDetailPanel userId={id} full /></div>
    </>
  );
}
