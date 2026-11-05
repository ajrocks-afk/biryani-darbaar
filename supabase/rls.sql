-- Row Level Security policies and the Realtime publication, exported from the live project.
-- Run after schema.sql and features.sql. Re-runnable (drops each policy before creating it).

alter table coupons enable row level security;
alter table item_options enable row level security;
alter table item_prices enable row level security;
alter table loyalty_ledger enable row level security;
alter table menu_items enable row level security;
alter table notifications enable row level security;
alter table order_events enable row level security;
alter table order_items enable row level security;
alter table order_reviews enable row level security;
alter table orders enable row level security;
alter table outlet_items enable row level security;
alter table outlets enable row level security;
alter table profiles enable row level security;
alter table support_tickets enable row level security;
alter table user_coupons enable row level security;
drop policy if exists "admin item_options" on item_options;
create policy "admin item_options" on item_options as permissive for all to public using ((my_role() = 'admin'::text)) with check ((my_role() = 'admin'::text));
drop policy if exists "admin item_prices" on item_prices;
create policy "admin item_prices" on item_prices as permissive for all to public using ((my_role() = 'admin'::text)) with check ((my_role() = 'admin'::text));
drop policy if exists "admin menu_items" on menu_items;
create policy "admin menu_items" on menu_items as permissive for all to public using ((my_role() = 'admin'::text)) with check ((my_role() = 'admin'::text));
drop policy if exists "admin outlet_items" on outlet_items;
create policy "admin outlet_items" on outlet_items as permissive for all to public using ((my_role() = 'admin'::text)) with check ((my_role() = 'admin'::text));
drop policy if exists "admin outlets" on outlets;
create policy "admin outlets" on outlets as permissive for all to public using ((my_role() = 'admin'::text)) with check ((my_role() = 'admin'::text));
drop policy if exists "customer reads own reviews" on order_reviews;
create policy "customer reads own reviews" on order_reviews as permissive for select to public using ((customer_id = auth.uid()));
drop policy if exists "customer reads own tickets" on support_tickets;
create policy "customer reads own tickets" on support_tickets as permissive for select to public using ((customer_id = auth.uid()));
drop policy if exists "kitchen outlet_items" on outlet_items;
create policy "kitchen outlet_items" on outlet_items as permissive for update to public using (((my_role() = 'kitchen'::text) AND (outlet_id = my_outlet()))) with check (((my_role() = 'kitchen'::text) AND (outlet_id = my_outlet())));
drop policy if exists "own ledger" on loyalty_ledger;
create policy "own ledger" on loyalty_ledger as permissive for select to public using ((customer_id = auth.uid()));
drop policy if exists "read item_options" on item_options;
create policy "read item_options" on item_options as permissive for select to public using (true);
drop policy if exists "read item_prices" on item_prices;
create policy "read item_prices" on item_prices as permissive for select to public using (true);
drop policy if exists "read menu_items" on menu_items;
create policy "read menu_items" on menu_items as permissive for select to public using (true);
drop policy if exists "read order_events" on order_events;
create policy "read order_events" on order_events as permissive for select to public using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE (o.id = order_events.order_id))));
drop policy if exists "read order_items" on order_items;
create policy "read order_items" on order_items as permissive for select to public using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE (o.id = order_items.order_id))));
drop policy if exists "read orders" on orders;
create policy "read orders" on orders as permissive for select to public using (((customer_id = auth.uid()) OR (my_role() = 'admin'::text) OR ((my_role() = 'kitchen'::text) AND (outlet_id = my_outlet()))));
drop policy if exists "read outlet_items" on outlet_items;
create policy "read outlet_items" on outlet_items as permissive for select to public using (true);
drop policy if exists "read outlets" on outlets;
create policy "read outlets" on outlets as permissive for select to public using (true);
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles as permissive for select to public using (((id = auth.uid()) OR (my_role() = 'admin'::text)));
drop policy if exists "staff add order_events" on order_events;
create policy "staff add order_events" on order_events as permissive for insert to public with check ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_events.order_id) AND ((my_role() = 'admin'::text) OR ((my_role() = 'kitchen'::text) AND (o.outlet_id = my_outlet())))))));
drop policy if exists "staff read their reviews" on order_reviews;
create policy "staff read their reviews" on order_reviews as permissive for select to public using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR ((p.role = 'kitchen'::text) AND (p.outlet_id = order_reviews.outlet_id)))))));
drop policy if exists "staff read their tickets" on support_tickets;
create policy "staff read their tickets" on support_tickets as permissive for select to public using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'admin'::text) OR ((p.role = 'kitchen'::text) AND (p.outlet_id = support_tickets.outlet_id)))))));
drop policy if exists "staff update orders" on orders;
create policy "staff update orders" on orders as permissive for update to public using (((my_role() = 'admin'::text) OR ((my_role() = 'kitchen'::text) AND (outlet_id = my_outlet())))) with check (((my_role() = 'admin'::text) OR ((my_role() = 'kitchen'::text) AND (outlet_id = my_outlet()))));
alter publication supabase_realtime add table orders;