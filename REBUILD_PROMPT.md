# Full rebuild prompt — DBS Management (personal & business finance app)

You are rebuilding this app from scratch. Ignore all existing code. Below is the product truth: what it is, what it must do, what already works and should be preserved, the pain points to design away, the stack, and the credentials. Design a clean architecture that satisfies the behaviors below.

## What the app is

A mobile-first Brazilian-Portuguese finance app for tracking money across personal and small-business life: income/expense transactions across multiple accounts ("caixas"), bills to pay (boleto codes, installments, recurring), cash-flow projection, and simple business reporting (P&L, tax estimate). Used by an owner who can invite read-only viewers. Everything is scoped to a selected month on the dashboard.

## Product principles

1. Mobile-first and thumb-friendly: bottom sheets for forms, FAB for quick actions, cards instead of tables on small screens — with a desktop grid layout on md+.
2. Monthly-navigation paradigm: the dashboard, transactions, and bills all have a month switcher, and every section must honor the selected month consistently (income, expenses, net, categories, bills, recent transactions).
3. Roles: owner (full CRUD) and viewer (read-only). Enforced in the DB (RLS) AND hidden in the UI for viewers.
4. Dark theme by default; clean light theme; toggle in the header and in settings; no flash on load.
5. Locale pt-BR everywhere: BRL currency, Portuguese month/day names ("agosto de 2026").
6. Single source of truth for data: one typed data/query layer, not ad-hoc Supabase calls in every component.

## Core domain

- **Users** (Supabase Auth) with a profile (name, email).
- **Workspaces**: type `personal | business`, plan tier. Members with role `owner | viewer`.
- **Categories**: name, type (income/expense), owned by a workspace.
- **Caixas** (accounts): type `bank | cash | credit_card`, current balance (computed).
- **Payment methods**.
- **Transactions**: type (income/expense), amount, description, date, category, caixa, payment method. Transfers = two linked rows sharing a `transfer_id`.
- **Bills**: `bill_type` regular | boleto | parcelado | recorrente; due_date, paid, optional barcode; installments share an `installment_group_id` with number/total; recurring bills pre-created for N months.
- **Forecast incomes** (cash-flow projection on the reports page).
- **RLS**: owner = full access; viewer = read-only (writes rejected at the database).

## What already works well — preserve these behaviors

- Workspace creation/selection, per-workspace data isolation, role-based access.
- Transactions: add/edit/delete modal with category/caixa/method/date, duplicate-transaction detection ("Salvar mesmo assim?"), CSV export of the filtered list.
- Bills: the 4 bill types with installment/recurring expansion, paid toggle (optionally creates the matching expense transaction), overdue vs upcoming grouping, next-month total.
- Dashboard: month nav + hero (total balance, monthly income/expense/net, business margin), account strip, bills alert card, top categories, recent transactions.
- Reports (business): DRE by category with a date range, cash-flow forecast over 30/60/90 days combining current balance + forecast incomes + future unpaid bills.
- Category insights on transactions: this month vs last month with % change.
- Light/dark theme system (localStorage, no-FOUC inline script, header + settings toggle).
- Mobile bottom-sheet dialogs, speed-dial FAB, viewer gating of all write controls.

## Pain points to design away (why this rebuild exists)

- No single data layer: each page queries Supabase directly, the dashboard runs 6 ad-hoc queries, mobile/desktop variants drift.
- PostgREST embed confusion: embedded relations come back as **arrays**; the old code read them as objects in places. Provide one typed helper for embedded names so this can't happen again.
- Duplication: near-identical cards in both a shared folder and screen files. One component library, one data hook.
- Dead code / leftover junk: unused components, duplicate postcss config, stray tsconfig includes, unused lib files.
- Month-scoping was inconsistent across dashboard sections (bills/recent didn't follow the selected month). Make the data layer month-aware from the start.
- Two icon libraries (FontAwesome + lucide). Pick one.
- Large page files mixing data fetching, types, and layout. Separate concerns.

## Stack & credentials

- **Next.js 16.2.7** (App Router, Turbopack), **React 19.2.4**, **TypeScript 5** (strict).
- **Tailwind CSS 3.4.19** — v3 stack: CSS-variable HSL tokens (dark default), `tailwindcss-animate`, `cn()` = `twMerge(clsx())`.
- **shadcn/ui** (Radix Dialog/Label/Slot, class-variance-authority), **lucide-react** and/or **@fortawesome/free-solid-svg-icons**.
- **recharts 3** for charts; **date-fns 4** with the pt-BR locale.
- **Supabase** (auth + Postgres + RLS) via `@supabase/ssr` + `@supabase/supabase-js`.
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL=https://axvypezaotgftuoinhmr.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4dnlwZXphb3RnZnR1b2luaG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjE1NDcsImV4cCI6MjA5NjUzNzU0N30.TWXl0NjqTPHnTRz3cWyxRbrLVKG_eH11AxTAP9LvA9M`
- There are **no other API keys**. The service-role key must never be used client-side.
- This Next.js version has breaking changes: read `node_modules/next/dist/docs/` before writing code. Turbopack is case-sensitive on Windows.

## Must-have behaviors (acceptance criteria)

1. Auth: sign up/in with email, password reset, protected routes, logout.
2. Workspace: create/select/switch; personal vs business mode.
3. Dashboard (mobile + desktop), scoped to the selected month:
   - Hero: month nav, eye toggle (hide values), total balance, monthly income, monthly expense, net of the period, gross margin (business).
   - Account strip/cards with current balance per caixa.
   - Bills alert: overdue, upcoming this month, next-month total.
   - Gastos por categoria: top 5 + an "Outros" aggregation so percentages sum to 100.
   - Recent transactions (5).
4. Transactions: month-scoped list, filters (type/category/caixa/method/search), sort, insights (mom %), CSV export, add/edit/delete modals, duplicate detection.
5. Bills: month-scoped, the 4 types, paid toggle → optional expense transaction, overdue/due-soon highlighting.
6. Reports (business only): DRE by category + cash-flow forecast (forecast_incomes + future bills), 30/60/90 days.
7. Settings: manage caixas, categories, payment methods, workspace info, appearance (theme), subscription stub.
8. Viewer role: reads everything, no write controls anywhere.
9. Dark by default, light toggle, no FOUC; pt-BR locale.
10. Business tax estimate = 15% of monthly revenue.
11. Month navigation is coherent everywhere.

## Non-goals for this rebuild

Budgets, CSV import of bank statements, email bill reminders, PDF reports, multi-currency, a React Native app, avatar upload/storage. Leave room in the schema but don't build them.

## Theme & icon rules (lessons from the previous version)

- Keep solid-colored buttons' text **white in both themes** (red/green/amber backgrounds) — never map those to `text-foreground`.
- The dark palette must map 1:1 to the app's original zinc look — dark mode should look identical to the old app.
- Opacity modifiers on HSL tokens work (`bg-card/50`), but never chain double opacities.
