import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/badge";
import { fetchBlobUrl } from "@/lib/api";
import type { Tone } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn, initials } from "@/lib/utils";

/** "1 order", "2 orders". */
export function plural(n: number, singular: string, pluralForm = singular + "s"): string {
  return `${formatNumber(n)} ${n === 1 ? singular : pluralForm}`;
}

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Page title row: heading on the left, filters / actions on the right (left-aligned, as in the design). */
export function PageHeader({
  title, kicker, actions, children,
}: { title: React.ReactNode; kicker?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        {kicker ? <div className="mb-1 text-sm text-muted-foreground">{kicker}</div> : null}
        <h2 className="truncate">{title}</h2>
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** The design's segmented control (`.seg`), keyboard-accessible radio group. */
export function SegTabs<T extends string>({
  value, onChange, options, className, label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number | null }[];
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex w-fit max-w-full flex-wrap overflow-hidden rounded-full border border-border", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 px-4 py-[7px] text-[13px] transition-colors focus-visible:outline-offset-[-2px]",
              i > 0 && "border-l border-border",
              active ? "bg-primary text-primary-foreground" : "hover:bg-foreground/[0.07]",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count !== null ? <span className={cn("font-bold", active ? "opacity-90" : "text-muted-foreground")}>{formatNumber(o.count)}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function StatusTag({ status, map, className }: { status: string; map: Record<string, { label: string; tone: Tone }>; className?: string }) {
  const entry = map[status] ?? { label: status, tone: "neutral" as Tone };
  return <Tag tone={entry.tone} className={className}>{entry.label}</Tag>;
}

export function Avatar({ name, size = 38, tone = "neutral", className }: { name: string; size?: number; tone?: "neutral" | "accent" | "sage"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold",
        tone === "neutral" && "bg-sand-300",
        tone === "accent" && "bg-terra-300",
        tone === "sage" && "bg-sage-500 text-sand-100",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
    >
      {initials(name)}
    </span>
  );
}

export function SearchBox({
  value, onChange, placeholder = "Search…", className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" aria-label={placeholder} />
    </div>
  );
}

export function EmptyState({ title, hint, icon, action }: { title: string; hint?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[28px] bg-surface/60 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-sand-300 text-sand-700">{icon ?? <Inbox className="size-6" />}</span>
      <h4 className="mt-2">{title}</h4>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-[28px] bg-terra-100 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-terra-300 text-terra-800"><AlertTriangle className="size-6" /></span>
      <h4 className="mt-2 text-terra-900">Could not load this</h4>
      <p className="max-w-md text-sm text-terra-800">{message}</p>
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className="h-9 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

/** Previous / next with a "1-20 of 212" summary; pages are zero-based like the API. */
export function Pager({
  page, size, totalItems, totalPages, onPage,
}: { page: number; size: number; totalItems: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalItems === 0) return null;
  const from = page * size + 1;
  const to = Math.min(totalItems, (page + 1) * size);
  return (
    <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
      <span className="tabular">{from}–{to} of {formatNumber(totalItems)}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="icon" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)}><ChevronLeft /></Button>
        <span className="px-2 tabular">Page {page + 1} / {Math.max(1, totalPages)}</span>
        <Button variant="secondary" size="icon" aria-label="Next page" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight /></Button>
      </div>
    </div>
  );
}

export function KeyValue({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{children ?? "—"}</div>
    </div>
  );
}

export function StatCard({
  label, value, hint, icon, tone = "surface", hintTone = "muted", onClick,
}: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode;
  tone?: "surface" | "accent" | "sage"; hintTone?: "muted" | "accent" | "sage"; onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[13px] text-sand-700">{icon}{label}</span>
      <span className="tabular text-[28px] font-bold leading-tight">{value}</span>
      {hint ? (
        <span className={cn("text-[13px]", hintTone === "accent" && "font-semibold text-terra-700", hintTone === "sage" && "font-semibold text-sage-700", hintTone === "muted" && "text-sand-700")}>{hint}</span>
      ) : null}
    </>
  );
  const cls = cn(
    "flex flex-col gap-1 rounded-[28px] p-5 text-left",
    tone === "surface" && "bg-surface",
    tone === "accent" && "bg-terra-200",
    tone === "sage" && "bg-sage-200",
    onClick && "cursor-pointer transition-shadow hover:shadow-md",
  );
  return onClick ? <button type="button" className={cls} onClick={onClick}>{body}</button> : <div className={cls}>{body}</div>;
}

/** Image behind the bearer token (ID documents, evidence photos are private files). */
export function AuthImage({ src, alt, className, fallback }: { src: string | null | undefined; alt: string; className?: string; fallback?: React.ReactNode }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!src) return;
    let revoked: string | null = null;
    let cancelled = false;
    setFailed(false);
    fetchBlobUrl(src)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        revoked = u;
        setUrl(u);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);
  if (failed || !src) return <>{fallback ?? <span className="text-xs text-muted-foreground">No preview</span>}</>;
  if (!url) return <Skeleton className={cn("size-full", className)} />;
  return <img src={url} alt={alt} className={cn("size-full object-cover", className)} />;
}
