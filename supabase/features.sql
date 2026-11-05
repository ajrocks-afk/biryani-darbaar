-- Biryani Darbaar: feature scripts. Run AFTER schema.sql and seed.sql.
-- Safe to re-run: every statement uses IF NOT EXISTS, CREATE OR REPLACE or DROP ... IF EXISTS.
--
-- NOT in this file (see supabase/rls.sql): Row Level Security policies for the core tables
-- (outlets, menu, orders, ...) and the Realtime publication for the orders table.

------------------------------------------------------------------------------
-- 1. Orders: extra columns and the delivered status
------------------------------------------------------------------------------
alter table orders add column if not exists payment_provider text;
alter table orders add column if not exists points_redeemed int not null default 0;

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('placed','preparing','ready','handed_off','delivered','cancelled'));

------------------------------------------------------------------------------
-- 2. Reward coupons (scratch cards). Accessed only by server actions (service role),
--    so RLS is on with no policies.
------------------------------------------------------------------------------
create table if not exists user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  percent_off int not null,
  max_discount_inr int not null,
  min_order_inr int not null default 0,
  expires_at timestamptz not null,
  scratched boolean not null default false,
  used boolean not null default false,
  source_order_no text,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);
alter table user_coupons enable row level security;

------------------------------------------------------------------------------
-- 3. Sign-ups: every new account is a CUSTOMER. Marketing opt-in is stored with a timestamp.
------------------------------------------------------------------------------
alter table profiles add column if not exists marketing_opt_in boolean not null default false;
alter table profiles add column if not exists marketing_opt_in_at timestamptz;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare opt boolean := coalesce(new.raw_user_meta_data->>'marketing_opt_in', '') = 'true';
begin
  insert into profiles (id, full_name, role, marketing_opt_in, marketing_opt_in_at)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
          'customer', opt, case when opt then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

------------------------------------------------------------------------------
-- 4. Demo WhatsApp/SMS log (RLS on, no policies: read only through the server)
------------------------------------------------------------------------------
create table if not exists notifications (
  id bigserial primary key,
  order_id uuid references orders on delete cascade,
  channel text not null default 'whatsapp (demo)',
  body text not null,
  created_at timestamptz default now()
);
alter table notifications enable row level security;

create or replace function log_order_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare msg text;
begin
  if new.status is distinct from old.status then
    msg := case new.status
      when 'preparing'  then 'Good news! Your order ' || new.order_no || ' is being prepared.'
      when 'ready'      then 'Your order ' || new.order_no || ' is ready and waiting for the rider.'
      when 'handed_off' then 'Your order ' || new.order_no || ' is out for delivery.'
      when 'delivered'  then 'Delivered! Enjoy your meal. Thank you for ordering direct.'
      when 'cancelled'  then 'Your order ' || new.order_no || ' was cancelled.'
    end;
    if msg is not null then
      insert into notifications (order_id, body) values (new.id, msg);
    end if;
  end if;
  if new.promised_at > old.promised_at then
    insert into notifications (order_id, body) values (new.id,
      'Sorry, your order ' || new.order_no || ' needs ' ||
      (round(extract(epoch from (new.promised_at - old.promised_at)) / 60))::int::text ||
      ' more minutes. New promised time: ' ||
      to_char(new.promised_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || '.');
  end if;
  return new;
end $$;

drop trigger if exists orders_notify on orders;
create trigger orders_notify after update on orders
  for each row execute function log_order_notification();

------------------------------------------------------------------------------
-- 5. Loyalty points
--    ASSUMPTIONS: 1 point per Rs 20 on delivery; 1 point = Rs 1 off; Silver (3+) x1.25 and
--    Gold (6+) x1.5 based on delivered orders in the last 90 days.
------------------------------------------------------------------------------
create table if not exists loyalty_ledger (
  id bigserial primary key,
  customer_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders on delete set null,
  points int not null,
  reason text not null check (reason in ('earn','redeem','adjust')),
  created_at timestamptz default now(),
  unique (order_id, reason)
);
alter table loyalty_ledger enable row level security;
drop policy if exists "own ledger" on loyalty_ledger;
create policy "own ledger" on loyalty_ledger for select using (customer_id = auth.uid());

create or replace function award_loyalty_points() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; mult numeric;
begin
  if new.customer_id is null then return new; end if;
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    select count(*) into n from orders
     where customer_id = new.customer_id and status = 'delivered'
       and placed_at >= now() - interval '90 days';
    mult := case when n >= 6 then 1.5 when n >= 3 then 1.25 else 1 end;
    insert into loyalty_ledger (customer_id, order_id, points, reason)
    values (new.customer_id, new.id, floor(new.total_inr / 20.0 * mult)::int, 'earn')
    on conflict (order_id, reason) do nothing;
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled'
        and new.points_redeemed > 0 then
    insert into loyalty_ledger (customer_id, order_id, points, reason)
    values (new.customer_id, new.id, new.points_redeemed, 'adjust')
    on conflict (order_id, reason) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists orders_loyalty on orders;
create trigger orders_loyalty after update on orders
  for each row execute function award_loyalty_points();

-- Spend points. Locks the customer row so two orders cannot spend the same points.
create or replace function redeem_points(p_user uuid, p_order uuid, p_points int)
returns void language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if p_points <= 0 then raise exception 'invalid points'; end if;
  perform 1 from profiles where id = p_user for update;
  select coalesce(sum(points), 0) into bal from loyalty_ledger where customer_id = p_user;
  if bal < p_points then raise exception 'insufficient points'; end if;
  insert into loyalty_ledger (customer_id, order_id, points, reason)
  values (p_user, p_order, -p_points, 'redeem');
end $$;
revoke execute on function redeem_points(uuid, uuid, int) from public, anon, authenticated;

create or replace function my_loyalty()
returns table (points int, delivered_90d int)
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(l.points) from loyalty_ledger l where l.customer_id = auth.uid()), 0)::int,
         (select count(*) from orders o where o.customer_id = auth.uid()
            and o.status = 'delivered' and o.placed_at >= now() - interval '90 days')::int;
$$;
revoke execute on function my_loyalty() from public, anon;
grant execute on function my_loyalty() to authenticated;

------------------------------------------------------------------------------
-- 6. Admin dashboard numbers (the admin check is inside the function)
------------------------------------------------------------------------------
create or replace function dashboard_stats(p_days int default 7)
returns table (
  outlet_id uuid, outlet_name text, orders_total bigint, cancelled bigint,
  avg_prep_minutes numeric, repeat_customers bigint, revenue_inr bigint
)
language sql stable security definer set search_path = public as $$
  select
    o.id, o.name,
    count(x.id),
    count(x.id) filter (where x.status = 'cancelled'),
    (select round(avg(extract(epoch from (e.at - y.placed_at)) / 60)::numeric, 1)
       from orders y join order_events e on e.order_id = y.id and e.status = 'ready'
      where y.outlet_id = o.id and y.placed_at >= now() - make_interval(days => p_days)),
    (select count(*) from (
        select z.customer_id from orders z
         where z.outlet_id = o.id and z.customer_id is not null and z.status <> 'cancelled'
           and z.placed_at >= now() - make_interval(days => p_days)
         group by z.customer_id having count(*) >= 2) r),
    coalesce(sum(x.total_inr) filter (where x.status <> 'cancelled'), 0)::bigint
  from outlets o
  left join orders x on x.outlet_id = o.id
       and x.placed_at >= now() - make_interval(days => p_days)
  where exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  group by o.id, o.name
  order by o.name;
$$;
revoke execute on function dashboard_stats(int) from public, anon;
grant execute on function dashboard_stats(int) to authenticated;

------------------------------------------------------------------------------
-- 7. Help requests (complaints)
------------------------------------------------------------------------------
create table if not exists support_tickets (
  id bigserial primary key,
  customer_id uuid not null references profiles(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  outlet_id uuid references outlets(id),
  category text not null check (category in
    ('late','missing_item','wrong_item','quality','packaging','payment','other')),
  message text not null check (char_length(message) between 5 and 500),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  staff_reply text check (char_length(staff_reply) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table support_tickets enable row level security;

drop policy if exists "customer reads own tickets" on support_tickets;
create policy "customer reads own tickets" on support_tickets
  for select using (customer_id = auth.uid());

drop policy if exists "staff read their tickets" on support_tickets;
create policy "staff read their tickets" on support_tickets for select using (
  exists (select 1 from profiles p where p.id = auth.uid()
    and (p.role = 'admin' or (p.role = 'kitchen' and p.outlet_id = support_tickets.outlet_id))));

-- Customers cannot write the table directly. This function takes the outlet from THEIR order.
create or replace function create_ticket(p_order_no text, p_category text, p_message text)
returns bigint language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; new_id bigint;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into o from orders where order_no = p_order_no and customer_id = auth.uid();
  if not found then raise exception 'order not found'; end if;
  if (select count(*) from support_tickets
       where customer_id = auth.uid() and status <> 'resolved') >= 5 then
    raise exception 'too many open tickets';
  end if;
  insert into support_tickets (customer_id, order_id, outlet_id, category, message)
  values (auth.uid(), o.id, o.outlet_id, p_category, trim(p_message))
  returning id into new_id;
  return new_id;
end $$;

-- Staff reply or status change. Kitchen: own outlet only. Admin: all outlets.
create or replace function update_ticket(p_id bigint, p_status text, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare t support_tickets%rowtype; me profiles%rowtype;
        rep text := nullif(trim(coalesce(p_reply, '')), '');
begin
  select * into me from profiles where id = auth.uid();
  select * into t from support_tickets where id = p_id;
  if not found then raise exception 'not found'; end if;
  if not (me.role = 'admin' or (me.role = 'kitchen' and me.outlet_id = t.outlet_id)) then
    raise exception 'not allowed';
  end if;
  if p_status not in ('open','in_progress','resolved') then raise exception 'bad status'; end if;
  update support_tickets
     set status = p_status,
         staff_reply = coalesce(rep, staff_reply),
         resolved_at = case when p_status = 'resolved' then now() else null end
   where id = p_id;
  if rep is not null and t.order_id is not null then
    insert into notifications (order_id, body)
    values (t.order_id, 'Reply from the outlet about your help request: ' || left(rep, 300));
  end if;
end $$;

revoke execute on function create_ticket(text, text, text) from public, anon;
revoke execute on function update_ticket(bigint, text, text) from public, anon;
grant execute on function create_ticket(text, text, text) to authenticated;
grant execute on function update_ticket(bigint, text, text) to authenticated;

------------------------------------------------------------------------------
-- 8. Optional ratings after delivery
------------------------------------------------------------------------------
create table if not exists order_reviews (
  order_id uuid primary key references orders(id) on delete cascade,
  customer_id uuid not null references profiles(id) on delete cascade,
  outlet_id uuid references outlets(id),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now()
);
alter table order_reviews enable row level security;

drop policy if exists "customer reads own reviews" on order_reviews;
create policy "customer reads own reviews" on order_reviews
  for select using (customer_id = auth.uid());

drop policy if exists "staff read their reviews" on order_reviews;
create policy "staff read their reviews" on order_reviews for select using (
  exists (select 1 from profiles p where p.id = auth.uid()
    and (p.role = 'admin' or (p.role = 'kitchen' and p.outlet_id = order_reviews.outlet_id))));

create or replace function submit_review(p_order_no text, p_rating int, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into o from orders
   where order_no = p_order_no and customer_id = auth.uid() and status = 'delivered';
  if not found then raise exception 'order not delivered'; end if;
  insert into order_reviews (order_id, customer_id, outlet_id, rating, comment)
  values (o.id, auth.uid(), o.outlet_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (order_id) do nothing;
end $$;

revoke execute on function submit_review(text, int, text) from public, anon;
grant execute on function submit_review(text, int, text) to authenticated;
