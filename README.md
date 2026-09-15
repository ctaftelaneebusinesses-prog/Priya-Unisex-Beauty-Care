# Priya UNISEX Beauty Care — Salon Billing & Management System

Internal billing and salon management software for **Priya UNISEX Beauty Care**.
This is **not** a public website, marketplace, or customer-facing booking app —
it has exactly two user roles (**Owner** and **Employee**) and customers never
log in. The core workflow is a fast, POS-style billing screen with GST-ready
invoicing, plus every supporting module an owner needs to run the salon:
services, employees, staff commission, memberships & prepaid wallets,
inventory, expenses, jewellery rental, reports and GST.

> **Maintenance note:** this README is the onboarding doc for this project.
> Whenever you add, remove, or meaningfully change a feature, update the
> relevant section below in the same change — especially **Feature Modules**,
> **Data Model**, and **Current Limitations / Roadmap**. Treat an out-of-date
> README as a bug.

---

## 1. Architecture at a Glance

This is a two-process app:

- **`/` (root)** — the React + TypeScript frontend (Vite).
- **`/server`** — a real Node.js + Express backend with its own SQLite
  database (`server/data/salon.db`, created automatically), JWT auth, and
  role-based write/read authorization enforced server-side (not just hidden
  buttons in the UI).

The frontend never touches `localStorage` for app data — every domain service
in `src/services/*` talks to the backend over HTTP via `src/services/storage.ts`
(a small `fetch`-based REST client). The only thing kept client-side is the
JWT auth token.

---

## 2. Getting Started

**Requirements:** Node.js **22.5+** (the backend uses the built-in `node:sqlite`
module — no native build tools or separate database server needed) and npm.

Run both processes, in two terminals:

```bash
# Terminal 1 — backend (http://localhost:4000)
cd server
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
npm install
npm run dev
```

The backend seeds itself with demo data automatically the first time it runs
(see `server/src/seed.ts`) — nothing to do beyond `npm run dev`.

```bash
npm run build     # frontend: type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # run oxlint
```

The frontend calls the backend at `http://localhost:4000/api` by default;
override with a `VITE_API_URL` env var if the backend runs elsewhere.

### Demo Logins

Two seeded accounts (see `server/src/seed.ts` → `rawUsers`):

| Role     | Email                       | Password       |
|----------|------------------------------|----------------|
| Owner    | `craftlanee@gmail.com`       | `owner123`     |
| Employee | `grisha@priyasalon.in`       | `employee123`  |

To reset all demo data, stop the backend, delete `server/data/salon.db`, and
restart it — it will reseed from scratch.

---

## 3. Feature Modules

| Area | Route(s) | Notes |
|---|---|---|
| **Dashboard** | `/dashboard` | Role-aware: Owner sees revenue/GST/membership KPIs, a "Business Health" row (sales, expenses, net business amount, pending commission, active wallets, low stock, jewellery rentals) and charts; Employee sees their own day-at-a-glance. |
| **New Bill (POS)** | `/billing/new` | The core screen. Customer search/create → service/category grid → per-line employee assignment → live GST + membership-aware totals → optional "Pay with Wallet" → payment → invoice. Also accepts `?appointmentId=` to pre-fill from a booked appointment. Every completed bill auto-generates staff commission records behind the scenes. |
| **Bill History** | `/billing/history`, `/billing/history/:id` | Search/filter invoices, view/print/share an invoice, void (owner only). |
| **Customers** | `/customers`, `/customers/:id` | List + profile (visits, spend, discount membership, prepaid wallet balance + top-up + transaction history, billing history). |
| **Services** | `/services` (owner only) | Manage the real service catalog (see below), pricing, duration, gender applicability, GST rate, assigned employees, active/inactive. |
| **Employees** | `/employees`, `/employees/:id` (owner only) | Staff CRUD + assigned services; performance page with revenue/appointments/rating charts, a **Commission Summary** block, and date-range filters. |
| **Staff Commission** | `/commissions` (owner only) | Configure commission rules (global default, per-employee, per-service, or per-employee-per-service; percentage or fixed) and review commission records generated automatically from actual bills — filter by employee/service/date, mark Pending records Paid. |
| **Memberships** | `/memberships` (owner only) | Two plan types: **Discount** (percent/flat off every visit) and **Wallet** (prepaid balance card). Active / Expiring Soon / Expired tracking; assign either type to a customer. |
| **Inventory** | `/inventory` (owner only) | Simple product stock tracking — Add/Remove/Adjust stock with a full movement log, low-stock flagging, current stock / low stock / stock movement views. |
| **Expenses** | `/expenses` (owner only) | Record salon expenses by category, filter by date/category, and see Total Sales − Total Expenses = **Net Business Amount** for the period. |
| **Jewellery Rental** | `/jewellery` (owner only) | Full lifecycle: catalog → reserve or rent out → confirm pickup → process return (damage charges and other penalties deducted from the *security deposit only*, never counted as revenue) → item automatically becomes available again. Overdue-return alerting built in. |
| **Appointments** | `/appointments` | Internal-only scheduling (no public booking). A confirmed appointment can be converted straight into a pre-filled bill. |
| **Reports** | `/reports` | Owner: Sales, Service Revenue, Employee Revenue, Staff Commission, Membership Wallet, Payment Methods, Discounts, Inventory, Expenses, Jewellery & Deposits — all with date filters and CSV export. Employee: "My Performance" only. |
| **GST** | `/gst` (owner only) | GSTIN/business tax settings (rate is configurable, never hardcoded), links to the official GST portal, and a GST report (Month/Quarter/Financial Year/Custom) with print/export. |
| **Settings** | `/settings` (owner only) | Business details shown on every invoice (name, address, phone, footer note, currency symbol). |

### Real Salon Services Modeled

The service catalog (`server/src/seed.ts`) reflects Priya UNISEX Beauty Care's
actual offering across 6 categories: Hair Care & Styling, Skin & Facial Care,
Waxing Services, Nails/Hands & Feet, Massage & Body Care, and Grooming &
Makeup — including the "Full Waxing Package (FA+FL+UA)" modeled as an
explicit bundle of component services. The owner can add more from the
Services page at any time.

---

## 4. Architecture

```
server/                Backend — Node.js + Express + TypeScript
  src/db.ts             SQLite connection (node:sqlite) + schema
  src/collectionStore.ts Generic key/value collection + singleton store used by every entity
  src/permissions.ts     Server-side role → collection read/write authorization
  src/auth.ts            JWT signing/verification, requireAuth middleware
  src/routes/            auth.ts (login/me), collections.ts (generic CRUD), singletons.ts (settings)
  src/seed.ts            Demo data for every module, seeded once on first run
  data/salon.db          SQLite database file (git-ignored, created at runtime)

src/                    Frontend — React + TypeScript
  types/                 Domain types (Bill, Customer, Employee, SalonService, CommissionRule, InventoryProduct, Expense, JewelleryRental, ...)
  services/               "API" layer — see below
  utils/                  Pure helpers: GST math, currency formatting, date ranges, CSV export, membership discount math
  auth/                   AuthContext, LoginPage, ProtectedRoute, permissions.ts (role → permission map)
  layouts/                AppLayout, Sidebar (role-filtered nav), Header
  components/             Generic reusable UI: DataTable, Modal, ConfirmationDialog, Toast, Form fields, Badge, DashboardCard, charts/
  features/               Feature-specific composite components (billing/, customers/, employees/, memberships/, services/, appointments/, commissions/, inventory/, expenses/, jewellery/)
  pages/                  Route-level screens, one folder per feature area, composed from features/ + components/
```

### Service Layer (`src/services/*`)

Every domain service (`billingService`, `customerService`, `serviceService`,
`employeeService`, `membershipService`, `appointmentService`,
`billableItemService`, `commissionService`, `inventoryService`,
`expenseService`, `jewelleryService`, `settingsService`/`gstService`,
`authService`, `reportService`) exposes plain async functions (`getAll`,
`getById`, `create`, `update`, ...) that call `src/services/storage.ts`, which
sends the actual HTTP requests to the backend's generic `/api/collections/:name`
and `/api/singletons/:name` endpoints. Every collection (`bills`, `customers`,
`inventoryProducts`, `jewelleryRentals`, ...) is stored as JSON documents keyed
by `id` in one generic SQLite table server-side — there's no per-entity backend
route to maintain; adding a new domain concept on the frontend is enough,
as long as its access rule is added to `server/src/permissions.ts`.

### Billing / GST Math (`src/utils/gst.ts`)

`calculateBillTotals(items, additionalDiscountTotal, gstTaxType)` is the single
source of truth for subtotal → discount → taxable amount → CGST/SGST or IGST →
grand total. It's used identically by the live New Bill summary, the
`billingService.create` bill-persistence path, and the historical seed-data
generator (`server/src/seed.ts`), so there is one calculation to trust.

**Important invariant:** `Bill.discountAmount` stores only manual/line-level
discounts. Membership benefit is tracked separately in
`Bill.membershipDiscountAmount`, and wallet payment separately again in
`Bill.walletAmountUsed`. Never sum these into `discountAmount` — the UI (bill
summary, invoice) lists them as separate rows, and double-counting discount +
membership there was an actual bug that was fixed once already.

### Staff Commission (`src/services/commissionService.ts`)

`commissionService.generateForBill(bill)` runs automatically inside
`billingService.create` right after a bill is persisted — for every SERVICE
line item with an assigned employee, it resolves the most specific active
`CommissionRule` (Employee+Service > Service > Employee > Global default) and
writes a `CommissionRecord` with status `Pending`. Commission is never entered
manually; it is always derived from an actual completed sale.

### Membership Wallets (`src/services/membershipService.ts`)

A `MembershipPlan` is either `type: "DISCOUNT"` (percent/flat off) or
`type: "WALLET"` (prepaid balance, credited via `walletCreditAmount` on
purchase). `membershipService.useWallet(...)` is the only way a wallet balance
is deducted — it refuses to go negative and refuses to spend from an expired
or cancelled membership — and every top-up/purchase/usage writes a
`WalletTransaction` row so the customer profile can show a full ledger.

### Jewellery Rental (`src/services/jewelleryService.ts`)

Item status follows `AVAILABLE → RESERVED/RENTED → (back to) AVAILABLE`.
`jewelleryRentalService.processReturn(...)` computes
`depositReturned = max(0, securityDeposit − damageCharges − otherPenalty)` —
the security deposit and its deductions are never added to `bills` or counted
as salon revenue; they only ever appear in the Jewellery report's own
"Rental Revenue" (from `rentalAmount`) vs. "Security Deposits Held" figures.

### Auth & Permissions

There are now two layers, and both must be kept in sync when a new owner-only
feature is added:

1. **Frontend UX gate** — `src/auth/permissions.ts` defines the permission set
   per role and is checked in `Sidebar.tsx` (hides nav items) and
   `ProtectedRoute.tsx` (blocks direct URL navigation, redirecting to
   `/dashboard`).
2. **Backend enforcement** — `server/src/permissions.ts` defines which
   collections/singletons an `EMPLOYEE` token may read or write; everything
   not explicitly listed defaults to Owner-only. This is what actually stops
   an employee from writing owner-only data even via a raw API request — the
   frontend gate alone is not a security boundary.

One deliberate exception: the GST invoice counter lives in its own
`invoice-counter` singleton (writable by any authenticated user) separate from
`gst-settings` (GSTIN/rates, Owner-write-only) — this is what lets an employee
generate an invoice (incrementing the counter) without being able to touch tax
configuration.

---

## 5. Data Model Reference

See `src/types/index.ts` for the full set. Key entities beyond the original
billing/customer/service/employee/appointment set:

- **CommissionRule / CommissionRecord** — rules configure percentage or fixed commission by scope (global/employee/service/both); records are the actual earned-per-sale ledger with `Pending`/`Paid` status.
- **InventoryProduct / StockTransaction** — a product's `quantity` is always a snapshot; every add/remove/adjust is logged as a `StockTransaction` and is the audit trail behind the snapshot.
- **Expense** — category is one of the 10 fixed categories from the spec; `status` is `Recorded`/`Void` (voided expenses are excluded from reports, never hard-deleted).
- **MembershipPlan.type** — `"DISCOUNT"` or `"WALLET"`; `CustomerMembership.walletBalance` only applies to wallet-type memberships and is the live spendable balance.
- **WalletTransaction** — one row per purchase/top-up/usage/adjustment, always carrying `previousBalance` → `newBalance` so the ledger is independently reconstructable.
- **JewelleryItem / JewelleryRental** — item `status` reflects current availability; rental `status` walks `RESERVED → RENTED → RETURNED` (or `CANCELLED`), and only the rental record carries the return-time financials (damage charges, penalty, refund).
- **GSTSettings** — `nextInvoiceNumber` is composed at the service layer from two separate backend singletons (see Auth & Permissions above); everywhere else in the codebase it's still just one `GSTSettings` object.

---

## 6. Current Limitations / Roadmap

- **Auth is still fairly basic** — JWT with a 12h expiry and bcrypt-hashed
  passwords, but no refresh tokens, password reset, or account lockout. Fine
  for a single-location internal tool, not yet "production SaaS" grade.
- **SQLite via `node:sqlite`** — perfect for one salon's data volume on one
  server; if this ever needs to run across multiple physical locations
  sharing data, move to a networked database.
- **Invoice "Download"** currently triggers the browser's print-to-PDF dialog
  rather than generating a PDF via a dedicated library.
- **Bundle size** — single JS chunk (~880KB / ~247KB gzipped); consider
  route-level code-splitting (`React.lazy`) if this becomes noticeable.
- **No git repository initialized yet** in this working directory.

---

## 7. Tech Stack

**Frontend:** React 19 · TypeScript · Vite · React Router v7 · Tailwind CSS v4
· Recharts · lucide-react (icons) · date-fns · uuid.

**Backend:** Node.js (22.5+) · Express · TypeScript (via `tsx`) · `node:sqlite`
(built-in, no native deps) · jsonwebtoken · bcryptjs · cors.
