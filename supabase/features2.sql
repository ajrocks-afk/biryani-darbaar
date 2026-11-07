-- Biryani Darbaar: second feature script. Run AFTER schema.sql, seed.sql and features.sql.
-- Safe to re-run: tables use IF NOT EXISTS, functions use CREATE OR REPLACE, policies are dropped first.

------------------------------------------------------------------------------
-- 1. Party orders
--    ASSUMPTIONS: 48 hours minimum notice, 10 to 500 guests, the admin acts as the catering manager.
------------------------------------------------------------------------------
create table if not exists party_orders (
  id bigserial primary key,
  customer_id uuid not null references profiles(id) on delete cascade,
  outlet_id uuid not null references outlets(id),
  event_at timestamptz not null,
  guests int not null check (guests between 10 and 500),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  menu_request text not null check (char_length(menu_request) between 5 and 600),
  notes text check (char_length(notes) <= 300),
  status text not null default 'requested' check (status in ('requested','confirmed','declined')),
  manager_note text check (char_length(manager_note) <= 300),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table party_orders enable row level security;

drop policy if exists "customer reads own party orders" on party_orders;
create policy "customer reads own party orders" on party_orders
  for select using (customer_id = auth.uid());

drop policy if exists "admin reads party orders" on party_orders;
create policy "admin reads party orders" on party_orders
  for select using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- No insert/update policies: customers and the admin write only through these functions.
create or replace function create_party_order(
  p_outlet uuid, p_event timestamptz, p_guests int, p_phone text, p_menu text, p_notes text)
returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'customer') then
    raise exception 'Only customer accounts can request party orders';
  end if;
  if p_event < now() + interval '48 hours' then
    raise exception 'Party orders need at least 48 hours notice';
  end if;
  if p_guests < 10 or p_guests > 500 then
    raise exception 'Guests must be between 10 and 500';
  end if;
  if (select count(*) from party_orders where customer_id = auth.uid() and status = 'requested') >= 3 then
    raise exception 'You already have 3 pending requests';
  end if;
  insert into party_orders (customer_id, outlet_id, event_at, guests, phone, menu_request, notes)
  values (auth.uid(), p_outlet, p_event, p_guests, trim(p_phone), trim(p_menu),
          nullif(trim(coalesce(p_notes, '')), ''))
  returning id into new_id;
  return new_id;
end $$;

create or replace function update_party_order(p_id bigint, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only the catering manager can do this';
  end if;
  if p_status not in ('confirmed', 'declined') then raise exception 'Bad status'; end if;
  update party_orders
     set status = p_status,
         manager_note = nullif(trim(coalesce(p_note, '')), ''),
         decided_at = now()
   where id = p_id;
end $$;

revoke execute on function create_party_order(uuid, timestamptz, int, text, text, text) from public, anon;
revoke execute on function update_party_order(bigint, text, text) from public, anon;
grant execute on function create_party_order(uuid, timestamptz, int, text, text, text) to authenticated;
grant execute on function update_party_order(bigint, text, text) to authenticated;

------------------------------------------------------------------------------
-- 2. Menu CMS: add an item in one atomic step (admin only)
------------------------------------------------------------------------------
create or replace function admin_create_item(
  p_name text, p_desc text, p_category text, p_veg boolean, p_spice int, p_allergens text[],
  p_prep int, p_price int, p_photo text, p_from time, p_to time)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admins only';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter a dish name'; end if;
  if p_price < 1 or p_price > 10000 then raise exception 'Price must be between 1 and 10000'; end if;
  if p_prep < 1 or p_prep > 120 then raise exception 'Prep time must be between 1 and 120 minutes'; end if;
  if p_photo is not null and p_photo <> '' and p_photo !~ '^(/|https://)' then
    raise exception 'Photo must start with / or https://';
  end if;
  if (p_from is null) <> (p_to is null) then
    raise exception 'Set both the start and end time, or neither';
  end if;

  insert into menu_items (name, description, photo_url, category, is_veg, spice_level,
                          allergens, base_prep_minutes, available_from, available_to)
  values (trim(p_name), nullif(trim(coalesce(p_desc, '')), ''), nullif(p_photo, ''), p_category,
          p_veg, p_spice, coalesce(p_allergens, '{}'), p_prep, p_from, p_to)
  returning id into new_id;

  insert into item_prices (item_id, city, price_inr) values (new_id, 'Hyderabad', p_price);
  insert into outlet_items (outlet_id, item_id) select id, new_id from outlets;
  return new_id;
end $$;

revoke execute on function admin_create_item(text, text, text, boolean, int, text[], int, int, text, time, time) from public, anon;
grant execute on function admin_create_item(text, text, text, boolean, int, text[], int, int, text, time, time) to authenticated;

alter table outlets add column if not exists phone text;
update outlets set phone = case name
  when 'Kondapur' then '9000000111'
  when 'Kukatpally' then '9000000222'
  when 'Gachibowli Cloud Kitchen' then '9000000333'
  else phone end;