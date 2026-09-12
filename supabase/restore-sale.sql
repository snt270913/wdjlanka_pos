-- Restore one complete sale line once, preserving its original audit record.
create or replace function public.restore_pos_sale(p_sale_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  s jsonb; i jsonb; c jsonb; stock integer; units integer;
  customer_key text; purchases jsonb; code text; removed integer := 0;
begin
  if auth.uid() is null or (auth.jwt()->'app_metadata'->>'role') is distinct from 'ADMIN' then
    raise exception 'Administrator access is required';
  end if;
  select data into s from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if s->>'restoredAt' is not null then raise exception 'This sale has already been restored'; end if;
  units := coalesce((s->>'quantity')::integer,1);
  if units < 1 then raise exception 'Invalid sale quantity'; end if;
  select data,quantity into i,stock from public.items where id=s->>'itemId' for update;
  if not found then raise exception 'Item no longer exists'; end if;
  if i->>'status'='DELETED' then raise exception 'Restore the item from the recycle bin first'; end if;
  -- Older single-item sales left quantity at one even when marked sold.
  stock := case when i->>'status'='SOLD' then 0 else stock end;
  i := (i - array['soldDate','soldPrice','soldDiscount','soldCustomerId','soldCustomerName','soldCustomerPhone','soldEmployeeId','soldEmployeeName','soldNote'])
    || jsonb_build_object('quantity',stock+units,'status','AVAILABLE','dateUpdated',now());
  s := s || jsonb_build_object('restoredAt',now(),'restoredBy',auth.uid());
  update public.items set data=i,quantity=stock+units,updated_at=now() where id=s->>'itemId';
  update public.sales set data=s,updated_at=now() where id=p_sale_id;
  customer_key := s->>'customerId';
  select data into c from public.customers where id=customer_key for update;
  if found then
    purchases := '[]'::jsonb;
    for code in select jsonb_array_elements_text(coalesce(c->'purchases','[]'::jsonb)) loop
      if code=s->>'itemCode' and removed < units then removed := removed+1;
      else purchases := purchases || jsonb_build_array(code); end if;
    end loop;
    c := c || jsonb_build_object('purchases',purchases,'totalSpent',greatest(0,coalesce((c->>'totalSpent')::numeric,0)-coalesce((s->>'soldPrice')::numeric,0)),
      'lastPurchaseDate',(select max(data->>'saleDate') from public.sales where data->>'customerId'=customer_key and data->>'restoredAt' is null));
    update public.customers set data=c,updated_at=now() where id=customer_key;
  end if;
  return jsonb_build_object('item',i,'sale',s,'customer',c);
end $$;
revoke all on function public.restore_pos_sale(text) from public,anon;
grant execute on function public.restore_pos_sale(text) to authenticated;
