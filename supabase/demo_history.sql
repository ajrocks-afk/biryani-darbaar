-- Biryani Darbaar: SYNTHETIC demo history so the admin dashboard is not empty.
-- Fictional data. Run AFTER features.sql and AFTER the demo users and profiles exist (end of seed.sql).
-- Safe to re-run.

-- 70 fake past orders spread over 7 days, 3 outlets. Every 5th belongs to the demo customer.
insert into orders (order_no, customer_id, outlet_id, status, payment_method, payment_status,
                    subtotal_inr, total_inr, gst_included_inr, placed_at, promised_at)
select 'HIST-' || g,
       case when g % 5 = 0 then (select id from profiles where role = 'customer' order by id limit 1) end,
       (select id from outlets order by name offset (g % 3) limit 1),
       case when g % 11 = 0 then 'cancelled' else 'delivered' end,
       case when g % 2 = 0 then 'upi' else 'card' end, 'paid',
       x.t, x.t, round(x.t * 5 / 105.0)::int, x.ts, x.ts + interval '40 minutes'
from generate_series(1, 70) g
cross join lateral (select 400 + (g * 37) % 900 as t,
       now() - ((g % 7) * interval '1 day') - ((g % 9) * interval '1 hour') as ts) x
on conflict (order_no) do nothing;

-- "Ready" events so average prep time can be calculated (16 to 29 minutes after placing)
insert into order_events (order_id, status, at)
select id, 'ready', placed_at + ((16 + abs(hashtext(order_no)) % 14) * interval '1 minute')
from orders
where order_no like 'HIST-%' and status = 'delivered'
  and not exists (select 1 from order_events e where e.order_id = orders.id);

-- Starting balance of 300 points for the demo customer (once)
insert into loyalty_ledger (customer_id, points, reason)
select id, 300, 'adjust' from profiles
where role = 'customer'
  and not exists (select 1 from loyalty_ledger where reason = 'adjust' and order_id is null and points = 300)
order by id limit 1;
