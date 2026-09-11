-- WDJLANKA cloud data contract.
-- Each domain record is kept in JSONB so the existing TypeScript models remain the source of truth.
create table if not exists public.items (
  id text primary key,
  data jsonb not null,
  quantity integer not null default 1 check (quantity >= 0),
  updated_at timestamptz not null default now()
);
alter table public.items add column if not exists quantity integer not null default 1;
create table if not exists public.categories (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.sales (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.customer_requests (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;
alter table public.categories enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;
alter table public.customer_requests enable row level security;

-- Server-managed app metadata is required; user metadata must never grant access.
revoke all on public.items from anon, authenticated;
grant select, insert, update, delete on public.items to authenticated;
create policy "POS admin access" on public.items for all to authenticated
using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
revoke all on public.categories from anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
create policy "POS admin access" on public.categories for all to authenticated
using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
revoke all on public.sales from anon, authenticated;
grant select, insert, update, delete on public.sales to authenticated;
create policy "POS admin access" on public.sales for all to authenticated
using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
revoke all on public.customers from anon, authenticated;
grant select, insert, update, delete on public.customers to authenticated;
create policy "POS admin access" on public.customers for all to authenticated
using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
revoke all on public.customer_requests from anon, authenticated;
grant select, insert, update, delete on public.customer_requests to authenticated;
create policy "POS admin access" on public.customer_requests for all to authenticated
using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "POS admin upload item images" on storage.objects for insert to authenticated with check (bucket_id = 'item-images' and (select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
create policy "public can view item images" on storage.objects for select to public using (bucket_id = 'item-images');
