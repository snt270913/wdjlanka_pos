-- WDJLANKA cloud data contract.
-- Each domain record is kept in JSONB so the existing TypeScript models remain the source of truth.
create table if not exists public.items (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
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

-- Replace these permissive policies with authenticated admin policies before production launch.
create policy "anon can manage items" on public.items for all to anon using (true) with check (true);
create policy "anon can manage categories" on public.categories for all to anon using (true) with check (true);
create policy "anon can manage sales" on public.sales for all to anon using (true) with check (true);
create policy "anon can manage customers" on public.customers for all to anon using (true) with check (true);
create policy "anon can manage customer requests" on public.customer_requests for all to anon using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "anon can upload item images" on storage.objects for insert to anon with check (bucket_id = 'item-images');
create policy "public can view item images" on storage.objects for select to public using (bucket_id = 'item-images');
