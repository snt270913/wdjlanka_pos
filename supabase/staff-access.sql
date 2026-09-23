-- Access records are available only to the authenticated server function.
create table if not exists public.pos_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  name text not null,
  permissions text[] not null default array['inventory'],
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.pos_pin_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  verifier text not null,
  attempts integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pos_pin_devices_user on public.pos_pin_devices(user_id);
create table if not exists public.pos_staff_checkouts (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.pos_staff enable row level security;
alter table public.pos_pin_devices enable row level security;
alter table public.pos_staff_checkouts enable row level security;
revoke all on public.pos_staff, public.pos_pin_devices, public.pos_staff_checkouts from public, anon, authenticated;
grant all on public.pos_staff, public.pos_pin_devices, public.pos_staff_checkouts to service_role;

create or replace function public.pos_enroll_pin(p_id uuid,p_user uuid,p_name text,p_proof text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select count(*) from public.pos_pin_devices where user_id=p_user) >= 10 then
    raise exception 'Remove an old PIN device before registering another';
  end if;
  insert into public.pos_pin_devices(id,user_id,name,verifier)
  values(p_id,p_user,left(p_name,80),extensions.crypt(p_proof,extensions.gen_salt('bf',12)));
end $$;
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
revoke all on function public.pos_enroll_pin(uuid,uuid,text,text),public.pos_claim_pin(uuid,text) from public,anon,authenticated;
grant execute on function public.pos_enroll_pin(uuid,uuid,text,text),public.pos_claim_pin(uuid,text) to service_role;

create or replace function public.pos_staff_checkout(p_user uuid,p_request uuid,p_lines jsonb,p_name text,p_phone text,p_note text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  staff public.pos_staff; previous public.pos_staff_checkouts;
  line jsonb; item jsonb; cust jsonb; sale jsonb; result jsonb:='[]';
  stock integer; qty integer; discount numeric; amount numeric; cost numeric;
  customer_id text; total numeric:=0; codes jsonb:='[]'; sequence integer:=0;
begin
  select * into staff from public.pos_staff where user_id=p_user and active;
  if not found or not ('sell'=any(staff.permissions)) then raise exception 'Sales access is not permitted'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
  select * into previous from public.pos_staff_checkouts where request_id=p_request;
  if found then
    if previous.user_id<>p_user then raise exception 'Request is not permitted'; end if;
    return previous.result;
  end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid cart'; end if;
  if (select count(distinct e->>'itemId') from jsonb_array_elements(p_lines) e) <> jsonb_array_length(p_lines) then raise exception 'Duplicate cart items'; end if;
  perform pg_advisory_xact_lock(hashtextextended('customer:'||coalesce(nullif(trim(p_phone),''),p_request::text),0));
  select id,data into customer_id,cust from public.customers where nullif(trim(p_phone),'') is not null and data->>'phone'=trim(p_phone) limit 1 for update;
  if not found then
    customer_id:='cust-'||gen_random_uuid()::text;
    cust:=jsonb_build_object('id',customer_id,'name',coalesce(nullif(trim(p_name),''),'Walk-in Customer'),'phone',coalesce(nullif(trim(p_phone),''),'N/A'),'dateAdded',current_date,'purchases','[]'::jsonb,'totalSpent',0);
  end if;
  for line in select e from jsonb_array_elements(p_lines) e order by e->>'itemId' loop
    select data,quantity into item,stock from public.items where id=line->>'itemId' for update;
    if not found then raise exception 'An item no longer exists'; end if;
    qty:=(line->>'quantity')::integer; discount:=coalesce((line->>'discount')::numeric,0);
    if qty is null or qty < 1 or qty>stock or item->>'status'<>'AVAILABLE' then raise exception 'Item is unavailable or stock has changed'; end if;
    if discount<0 or discount>coalesce((item->>'maxDiscount')::numeric,0)*qty or discount>(item->>'sellingPrice')::numeric*qty then raise exception 'Discount exceeds the allowed limit'; end if;
    amount:=(item->>'sellingPrice')::numeric*qty-discount; cost:=coalesce((item->>'costPrice')::numeric,0)*qty;
    if amount is null or amount<0 then raise exception 'Invalid item price'; end if;
    sale:=jsonb_build_object('id','sale-'||p_request::text||'-'||sequence,'itemId',item->>'id','itemCode',item->>'code','itemName',item->>'name','categoryId',item->>'categoryId','categoryName',item->>'categoryName','originalPrice',amount+discount,'soldPrice',amount,'discount',discount,'quantity',qty,'cost',cost,'profit',amount-cost,'customerId',customer_id,'customerName',cust->>'name','customerPhone',cust->>'phone','employeeId',p_user,'employeeName',staff.name,'saleDate',now(),'note',left(p_note,2000));
    insert into public.sales(id,data) values(sale->>'id',sale);
    item:=item||jsonb_build_object('quantity',stock-qty,'dateUpdated',now());
    if stock=qty then item:=item||jsonb_build_object('status','SOLD','soldDate',current_date,'soldPrice',amount,'soldDiscount',discount,'soldCustomerId',customer_id,'soldCustomerName',cust->>'name','soldCustomerPhone',cust->>'phone','soldEmployeeId',p_user,'soldEmployeeName',staff.name); end if;
    update public.items set data=item,quantity=stock-qty,updated_at=now() where id=line->>'itemId';
    result:=result||jsonb_build_array(sale); total:=total+amount;
    for n in 1..qty loop codes:=codes||jsonb_build_array(item->>'code'); end loop;
    sequence:=sequence+1;
  end loop;
  cust:=cust||jsonb_build_object('purchases',coalesce(cust->'purchases','[]'::jsonb)||codes,'totalSpent',coalesce((cust->>'totalSpent')::numeric,0)+total,'lastPurchaseDate',now());
  insert into public.customers(id,data) values(customer_id,cust) on conflict(id) do update set data=excluded.data,updated_at=now();
  insert into public.pos_staff_checkouts(request_id,user_id,result) values(p_request,p_user,result);
  return result;
end $$;
revoke all on function public.pos_staff_checkout(uuid,uuid,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.pos_staff_checkout(uuid,uuid,jsonb,text,text,text) to service_role;
