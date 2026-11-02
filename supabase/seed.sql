-- Fictional demo data. FSSAI numbers are made up.
-- Sample order totals come from the client brief, so line items do not add up exactly.

insert into outlets (name, lat, lng, delivery_radius_km, fssai_no, is_cloud_kitchen, min_prep_minutes) values
('Kondapur', 17.4600, 78.3650, 5, '10020042000111', false, 25),
('Kukatpally', 17.4948, 78.3996, 5, '10020042000222', false, 25),
('Gachibowli Cloud Kitchen', 17.4401, 78.3489, 6, '10020042000333', true, 20);

insert into menu_items (name, description, category, is_veg, spice_level, allergens, base_prep_minutes) values
('Chicken Dum Biryani Family Pack', 'Slow-cooked basmati with marinated chicken. Serves 3 to 4.', 'Biryani', false, 2, '{dairy}', 30),
('Chicken Dum Biryani', 'Classic Hyderabadi dum biryani.', 'Biryani', false, 2, '{dairy}', 20),
('Mutton Dum Biryani', 'Tender mutton layered with saffron rice.', 'Biryani', false, 3, '{dairy}', 25),
('Veg Biryani', 'Seasonal vegetables and basmati rice.', 'Biryani', true, 1, '{dairy}', 18),
('Mirchi ka Salan', 'Peanut and sesame gravy with green chillies.', 'Sides', true, 2, '{peanuts,sesame}', 10),
('Mutton Haleem', 'Slow-cooked wheat and mutton porridge.', 'Specials', false, 1, '{gluten}', 15),
('Double ka Meetha', 'Fried bread pudding with rabdi and dry fruits.', 'Desserts', true, 0, '{dairy,gluten,nuts}', 8),
('Chicken 65', 'Crispy fried chicken with curry leaf.', 'Starters', false, 3, '{}', 15),
('Paneer Tikka', 'Charred paneer with spices.', 'Starters', true, 2, '{dairy}', 15),
('Raita', 'Cooling curd with cucumber.', 'Sides', true, 0, '{dairy}', 3);

insert into item_prices (item_id, city, price_inr)
select id, 'Hyderabad', case name
  when 'Chicken Dum Biryani Family Pack' then 980
  when 'Chicken Dum Biryani' then 320
  when 'Mutton Dum Biryani' then 420
  when 'Veg Biryani' then 280
  when 'Mirchi ka Salan' then 80
  when 'Mutton Haleem' then 350
  when 'Double ka Meetha' then 100
  when 'Chicken 65' then 260
  when 'Paneer Tikka' then 240
  when 'Raita' then 50 end
from menu_items;

insert into item_options (item_id, kind, name, extra_price_inr)
select id, 'addon', 'Extra raita', 40 from menu_items where name like '%Biryani%';

insert into item_options (item_id, kind, name, extra_price_inr)
select id, 'portion', 'Regular', 0 from menu_items where name in ('Chicken Dum Biryani','Mutton Dum Biryani','Veg Biryani');

insert into item_options (item_id, kind, name, extra_price_inr)
select id, 'portion', 'Large', 120 from menu_items where name in ('Chicken Dum Biryani','Mutton Dum Biryani','Veg Biryani');

insert into outlet_items (outlet_id, item_id)
select o.id, m.id from outlets o cross join menu_items m;

update outlet_items set is_available = false
where outlet_id = (select id from outlets where name = 'Kukatpally')
  and item_id = (select id from menu_items where name = 'Paneer Tikka');

insert into coupons (code, percent_off, max_discount_inr, min_order_inr) values
('DARBAAR10', 10, 150, 300),
('FIRSTBITE', 15, 200, 500);

insert into orders (order_no, outlet_id, status, payment_method, payment_status, subtotal_inr, total_inr, gst_included_inr, placed_at, promised_at) values
('WEB-778120', (select id from outlets where name='Kondapur'), 'preparing', 'upi', 'paid', 1180, 1180, 56, now() - interval '10 minutes', now() + interval '35 minutes'),
('WEB-778131', (select id from outlets where name='Gachibowli Cloud Kitchen'), 'ready', 'card', 'paid', 640, 640, 30, now() - interval '25 minutes', now() + interval '15 minutes'),
('WEB-778146', (select id from outlets where name='Kukatpally'), 'preparing', 'upi', 'paid', 1050, 1050, 50, now() - interval '54 minutes', now() - interval '4 minutes');

insert into order_items (order_id, item_id, name_snapshot, qty, unit_price_inr)
select o.id, m.id, m.name, v.qty, v.price from (values
 ('WEB-778120','Chicken Dum Biryani Family Pack',1,980),
 ('WEB-778120','Double ka Meetha',2,100),
 ('WEB-778131','Veg Biryani',2,280),
 ('WEB-778131','Mirchi ka Salan',1,80),
 ('WEB-778146','Mutton Haleem',3,350)
) as v(order_no, item_name, qty, price)
join orders o on o.order_no = v.order_no
join menu_items m on m.name = v.item_name;

-- Run only after creating the 3 demo users in Supabase Authentication:
insert into profiles (id, full_name, role, outlet_id)
select id, 'Demo Customer', 'customer', null from auth.users where email = 'customer@demo.com';

insert into profiles (id, full_name, role, outlet_id)
select id, 'Kondapur Kitchen', 'kitchen', (select id from outlets where name = 'Kondapur')
from auth.users where email = 'kitchen@demo.com';

insert into profiles (id, full_name, role, outlet_id)
select id, 'Demo Admin', 'admin', null from auth.users where email = 'admin@demo.com';