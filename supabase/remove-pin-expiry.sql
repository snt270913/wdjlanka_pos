begin;
alter table public.pos_pin_devices alter column expires_at drop not null;
alter table public.pos_pin_devices alter column expires_at drop default;
update public.pos_pin_devices set expires_at = null where expires_at is not null;
create or replace function public.pos_claim_pin(p_id uuid,p_proof text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.pos_pin_devices;
begin
  select * into d from public.pos_pin_devices where id=p_id for update;
  if not found or d.attempts >= 5 then return jsonb_build_object('ok',false); end if;
  if extensions.crypt(p_proof,d.verifier) <> d.verifier then
    update public.pos_pin_devices set attempts=attempts+1 where id=p_id;
    return jsonb_build_object('ok',false);
  end if;
  update public.pos_pin_devices set attempts=0 where id=p_id;
  return jsonb_build_object('ok',true,'user_id',d.user_id);
end $$;

commit;
