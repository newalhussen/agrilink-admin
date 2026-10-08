import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, buildQuery, tokens } from "./api";
import { formatEthiopian, toEthiopian } from "./ethiopian";
import { formatDuration, formatKg, formatMoney, formatMoneyCompact, formatPhone, maskPhone, timeLeft } from "./format";
import { initials } from "./utils";

describe("Ethiopian calendar", () => {
  it("matches the date shown in the design (9 Oct 2026 = Meskerem 29, 2019)", () => {
    expect(formatEthiopian(new Date(2026, 9, 9))).toBe("መስከረም 29, 2019");
  });

  it("starts the year on 11 September", () => {
    expect(toEthiopian(new Date(2026, 8, 11))).toEqual({ year: 2019, month: 1, day: 1 });
    expect(toEthiopian(new Date(2026, 8, 10))).toEqual({ year: 2018, month: 13, day: 5 });
  });

  it("handles Pagume in a leap year", () => {
    expect(toEthiopian(new Date(2023, 8, 12))).toEqual({ year: 2016, month: 1, day: 1 });
    expect(toEthiopian(new Date(2023, 8, 11))).toEqual({ year: 2015, month: 13, day: 6 });
  });
});

describe("formatting", () => {
  it("formats money like the design", () => {
    expect(formatMoney(21968)).toBe("ETB 21,968");
    expect(formatMoney("18400.00")).toBe("ETB 18,400");
    expect(formatMoney(2760.5)).toBe("ETB 2,760.50");
    expect(formatMoney(368, { currency: false })).toBe("368");
    expect(formatMoney(null)).toBe("ETB 0");
  });

  it("compacts large amounts for KPI tiles", () => {
    expect(formatMoneyCompact(1_840_000)).toBe("ETB 1.84M");
    expect(formatMoneyCompact(412_000)).toBe("ETB 412K");
    expect(formatMoneyCompact(9450)).toBe("ETB 9,450");
  });

  it("formats weights, phones and durations", () => {
    expect(formatKg(402)).toBe("402 kg");
    expect(formatKg(3200)).toBe("3.2 t");
    expect(formatPhone("+251911234567")).toBe("+251 91 123 4567");
    expect(maskPhone("+251911234567")).toBe("+251911 ••• 4567");
    expect(formatDuration(26 * 3_600_000)).toBe("1 d 2 h");
    expect(formatDuration(3 * 3_600_000 + 12 * 60_000)).toBe("3:12");
    expect(formatDuration(12 * 60_000)).toBe("12 min");
  });

  it("reports time left or overdue", () => {
    const now = Date.parse("2026-10-09T10:00:00Z");
    expect(timeLeft("2026-10-09T10:40:00Z", now)).toBe("40 min");
    expect(timeLeft("2026-10-09T09:00:00Z", now)).toBe("overdue");
    expect(timeLeft(null, now)).toBeNull();
  });

  it("builds initials", () => {
    expect(initials("Tolosa Bekele")).toBe("TB");
    expect(initials("Meki")).toBe("M");
    expect(initials(null)).toBe("?");
  });
});

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    localStorage.clear();
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  it("builds query strings with repeated keys and skips empty values", () => {
    expect(buildQuery({ status: ["A", "B"], q: "", page: 0, none: undefined })).toBe("?status=A&status=B&page=0");
    expect(buildQuery({})).toBe("");
  });

  it("sends the bearer token and parses JSON", async () => {
    tokens.set({ accessToken: "abc", refreshToken: "ref" });
    fetchMock.mockReturnValueOnce(json(200, { ok: true }));
    await expect(api.get("/orders", { page: 1 })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/orders?page=1");
    expect(init.headers.Authorization).toBe("Bearer abc");
  });

  it("turns error bodies into ApiError with code and field errors", async () => {
    fetchMock.mockReturnValueOnce(
      json(400, { code: "VALIDATION_FAILED", message: "bad", fieldErrors: [{ field: "x", message: "required" }] }),
    );
    const error = (await api.post("/things", {}).catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.fieldErrors).toEqual([{ field: "x", message: "required" }]);
  });

  it("refreshes an expired access token once and retries", async () => {
    tokens.set({ accessToken: "old", refreshToken: "ref" });
    fetchMock
      .mockReturnValueOnce(json(401, { code: "UNAUTHENTICATED", message: "expired" }))
      .mockReturnValueOnce(json(200, { accessToken: "new", refreshToken: "ref2" }))
      .mockReturnValueOnce(json(200, { id: 1 }));
    await expect(api.get("/admin/users")).resolves.toEqual({ id: 1 });
    expect(tokens.access).toBe("new");
    expect(tokens.refresh).toBe("ref2");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer new");
  });

  it("signs out when the refresh token is rejected", async () => {
    tokens.set({ accessToken: "old", refreshToken: "dead" });
    const onLogout = vi.fn();
    window.addEventListener("agrilink:logout", onLogout);
    fetchMock
      .mockReturnValueOnce(json(401, { code: "UNAUTHENTICATED", message: "expired" }))
      .mockReturnValueOnce(json(401, { code: "TOKEN_INVALID", message: "nope" }))
      .mockReturnValue(json(401, { code: "UNAUTHENTICATED", message: "expired" }));
    await expect(api.get("/admin/users")).rejects.toBeInstanceOf(ApiError);
    expect(tokens.access).toBeNull();
    expect(onLogout).toHaveBeenCalled();
    window.removeEventListener("agrilink:logout", onLogout);
  });

  it("returns undefined for 204", async () => {
    fetchMock.mockReturnValueOnce(Promise.resolve(new Response(null, { status: 204 })));
    await expect(api.post("/notifications/x/read")).resolves.toBeUndefined();
  });
});
