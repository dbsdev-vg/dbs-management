-- ============================================================================
-- Phase 0 — Security & data integrity (v2, RLS-reviewed)
-- ============================================================================
-- Applies to: Supabase SQL editor (paste & run) or `supabase db push`.
-- Wrapped in an explicit transaction: if anything fails, everything rolls back.
--
-- What this fixes:
--   1. Broken `transactions` INSERT policy (self-referential tautology) that
--      let any authenticated user write into ANY workspace.
--   2. `user_workspaces` INSERT escalation — anyone could add themselves as
--      `owner` of any workspace.
--   3. `profiles` self-service plan upgrade (client could set any plan).
--   4. `payment_methods` policies that let `viewer` write.
--   5. Missing `forecast_incomes` table — `app/(protected)/reports` depends on it.
--   6. `caixas.current_balance` was never kept in sync with transactions.
--   7. `workspaces` never recorded who created them (needed for #2).
--   8. New users never got a `profiles` row (no trigger on `auth.users`).
--
-- DESIGN NOTES (RLS):
--   * Policies NEVER self-reference the table they guard. Membership checks go
--     through SECURITY DEFINER helpers (`is_workspace_member`,
--     `has_workspace_role`, `shares_workspace_with`) that run as the table owner
--     (bypassing RLS), which avoids the
--     "infinite recursion detected in policy for relation ..." error and keeps
--     the permission logic in one place.
--   * SECURITY DEFINER helper functions get EXECUTE revoked from PUBLIC and
--     granted only to `authenticated` + `service_role`. Trigger-only functions
--     get EXECUTE revoked entirely (triggers do not re-check EXECUTE at fire time).
--   * Workspace creation is centralized in a SECURITY DEFINER RPC
--     `create_workspace(name, type)`. Direct `workspaces`/`user_workspaces`
--     INSERTs from the client are DENIED (no INSERT policy). The app must call
--     `create_workspace` instead of the old two-step insert. This removes the
--     dependency on `created_by` being populated by `auth.uid()` at the moment
--     of a client insert (see #7/#9).
-- ============================================================================

begin;

-- ============================================================================
-- 0. RLS enablement (explicit, idempotent)
-- ============================================================================

alter table public.workspaces         enable row level security;
alter table public.user_workspaces    enable row level security;
alter table public.transactions       enable row level security;
alter table public.payment_methods    enable row level security;
alter table public.profiles           enable row level security;

-- ============================================================================
-- 1. Membership helpers (SECURITY DEFINER — must exist before any policy)
-- ============================================================================

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_workspaces uw
    where uw.workspace_id = p_workspace_id
      and uw.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_workspaces uw
    where uw.workspace_id = p_workspace_id
      and uw.user_id = auth.uid()
      and uw.role = any (p_roles)
  );
$$;

-- Does the current user share a workspace with p_user_id? Used by the
-- `profiles` SELECT policy so member names/emails render.
create or replace function public.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_workspaces mine
    join public.user_workspaces theirs
      on mine.workspace_id = theirs.workspace_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

revoke execute on function public.has_workspace_role(uuid, text[]) from public, anon;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated, service_role;

revoke execute on function public.shares_workspace_with(uuid) from public, anon;
grant execute on function public.shares_workspace_with(uuid) to authenticated, service_role;

-- ============================================================================
-- 2. workspaces: record the creator + centralized creation RPC
-- ============================================================================

alter table public.workspaces
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Backfill: the oldest `owner` is presumed to be the creator.
update public.workspaces w
set created_by = (
  select uw.user_id
  from public.user_workspaces uw
  where uw.workspace_id = w.id and uw.role = 'owner'
  order by uw.joined_at asc nulls last
  limit 1
)
where created_by is null;

-- Belt-and-suspenders: stamp created_by at insert time if the caller omitted it.
-- (Not the primary mechanism — `create_workspace` sets it explicitly — but it
-- removes the fragility of a column DEFAULT that calls auth.uid().)
create or replace function public.set_workspace_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_workspace_created_by on public.workspaces;
create trigger trg_set_workspace_created_by
  before insert on public.workspaces
  for each row execute function public.set_workspace_created_by();

-- Single, atomic creation path: workspace + owner membership in one transaction.
-- SECURITY DEFINER: this function must be owned by a role that bypasses RLS
-- (typically `postgres` in Supabase), because it inserts into `workspaces` and
-- `user_workspaces`, which intentionally have NO INSERT policies.
create or replace function public.create_workspace(p_name text, p_type text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'workspace name is required';
  end if;
  if length(btrim(p_name)) > 100 then
    raise exception 'workspace name must be at most 100 characters';
  end if;
  if p_type not in ('personal', 'business') then
    raise exception 'invalid workspace type';
  end if;

  insert into public.workspaces (name, type, created_by)
  values (btrim(p_name), p_type, v_uid)
  returning id into v_id;

  insert into public.user_workspaces (user_id, workspace_id, role)
  values (v_uid, v_id, 'owner');

  return v_id;
end;
$$;

revoke execute on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated, service_role;

-- ============================================================================
-- 3. workspaces: rebuild policies. No INSERT policy — creation goes via RPC.
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'workspaces'
  loop
    execute format('drop policy %I on public.workspaces', r.policyname);
  end loop;
end $$;

create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_update_owner_editor" on public.workspaces
  for update using (public.has_workspace_role(id, array['owner','editor']))
  with check (public.has_workspace_role(id, array['owner','editor']));

create policy "workspaces_delete_owner" on public.workspaces
  for delete using (public.has_workspace_role(id, array['owner']));

-- ============================================================================
-- 4. user_workspaces: rebuild policies. No INSERT policy — the RPC adds the
--    owner row. All membership lookups go through the helpers (no recursion).
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_workspaces'
  loop
    execute format('drop policy %I on public.user_workspaces', r.policyname);
  end loop;
end $$;

-- A member can see every membership row of workspaces they belong to
-- (the app lists all members of a workspace).
create policy "uw_select_members" on public.user_workspaces
  for select using (public.is_workspace_member(workspace_id));

create policy "uw_update_owner" on public.user_workspaces
  for update using (public.has_workspace_role(workspace_id, array['owner']))
  with check (public.has_workspace_role(workspace_id, array['owner']));

create policy "uw_delete_owner" on public.user_workspaces
  for delete using (public.has_workspace_role(workspace_id, array['owner']));

-- A user may always remove themselves from a workspace.
create policy "uw_delete_self" on public.user_workspaces
  for delete using (user_id = auth.uid());

-- ============================================================================
-- 5. transactions: replace ALL INSERT policies (one is the broken tautology).
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'transactions' and p.polcmd = 'a'
  loop
    execute format('drop policy %I on public.transactions', r.policyname);
  end loop;
end $$;

-- Single correct INSERT policy: owner/editor of the SAME workspace.
create policy "transactions_insert_owner_editor" on public.transactions
  for insert with check (public.has_workspace_role(workspace_id, array['owner','editor']));

-- ============================================================================
-- 6. payment_methods: viewers should not write
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'payment_methods'
  loop
    execute format('drop policy %I on public.payment_methods', r.policyname);
  end loop;
end $$;

create policy "payment_methods_select_member" on public.payment_methods
  for select using (public.is_workspace_member(workspace_id));

create policy "payment_methods_insert_owner_editor" on public.payment_methods
  for insert with check (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "payment_methods_update_owner_editor" on public.payment_methods
  for update using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "payment_methods_delete_owner_editor" on public.payment_methods
  for delete using (public.has_workspace_role(workspace_id, array['owner','editor']));

-- ============================================================================
-- 7. profiles: lock plan changes, allow member-name lookups, auto-create rows
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', r.policyname);
  end loop;
end $$;

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- You can read your own profile and the profiles of people who share a
-- workspace with you (this is what makes member names render instead of UUIDs).
create policy "profiles_select_self_and_workspace_members" on public.profiles
  for select using (id = auth.uid() or public.shares_workspace_with(id));

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Block self-service plan changes at the DB level. Only the service role
-- (server-side) may change `plan`.
create or replace function public.prevent_plan_self_upgrade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan and auth.role() <> 'service_role' then
    raise exception 'plan can only be changed by the server';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_plan on public.profiles;
create trigger trg_protect_plan
  before update on public.profiles
  for each row execute function public.prevent_plan_self_upgrade();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that predate the trigger.
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ============================================================================
-- 8. forecast_incomes: the table the reports page already queries
-- ============================================================================

create table if not exists public.forecast_incomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists forecast_incomes_workspace_date_idx
  on public.forecast_incomes (workspace_id, date);

alter table public.forecast_incomes enable row level security;

create policy "forecast_incomes_select_member" on public.forecast_incomes
  for select using (public.is_workspace_member(workspace_id));

create policy "forecast_incomes_insert_owner_editor" on public.forecast_incomes
  for insert with check (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "forecast_incomes_update_owner_editor" on public.forecast_incomes
  for update using (public.has_workspace_role(workspace_id, array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, array['owner','editor']));

create policy "forecast_incomes_delete_owner_editor" on public.forecast_incomes
  for delete using (public.has_workspace_role(workspace_id, array['owner','editor']));

-- ============================================================================
-- 9. caixas: keep current_balance in sync automatically
-- ============================================================================

create index if not exists transactions_caixa_id_idx on public.transactions (caixa_id);

-- Recompute a single caixa's balance from its transactions (the source of truth).
create or replace function public.recompute_caixa_balance(p_caixa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.caixas c
  set current_balance = c.initial_balance + coalesce((
    select sum(case when t.type = 'income' then t.amount else -t.amount end)
    from public.transactions t
    where t.caixa_id = c.id
  ), 0)
  where c.id = p_caixa_id;
end;
$$;

-- Keep the column in sync when transactions change. NULL caixa_id (future
-- credit-card purchases) is a no-op and skipped.
create or replace function public.sync_caixa_balance_tx()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caixa_id uuid;
begin
  if tg_op = 'UPDATE' and old.caixa_id is distinct from new.caixa_id then
    if old.caixa_id is not null then
      perform public.recompute_caixa_balance(old.caixa_id);
    end if;
    if new.caixa_id is not null then
      perform public.recompute_caixa_balance(new.caixa_id);
    end if;
  else
    v_caixa_id := coalesce(new.caixa_id, old.caixa_id);
    if v_caixa_id is not null then
      perform public.recompute_caixa_balance(v_caixa_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_caixa_balance on public.transactions;
create trigger trg_sync_caixa_balance
  after insert or update or delete on public.transactions
  for each row execute function public.sync_caixa_balance_tx();

-- Keep the column in sync when the opening balance is edited.
create or replace function public.sync_caixa_balance_initial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_caixa_balance(new.id);
  return new;
end;
$$;

drop trigger if exists trg_sync_caixa_balance_initial on public.caixas;
create trigger trg_sync_caixa_balance_initial
  after insert or update of initial_balance on public.caixas
  for each row execute function public.sync_caixa_balance_initial();

-- Authoritative computed view (the column is kept for existing reads).
create or replace view public.caixa_balances
with (security_invoker = true) as
select
  c.id,
  c.workspace_id,
  c.name,
  c.type,
  c.initial_balance,
  c.initial_balance + coalesce(
    sum(case when t.type = 'income' then t.amount else -t.amount end),
    0
  ) as current_balance
from public.caixas c
left join public.transactions t on t.caixa_id = c.id
group by c.id, c.workspace_id, c.name, c.type, c.initial_balance;

-- Repair any drift that already exists in the column.
do $$
declare r record;
begin
  for r in select id from public.caixas loop
    perform public.recompute_caixa_balance(r.id);
  end loop;
end $$;

-- ============================================================================
-- 10. Lock down EXECUTE on the trigger-only SECURITY DEFINER functions.
--     (The membership helpers and `create_workspace` were granted/revoked in
--     their own sections. Triggers do not re-check EXECUTE at fire time.)
-- ============================================================================

revoke execute on function public.set_workspace_created_by() from public, anon;
revoke execute on function public.prevent_plan_self_upgrade() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.recompute_caixa_balance(uuid) from public, anon;
revoke execute on function public.sync_caixa_balance_tx() from public, anon;
revoke execute on function public.sync_caixa_balance_initial() from public, anon;

commit;
