const ZONE = "Africa/Addis_Ababa";

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** "ETB 21,968" (whole birr) or "ETB 21,968.50" when there are cents. */
export function formatMoney(value: number | string | null | undefined, opts: { currency?: boolean } = {}): string {
  const n = toNumber(value);
  const hasCents = Math.abs(n - Math.round(n)) > 0.004;
  const text = n.toLocaleString("en-US", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
  return opts.currency === false ? text : `ETB ${text}`;
}

/** Compact for KPI tiles: ETB 1.84M, ETB 412K, ETB 9,450. */
export function formatMoneyCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `ETB ${trim(n / 1_000_000, 2)}M`;
  if (abs >= 100_000) return `ETB ${Math.round(n / 1000)}K`;
  return formatMoney(n);
}

function trim(n: number, digits: number): string {
  return Number(n.toFixed(digits)).toString();
}

export function formatKg(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n >= 1000) return `${trim(n / 1000, 2)} t`;
  return `${Number(n.toFixed(1)).toLocaleString("en-US")} kg`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString("en-US");
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});
const dateOnly = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeOnly = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateOnly.format(new Date(iso.length === 10 ? `${iso}T00:00:00+03:00` : iso)) : "—";
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? timeOnly.format(new Date(iso)) : "—";
}

export function formatWeekdayDate(date: Date): string {
  return weekday.format(date).replace(",", "");
}

/** "26 h", "3:12" style remaining/elapsed durations. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h >= 24) return `${Math.floor(h / 24)} d ${h % 24} h`;
  if (h >= 1) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m} min`;
}

/** Time left until `iso` ("3:12", "12 min") or "overdue". */
export function timeLeft(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  return diff <= 0 ? "overdue" : formatDuration(diff);
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return formatDateTime(iso);
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  return phone.length > 9 ? `${phone.slice(0, 7)} ••• ${phone.slice(-4)}` : phone;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const m = /^\+251(\d{2})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+251 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
