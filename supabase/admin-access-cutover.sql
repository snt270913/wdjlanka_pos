-- Run only after backup verification and successful admin login on the preview.
-- This transaction refuses to lock down the database before an admin exists.
begin;
do $$
begin
  if not exists (select 1 from auth.users where raw_app_meta_data->>'role' = 'ADMIN' and email_confirmed_at is not null) then
    raise exception 'Create and verify the intended admin account before cutover';
  end if;
end $$;

do $$
declare t text; p record;
begin
  foreach t in array array['items','categories','sales','customers','customer_requests'] loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format($policy$create policy "POS admin access" on public.%I for all to authenticated
      using ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')
      with check ((select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN')$policy$,t);
  end loop;
end $$;

drop policy if exists "anon can upload item images" on storage.objects;
drop policy if exists "POS admin upload item images" on storage.objects;
create policy "POS admin upload item images" on storage.objects for insert to authenticated
with check (bucket_id = 'item-images' and (select auth.uid()) is not null and (select auth.jwt())->'app_metadata'->>'role' = 'ADMIN');
-- Existing public product-image reads remain supported; no customer data is in this bucket.
commit;
