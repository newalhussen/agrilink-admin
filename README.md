# AgriLink Ops (admin web)

The operations console for AgriLink: verify farmers, buyers and drivers, watch live deliveries, assign drivers, run
the dispute desk, follow payments and withdrawals, manage the catalogue and read reports. It talks to the same
Spring Boot REST API as the mobile apps (`../backend`).

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui-style components (Radix primitives) · TanStack Query ·
React Router · Recharts · Vitest + Testing Library.

The look is the **Organic design system** from the Claude Design output (`../AgriLink design`): cream ground,
terracotta and sage accents, Caprasimo headings over Figtree, pill controls, soft rounded surfaces. All tokens live in
`src/index.css` and are mapped onto the shadcn semantic variables, so every component follows the design.

## Run it

```powershell
# 1. Backend on http://localhost:8080 (dev profile). Any one of:
#    - ../backend: ./mvnw spring-boot:run "-Dspring-boot.run.profiles=dev"   (needs PostgreSQL, see ../backend/README.md)
#    - no PostgreSQL? see "Embedded database" in ../backend/README.md
# 2. Web app
npm install
npm run dev            # http://localhost:5173, /api is proxied to the backend
```

Sign in with the dev admin: phone `0900000000`, password `Admin@12345`.
Want data to look at? `node ../backend/scripts/seed-demo-orders.mjs` creates orders in every stage, a dispute,
withdrawals, an announcement and two people waiting for verification.

| Command | What it does |
|---------|--------------|
| `npm run dev` | dev server with API proxy |
| `npm run build` | type-check and production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit and component tests (formatting, Ethiopian calendar, API client with token refresh, components, login) |
| `node scripts/ui-smoke.mjs` | headless Chrome walk through every page against a running backend and `npm run preview`; fails on console errors or failed API calls and writes screenshots |

Configuration (`.env`, see `.env.example`): `VITE_API_BASE` (default `/api/v1`) and `VITE_BACKEND_URL` for the dev proxy.
In production serve `dist/` from the same origin as the API (reverse proxy `/api` to Spring Boot) or set
`AGRILINK_CORS_ORIGINS` on the backend to the admin's origin.

## What is in it

| Screen | What operations can do |
|--------|------------------------|
| **Overview** | KPI strip (held in escrow, released, on the road, open disputes), "Needs attention" (overdue disputes, verification queue, failed payouts, jobs waiting for a driver), order pipeline, live deliveries |
| **Verification** | Queue per role and status; the person's documents (private files shown through the bearer token), profile facts, decision history; verify, ask for more info, reject |
| **Users** | Search and filter; detail with documents and wallet; suspend or reactivate (signs them out); add operations admins |
| **Orders** | Stage filters (awaiting farmer, awaiting payment, in transit, check window, disputed, closed) with live timers; detail with parties, items, amounts, timeline, tracking, payments, delivery and codes, disputes; cancel before pickup with refund |
| **Deliveries** | Job board by stage; assign or reassign a driver (capacity-aware list), unassign, unlock a handover locked by wrong codes |
| **Payments** | Buyer payments (escrow, release split, refunds) and withdrawals, with status filters and money KPIs |
| **Disputes** | Queue with the 24 h clock; the design's desk: ordered / weighed / reported weights, evidence, timeline, resolution (partial release with suggested refund, full refund, release all) with a live split and fee check |
| **Listings** | Farmer listings with moderation (suspend, reinstate, remove); catalogue editor for categories and products in English, Amharic and Afaan Oromoo |
| **Notifications** | The admin inbox and announcements to all farmers, buyers or drivers |
| **Reports** | Orders and value per day, completion rate, top products, farmers and drivers |
| **Settings** | The live business rules (read-only, set in the backend configuration) and the admin audit trail |

Also: the header shows the date in the Gregorian and Ethiopian calendars (`src/lib/ethiopian.ts`), a global search
(`/` focuses it; `AL-…` opens orders, `DSP-…` disputes, anything else people), access tokens refresh transparently
with a single-flight refresh, and only `ADMIN` accounts can sign in.

## Structure

```
src/
  auth/        AuthProvider (admin-only sign-in, token handling)
  components/  ui/ (button, input, dialog, select, radio, tag, card...), common/ (tables, tabs, pager, dialogs), layout/, users/
  lib/         api client, types mirroring the REST DTOs, formatting, Ethiopian calendar, status constants
  pages/       one file per screen (lazy loaded)
```
