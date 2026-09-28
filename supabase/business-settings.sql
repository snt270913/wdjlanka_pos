create table if not exists public.pos_business_settings (
 id integer primary key check (id = 1), data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.pos_business_settings enable row level security;
revoke all on public.pos_business_settings from anon, authenticated;
grant all on public.pos_business_settings to service_role;
