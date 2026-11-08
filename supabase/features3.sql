-- Biryani Darbaar: in-app notifications. Run AFTER features2.sql. Safe to re-run.

-- Outlet phone numbers (fictional demo data). Harmless if already added.
alter table outlets add column if not exists phone text;
update outlets set phone = case name
  when 'Kondapur' then '9000000111'
  when 'Kukatpally' then '9000000222'
  when 'Gachibowli Cloud Kitchen' then '9000000333'
  else phone end
where phone is null;

create table if not exists inbox (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('party','ticket','order')),
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists inbox_user_idx on inbox (user_id, created_at desc);
alter table inbox enable row level security;

-- People can read only their own notifications. Rows are written only by the triggers below.
drop policy if exists "read own inbox" on inbox;
create policy "read own inbox" on inbox for select using (user_id = auth.uid());

create or replace function inbox_mark_read(p_ids bigint[], p_kind text)
returns void language sql security definer set search_path = public as $$
  update inbox set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any(p_ids))
     and (p_kind is null or kind = p_kind);
$$;
revoke execute on function inbox_mark_read(bigint[], text) from public, anon;
grant execute on function inbox_mark_read(bigint[], text) to authenticated;

-- New party request -> every admin
create or replace function inbox_party_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare cname text; oname text;
begin
  select full_name into cname from profiles where id = new.customer_id;
  select name into oname from outlets where id = new.outlet_id;
  insert into inbox (user_id, kind, title, body, link)
  select p.id, 'party', 'New party request',
         coalesce(nullif(cname, ''), 'A customer') || ' · ' || new.guests || ' guests · ' || coalesce(oname, ''),
         '/admin/party'
    from profiles p where p.role = 'admin';
  return new;
end $$;
drop trigger if exists party_inbox_new on party_orders;
create trigger party_inbox_new after insert on party_orders
  for each row execute function inbox_party_new();

-- Party decision -> the customer
create or replace function inbox_party_decided() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('confirmed', 'declined')
     and (new.status is distinct from old.status or new.manager_note is distinct from old.manager_note) then
    insert into inbox (user_id, kind, title, body, link)
    values (new.customer_id, 'party',
            case new.status when 'confirmed' then 'Your party request is confirmed'
                            else 'Your party request was declined' end,
            coalesce(new.manager_note, 'Open Party to see the details and contact the outlet.'),
            '/party');
  end if;
  return new;
end $$;
drop trigger if exists party_inbox_decided on party_orders;
create trigger party_inbox_decided after update on party_orders
  for each row execute function inbox_party_decided();

-- New customer issue -> all admins and the kitchen of that outlet
create or replace function inbox_ticket_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare ono text;
begin
  select order_no into ono from orders where id = new.order_id;
  insert into inbox (user_id, kind, title, body, link)
  select p.id, 'ticket', 'New customer issue',
         replace(new.category, '_', ' ') || coalesce(' · order ' || ono, '') || ': ' || left(new.message, 80),
         '/staff/issues'
    from profiles p
   where p.role = 'admin' or (p.role = 'kitchen' and p.outlet_id = new.outlet_id);
  return new;
end $$;
drop trigger if exists ticket_inbox_new on support_tickets;
create trigger ticket_inbox_new after insert on support_tickets
  for each row execute function inbox_ticket_new();

-- Staff reply or status change on an issue -> the customer
create or replace function inbox_ticket_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare ono text;
begin
  if new.staff_reply is distinct from old.staff_reply or new.status is distinct from old.status then
    select order_no into ono from orders where id = new.order_id;
    insert into inbox (user_id, kind, title, body, link)
    values (new.customer_id, 'ticket',
            case when new.status = 'resolved' then 'Your issue was resolved' else 'Update on your issue' end,
            coalesce(left(new.staff_reply, 100), 'Tap to see the details'),
            case when ono is not null then '/order/' || ono else '/orders' end);
  end if;
  return new;
end $$;
drop trigger if exists ticket_inbox_update on support_tickets;
create trigger ticket_inbox_update after update on support_tickets
  for each row execute function inbox_ticket_update();

-- Order progress -> the customer
create or replace function inbox_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if new.customer_id is null then return new; end if;
  if new.status is distinct from old.status then
    t := case new.status
      when 'preparing'  then 'Your order is being prepared'
      when 'ready'      then 'Your order is ready'
      when 'handed_off' then 'Your order is out for delivery'
      when 'delivered'  then 'Delivered. Enjoy your meal!'
      when 'cancelled'  then 'Your order was cancelled'
    end;
    if t is not null then
      insert into inbox (user_id, kind, title, body, link)
      values (new.customer_id, 'order', t, 'Order ' || new.order_no, '/order/' || new.order_no);
    end if;
  end if;
  if new.promised_at > old.promised_at then
    insert into inbox (user_id, kind, title, body, link)
    values (new.customer_id, 'order', 'Your order needs a little longer',
            'Order ' || new.order_no || ': new time ' ||
            to_char(new.promised_at at time zone 'Asia/Kolkata', 'HH12:MI AM'),
            '/order/' || new.order_no);
  end if;
  return new;
end $$;
drop trigger if exists orders_inbox on orders;
create trigger orders_inbox after update on orders
  for each row execute function inbox_order_status();

create or replace function cancel_my_order(p_order_no text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  select * into o from orders where order_no = p_order_no and customer_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status <> 'placed' then
    raise exception 'The kitchen has already started this order, so it can no longer be cancelled';
  end if;
  update orders
     set status = 'cancelled',
         payment_status = case when payment_status = 'paid' then 'refunded' else payment_status end
   where id = o.id;
  insert into order_events (order_id, status) values (o.id, 'cancelled');
end $$;
revoke execute on function cancel_my_order(text) from public, anon;
grant execute on function cancel_my_order(text) to authenticated;