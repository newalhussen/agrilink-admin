import type { AuthResponse } from "./types";

const BASE: string = import.meta.env.VITE_API_BASE ?? "/api/v1";
const ACCESS_KEY = "agrilink.admin.access";
const REFRESH_KEY = "agrilink.admin.refresh";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: { field: string; message: string }[];

  constructor(status: number, code: string, message: string, fieldErrors: { field: string; message: string }[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Token storage. Tokens live in localStorage so a reload keeps the operator signed in. */
export const tokens = {
  get access(): string | null {
    return safe(() => localStorage.getItem(ACCESS_KEY));
  },
  get refresh(): string | null {
    return safe(() => localStorage.getItem(REFRESH_KEY));
  },
  set(auth: Pick<AuthResponse, "accessToken" | "refreshToken">) {
    safe(() => {
      localStorage.setItem(ACCESS_KEY, auth.accessToken);
      localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    });
  },
  clear() {
    safe(() => {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    });
  },
};

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
    else params.append(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    tokens.set((await res.json()) as AuthResponse);
    return true;
  } catch {
    return false;
  }
}

/**
 * Single-flight refresh: concurrent 401s share one call (the backend rotates refresh tokens, so two parallel
 * refreshes would invalidate each other). The shared promise is cleared the moment it settles.
 */
function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refreshToken = tokens.refresh;
  if (!refreshToken) return Promise.resolve(false);
  const attempt = doRefresh(refreshToken).finally(() => {
    refreshing = null;
  });
  refreshing = attempt;
  return attempt;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body.code ?? "ERROR", body.message ?? res.statusText, body.fieldErrors ?? []);
  } catch {
    return new ApiError(res.status, "ERROR", res.statusText || "Request failed");
  }
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; retry?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const access = tokens.access;
  if (access) headers.Authorization = `Bearer ${access}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}${buildQuery(opts.query)}`, { method, headers, body });
  if (res.status === 401 && opts.retry !== false && !path.startsWith("/auth/")) {
    if (await refreshSession()) return request<T>(method, path, { ...opts, retry: false });
    tokens.clear();
    window.dispatchEvent(new Event("agrilink:logout"));
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body: body ?? {} }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Private files (ID documents, evidence) need the bearer token, so images are fetched and shown as object URLs. */
export async function fetchBlobUrl(fileUrl: string): Promise<string> {
  const path = fileUrl.startsWith("/api/v1") ? fileUrl.slice("/api/v1".length) : fileUrl;
  const headers: Record<string, string> = {};
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  let res = await fetch(`${BASE}${path}`, { headers });
  if (res.status === 401 && (await refreshSession())) {
    headers.Authorization = `Bearer ${tokens.access}`;
    res = await fetch(`${BASE}${path}`, { headers });
  }
  if (!res.ok) throw await parseError(res);
  return URL.createObjectURL(await res.blob());
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors.length) return error.fieldErrors.map((f) => `${f.field}: ${f.message}`).join("; ");
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
