create table outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Hyderabad',
  lat double precision not null,
  lng double precision not null,
  delivery_radius_km numeric not null default 5,
  fssai_no text not null,
  is_cloud_kitchen boolean default false,
  min_prep_minutes int not null default 25
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null check (role in ('customer','kitchen','admin')),
  outlet_id uuid references outlets(id)
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  category text not null,
  is_veg boolean not null,
  spice_level int check (spice_level between 0 and 3),
  allergens text[] default '{}',
  base_prep_minutes int not null default 15,
  available_from time,
  available_to time
);

create table item_prices (
  item_id uuid references menu_items on delete cascade,
  city text not null,
  price_inr int not null,
  primary key (item_id, city)
);

create table item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references menu_items on delete cascade,
  kind text check (kind in ('portion','addon')),
  name text not null,
  extra_price_inr int not null default 0
);

create table outlet_items (
  outlet_id uuid references outlets on delete cascade,
  item_id uuid references menu_items on delete cascade,
  is_available boolean default true,
  primary key (outlet_id, item_id)
);

create table coupons (
  code text primary key,
  percent_off int,
  max_discount_inr int,
  min_order_inr int default 0,
  is_active boolean default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  customer_id uuid references profiles,
  outlet_id uuid references outlets not null,
  status text not null default 'placed'
    check (status in ('placed','preparing','ready','handed_off','cancelled')),
  payment_method text check (payment_method in ('upi','card')),
  payment_status text default 'pending',
  subtotal_inr int not null,
  discount_inr int default 0,
  total_inr int not null,
  gst_included_inr int not null,
  coupon_code text,
  placed_at timestamptz default now(),
  promised_at timestamptz not null,
  ai_estimate_minutes int,
  manager_override_minutes int
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders on delete cascade,
  item_id uuid references menu_items,
  name_snapshot text not null,
  qty int not null,
  unit_price_inr int not null,
  options_text text
);

create table order_events (
  id bigserial primary key,
  order_id uuid references orders on delete cascade,
  status text not null,
  at timestamptz default now()
);