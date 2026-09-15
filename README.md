# Priya UNISEX Beauty Care — Salon Billing & Management System

Internal billing and salon management software for **Priya UNISEX Beauty Care**.
This is **not** a public website, marketplace, or customer-facing booking app —
it has exactly two user roles (**Owner** and **Employee**) and customers never
log in. The core workflow is a fast, POS-style billing screen with GST-ready
invoicing, plus the supporting management screens an owner needs to run the
salon (services, employees, memberships, reports, GST).

> **Maintenance note:** this README is the onboarding doc for this project.
> Whenever you add, remove, or meaningfully change a feature, update the
> relevant section below in the same change — especially **Feature Modules**,
> **Data Model**, and **Current Limitations / Roadmap**. Treat an out-of-date
> README as a bug.

---

## 1. Current State: Frontend Only

There is **no backend server yet**. The app is a fully working React SPA where
all data (customers, bills, employees, services, memberships, GST settings...)
is persisted in the browser's `localStorage`, behind an async service layer
that already looks like an API client (`Promise`-returning CRUD calls with
simulated latency). See [Architecture](#4-architecture) for how to swap in a
real backend later without touching any page or component.

Demo data is seeded automatically on first load (see `src/data/seedData.ts`).

---

## 2. Getting Started

**Requirements:** Node.js 18+ and npm.

```bash
npm install       # install dependencies
npm run dev       # start the dev server (Vite) — http://localhost:5173
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # run oxlint
```

### Demo Logins

Two seeded accounts (see `src/data/seedData.ts` → `seedUsers`):

| Role     | Email                       | Password       |
|----------|------------------------------|----------------|
| Owner    | `aidev-usr1@raytcs.com`      | `owner123`     |
| Employee | `grisha@priyasalon.in`       | `employee123`  |

To reset all demo data, clear the site's `localStorage` (DevTools →
Application → Local Storage → delete the `priya-salon:*` keys) and reload.

---

## 3. Feature Modules

| Area | Route(s) | Notes |
|---|---|---|
| **Dashboard** | `/dashboard` | Role-aware: Owner sees revenue/GST/membership KPIs + charts; Employee sees their own day-at-a-glance. |
| **New Bill (POS)** | `/billing/new` | The core screen. Customer search/create → service/category grid → per-line employee assignment → live GST + membership-aware totals → payment → invoice. Also accepts `?appointmentId=` to pre-fill from a booked appointment. |
| **Bill History** | `/billing/history`, `/billing/history/:id` | Search/filter invoices, view/print/share an invoice, void (owner only). |
| **Customers** | `/customers`, `/customers/:id` | List + profile (visits, spend, membership, billing history). |
| **Services** | `/services` (owner only) | Manage the real service catalog (see below), pricing, duration, gender applicability, GST rate, assigned employees, active/inactive. |
| **Employees** | `/employees`, `/employees/:id` (owner only) | Staff CRUD + assigned services; performance page with revenue/appointments/rating charts and date-range filters. |
| **Memberships** | `/memberships` (owner only) | Membership plans (percent or flat discount) + customer membership assignment; Active / Expiring Soon / Expired tracking. |
| **Appointments** | `/appointments` | Internal-only scheduling (no public booking). A confirmed appointment can be converted straight into a pre-filled bill. |
| **Reports** | `/reports` | Owner: Sales, Service Revenue, Employee Revenue, Membership Revenue, Payment Methods, Discounts (with CSV export). Employee: "My Performance" only. |
| **GST** | `/gst` (owner only) | GSTIN/business tax settings (rate is configurable, never hardcoded), links to the official GST portal, and a GST report (Month/Quarter/Financial Year/Custom) with print/export. |
| **Settings** | `/settings` (owner only) | Business details shown on every invoice (name, address, phone, footer note, currency symbol). |

### Real Salon Services Modeled

The service catalog (`src/data/seedData.ts` → `seedServices`) reflects Priya
UNISEX Beauty Care's actual offering across 6 categories: Hair Care & Styling,
Skin & Facial Care, Waxing Services, Nails/Hands & Feet, Massage & Body Care,
and Grooming & Makeup — including the "Full Waxing Package (FA+FL+UA)" modeled
as an explicit bundle of component services. The owner can add more from the
Services page at any time.

---

## 4. Architecture

```
src/
  types/            Domain types (Bill, Customer, Employee, SalonService, ...)
  services/         "API" layer — see below
  data/seedData.ts  Demo data: employees, services, customers, plans, GST/business settings, historical bills
  utils/            Pure helpers: GST math, currency formatting, date ranges, CSV export, membership discount math
  auth/             AuthContext, LoginPage, ProtectedRoute, permissions.ts (role → permission map)
  layouts/          AppLayout, Sidebar (role-filtered nav), Header
  components/       Generic reusable UI: DataTable, Modal, ConfirmationDialog, Toast, Form fields, Badge, DashboardCard, charts/
  features/         Feature-specific composite components (billing/, customers/, employees/, memberships/, services/, appointments/)
  pages/            Route-level screens, one folder per feature area, composed from features/ + components/
```

### Service Layer (`src/services/*`)

Every domain service (`billingService`, `customerService`, `serviceService`,
`employeeService`, `membershipService`, `appointmentService`,
`billableItemService`, `settingsService`/`gstService`, `authService`,
`reportService`) exposes plain async functions (`getAll`, `getById`, `create`,
`update`, ...) that currently read/write `localStorage` via the generic
repository in `storage.ts`, with an artificial ~120ms delay so loading states
are real and exercised in the UI.

**To connect a real backend:** replace the internals of these files (swap
`store.getAll(...)` etc. for `fetch`/`axios` calls) — the function signatures
are the contract every page already codes against, so no page or component
needs to change. `reportService.ts` currently computes aggregates client-side
from the full bill list; if bill volume grows, move that aggregation
server-side behind the same function signatures.

### Billing / GST Math (`src/utils/gst.ts`)

`calculateBillTotals(items, additionalDiscountTotal, gstTaxType)` is the single
source of truth for subtotal → discount → taxable amount → CGST/SGST or IGST →
grand total. It's used identically by the live New Bill summary, the
`billingService.create` bill-persistence path, and the historical seed-data
generator, so there is one calculation to trust.

**Important invariant:** `Bill.discountAmount` stores only manual/line-level
discounts. Membership benefit is tracked separately in
`Bill.membershipDiscountAmount`. Never sum these into `discountAmount` — the
UI (bill summary, invoice) lists them as separate rows, and double-counting
them there was an actual bug that was fixed once already (see git history /
`billingService.ts` + `seedData.ts`).

### Auth & Permissions

`src/auth/permissions.ts` defines the full permission set per role
(`OWNER` / `EMPLOYEE`) and is checked in two places: `Sidebar.tsx` (hides nav
items) and `ProtectedRoute.tsx` (blocks direct URL navigation, redirecting to
`/dashboard`). Both must stay in sync with any new owner-only route — hiding a
nav link is not sufficient on its own, the route also needs a
`<ProtectedRoute requires="...">` wrapper in `App.tsx`. When a real backend
exists, the backend must enforce the same rules independently; this
frontend-only gate is not a security boundary by itself.

---

## 5. Data Model Reference

See `src/types/index.ts` for the full set. Key entities:

- **SalonService** — name, category (one of the 6 fixed categories), price, duration, gender applicability, assigned employees, GST rate, active/inactive, optional package components.
- **Employee** — profile, specialization, assigned services, working hours, status.
- **Customer** — profile only; visit/spend stats are derived from bills at read time, not stored redundantly.
- **CustomerMembership** — links a customer to a `MembershipPlan`; status (`ACTIVE`/`EXPIRING_SOON`/`EXPIRED`/`CANCELLED`) is derived live from dates in `membershipService.deriveMembershipStatus`, not trusted from storage.
- **Bill** — the invoice record: line items, subtotal, discount, membership discount, taxable amount, CGST/SGST/IGST, grand total, payment method/status, status (`COMPLETED`/`VOID`).
- **GSTSettings** / **BusinessSettings** — singleton config objects (see `createSingletonStore` in `storage.ts`).

---

## 6. Current Limitations / Roadmap

- **No backend** — everything lives in `localStorage`, per browser. Not multi-device, not multi-terminal.
- **Invoice "Download"** currently triggers the browser's print-to-PDF dialog rather than generating a PDF via a dedicated library.
- **Auth is demo-grade** — plaintext passwords in seed data, no real session/token handling. Must be replaced before any real backend/deployment.
- **Bundle size** — single JS chunk (~830KB / ~237KB gzipped); consider route-level code-splitting (`React.lazy`) if this becomes noticeable.
- **No git repository initialized yet** in this working directory.

---

## 7. Tech Stack

React 19 · TypeScript · Vite · React Router v7 · Tailwind CSS v4 · Recharts ·
lucide-react (icons) · date-fns · uuid.
#   P r i y a - U n i s e x - B e a u t y - C a r e  
 