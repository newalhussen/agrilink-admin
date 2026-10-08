import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageHeader, Pager, SegTabs, TableSkeleton } from "@/components/common/parts";
import { ConfirmDialog } from "@/components/common/dialogs";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { NotificationItem, Page } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";

export function NotificationsPage() {
  const [tab, setTab] = React.useState<"mine" | "broadcast">("mine");
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={<SegTabs label="Section" value={tab} onChange={setTab} options={[{ value: "mine", label: "My inbox" }, { value: "broadcast", label: "Announcements" }]} />}
      />
      {tab === "mine" ? <Inbox /> : <Broadcast />}
    </>
  );
}

function Inbox() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(0);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const query = useQuery({
    queryKey: ["notifications", "inbox", unreadOnly, page],
    queryFn: () => api.get<Page<NotificationItem>>("/notifications", { unreadOnly, page, size: 20 }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const markAll = useMutation({ mutationFn: () => api.post("/notifications/read-all"), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const markOne = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SegTabs label="Filter" value={unreadOnly ? "unread" : "all"} onChange={(v) => { setUnreadOnly(v === "unread"); setPage(0); }} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }]} />
        <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>Mark all read</Button>
      </div>
      {query.isLoading ? (
        <TableSkeleton rows={5} cols={1} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Megaphone className="size-6" />} title="You are all caught up" hint="Updates about your admin account appear here." />
      ) : (
        <>
          <ul className="flex max-w-3xl flex-col gap-1.5">
            {query.data?.items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !n.read && markOne.mutate(n.id)}
                  className={cn("flex w-full items-start gap-3 rounded-3xl px-4 py-3.5 text-left", n.read ? "hover:bg-foreground/[0.04]" : "bg-terra-100")}
                >
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                  <span className="flex-1 text-sm">
                    <b>{n.title}</b>
                    <span className="block text-sand-800">{n.body}</span>
                    <span className="mt-1 block text-xs text-sand-700">{timeAgo(n.createdAt)} · {titleCase(n.type)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {query.data ? <Pager page={query.data.page} size={query.data.size} totalItems={query.data.totalItems} totalPages={query.data.totalPages} onPage={setPage} /> : null}
        </>
      )}
    </>
  );
}

function Broadcast() {
  const [role, setRole] = React.useState("FARMER");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const send = useMutation({
    mutationFn: () => api.post<{ recipients: number }>("/admin/notifications/broadcast", { role, title: title.trim(), body: body.trim() }),
    onSuccess: (r) => {
      toast.success(`Sent to ${r.recipients} ${r.recipients === 1 ? "person" : "people"}`);
      setConfirm(false);
      setTitle("");
      setBody("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const audience = role === "FARMER" ? "farmers" : role === "BUYER" ? "buyers" : "drivers";
  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <form
        className="flex flex-col gap-4 rounded-[36px] bg-surface p-7"
        onSubmit={(e) => { e.preventDefault(); setConfirm(true); }}
      >
        <h4>Send an announcement</h4>
        <p className="text-sm text-sand-700">Goes to every active person in the chosen group as an in-app notification and push. Use it for price changes, holidays and service news.</p>
        <Field label="Send to">
          <SimpleSelect value={role} onValueChange={setRole} options={[{ value: "FARMER", label: "All farmers" }, { value: "BUYER", label: "All buyers" }, { value: "DRIVER", label: "All drivers" }]} />
        </Field>
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
        <Field label="Message"><Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} /></Field>
        <Button type="submit" size="lg" disabled={!title.trim() || !body.trim()} className="self-start"><Send />Review and send</Button>
      </form>
      <aside className="self-start rounded-[28px] bg-background p-5 text-sm">
        <Tag tone="accent">Preview</Tag>
        <b className="mt-3 block">{title || "Your title"}</b>
        <p className="mt-1 whitespace-pre-wrap text-sand-800">{body || "Your message appears here as recipients will see it."}</p>
      </aside>
      <ConfirmDialog
        open={confirm} onOpenChange={setConfirm}
        title={`Send to all ${audience}?`} description="This cannot be recalled once sent."
        confirmLabel="Send announcement" pending={send.isPending} onConfirm={() => send.mutate()}
      />
    </div>
  );
}
