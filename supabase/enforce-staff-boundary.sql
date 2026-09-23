-- Preserve an in-database recovery snapshot before removing legacy public access.
begin;
create schema if not exists pos_backups;
revoke all on schema pos_backups from public, anon, authenticated;
create table if not exists pos_backups.before_staff_access (
  table_name text not null, row_id text not null, row_data jsonb not null,
  captured_at timestamptz not null default now(), primary key(table_name,row_id)
);
alter table pos_backups.before_staff_access enable row level security;
revoke all on pos_backups.before_staff_access from public, anon, authenticated;
do $$
declare t text; n bigint; captured bigint;
begin
  if not exists(select 1 from auth.users where raw_app_meta_data->>'role'='ADMIN' and email_confirmed_at is not null) then raise exception 'Confirmed administrator required'; end if;
  foreach t in array array['items','categories','sales','customers','customer_requests'] loop
    execute format('lock table public.%I in share row exclusive mode',t);
    execute format('insert into pos_backups.before_staff_access(table_name,row_id,row_data) select %L,id,to_jsonb(r) from public.%I r on conflict(table_name,row_id) do update set row_data=excluded.row_data,captured_at=now()',t,t);
    execute format('select count(*) from public.%I',t) into n;
    execute format('select count(*) from public.%I r join pos_backups.before_staff_access b on b.table_name=%L and b.row_id=r.id and b.row_data=to_jsonb(r)',t,t) into captured;
    if captured<>n then raise exception 'Snapshot verification failed for %',t; end if;
    -- Keep the already-tested authenticated ADMIN policies unchanged.
    execute format('revoke all on public.%I from anon',t);
    execute format('revoke truncate, references, trigger on public.%I from authenticated',t);
  end loop;
end $$;
drop policy if exists "anon can upload item images" on storage.objects;
commit;
