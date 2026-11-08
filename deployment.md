# Biryani Darbaar: deployment notes

- **Live app:** https://biryani-darbaar-cvrm.vercel.app
- **GitHub:** https://github.com/ajrocks-afk/biryani-darbaar

## 1. Demo logins for the reviewer

All accounts are fictional and exist only for this demo. Password for every account: `Darbaar@123`

| Role | Email | What it can do |
|---|---|---|
| Customer | customer@demo.com | Browse, order, pay (test mode), track live, scratch rewards, loyalty points, party requests, issues |
| Kitchen (Kondapur) | kitchen@demo.com | Kitchen board for the Kondapur outlet only |
| Kitchen (Kukatpally) | kitchen2@demo.com | Kitchen board for Kukatpally only |
| Kitchen (Cloud kitchen) | kitchen3@demo.com | Kitchen board for Gachibowli Cloud Kitchen only |
| Admin | admin@demo.com | Menu and stock, add items, party orders (acts as catering manager), customer issues, dashboard, staff |

The login page has buttons that fill these accounts in.

### Suggested 5-minute walkthrough

1. As **customer**: pick an outlet (try "Use my location" or a demo area), add a biryani with **Customise** (portion and add-ons), open the cart, apply `DARBAAR10`, choose a payment method (card `4111 1111 1111 1111` succeeds, `4000 0000 0000 0002` is declined), and place the order. Scratch the reward card.
2. In a second window as **kitchen@demo.com**: the order appears live. Tap **Accept & start**, then **+5 min**, then **Mark ready**, **Handed to rider** and **Mark delivered**. The customer page and the bell update live.
3. As **customer**: open **Party**, send a request (at least 48 hours ahead, 10 or more guests).
4. As **admin**: the bell and the **Party orders** badge show it. Confirm it with a message and use the Call and WhatsApp buttons. Then try **Add items**, pause an item per outlet on **Menu & stock**, and open the **Dashboard**.
5. Note: a kitchen account only sees its own outlet. An order placed at Kukatpally will not show for kitchen@demo.com.

## 2. Run it locally

Requirements: Node.js 20 or newer, Git, and a free Supabase project.

1. Clone and install:
   ```bash
   git clone https://github.com/ajrocks-afk/biryani-darbaar.git
   cd biryani-darbaar
   npm install
   ```
2. Create a project at supabase.com (free tier).
3. Open **SQL Editor** and run these files from the `supabase/` folder, **one file at a time, in this order**:
   1. `schema.sql` (tables)
   2. `seed.sql` (outlets, menu, prices, coupons, sample orders)
   3. `features.sql` (loyalty, support tickets, ratings, notifications log, sign-up trigger)
   4. `features2.sql` (party orders, menu CMS functions, outlet phone numbers)
   5. `features3.sql` (in-app notification inbox, cancel-order function)
   6. `rls.sql` (Row Level Security policies and the Realtime publication)
   7. Optional: `demo_history.sql`, if present, adds past orders so the dashboard has data.

   If the editor rejects a file with several statements, paste and run it in smaller parts.
   If a line says a policy, trigger or table "already exists", it is safe to ignore.
4. Create the demo users: **Authentication → Users → Add user → Create new user**, with **Auto Confirm User** ticked and the password `Darbaar@123`, for these five emails: `customer@demo.com`, `kitchen@demo.com`, `kitchen2@demo.com`, `kitchen3@demo.com`, `admin@demo.com`.
5. Give them their roles (run as one query after the users exist):
   ```sql
   insert into profiles (id, full_name, role, outlet_id)
   select id, 'Demo Customer', 'customer', null from auth.users where email = 'customer@demo.com'
   on conflict (id) do update set role = 'customer', outlet_id = null;

   insert into profiles (id, full_name, role, outlet_id)
   select id, 'Demo Admin', 'admin', null from auth.users where email = 'admin@demo.com'
   on conflict (id) do update set role = 'admin', outlet_id = null;

   insert into profiles (id, full_name, role, outlet_id)
   select id, 'Kondapur Kitchen', 'kitchen', (select id from outlets where name = 'Kondapur')
   from auth.users where email = 'kitchen@demo.com'
   on conflict (id) do update set role = 'kitchen', outlet_id = excluded.outlet_id;

   insert into profiles (id, full_name, role, outlet_id)
   select id, 'Kukatpally Kitchen', 'kitchen', (select id from outlets where name = 'Kukatpally')
   from auth.users where email = 'kitchen2@demo.com'
   on conflict (id) do update set role = 'kitchen', outlet_id = excluded.outlet_id;

   insert into profiles (id, full_name, role, outlet_id)
   select id, 'Gachibowli Kitchen', 'kitchen', (select id from outlets where name = 'Gachibowli Cloud Kitchen')
   from auth.users where email = 'kitchen3@demo.com'
   on conflict (id) do update set role = 'kitchen', outlet_id = excluded.outlet_id;
   ```
6. Copy `.env.example` to `.env.local` and fill in the three values (Supabase **Project Settings → API**). See section 4.
7. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```
8. Run the unit tests and a production build:
   ```bash
   npm test
   npm run build
   ```

Food photos are static files in `public/food/` and are linked by the `photo_url` column. If a photo is missing, the menu shows a placeholder.

## 3. How it is deployed

- **App:** Next.js on Vercel (free Hobby plan), deployed from the GitHub repo. Every push to `main` redeploys.
- **Database, auth and realtime:** Supabase (hosted Postgres).
- **Steps used:** import the repo in Vercel, add the three environment variables, deploy. In Supabase, **Authentication → URL Configuration**, add the Vercel URL as the Site URL.

## 4. Environment variables (names only)

| Name | Used where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server. Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server. Supabase public (anon) key, which is safe to expose because Row Level Security protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (server actions that place orders and validate coupons). Never sent to the browser and never committed |

`.env.local` is git-ignored. Only `.env.example` (names, no values) is in the repo.

## 5. Security summary

- Row Level Security is enabled on every table. Policies are in `supabase/rls.sql` and `features*.sql`.
- Customers read only their own orders, tickets, party requests and notifications. Kitchen accounts read and update only their own outlet's orders. Admin manages the menu and party requests.
- Orders are created only by a server action. It verifies the caller's login token, requires the customer role, and re-reads prices, option prices, coupons, serving times and loyalty points from the database instead of trusting the browser.
- Writes such as party requests, tickets, ratings, cancellation and menu items go through database functions that check the caller's role.
- Inputs are validated in the browser and again on the server or in the database.

## 6. Assumptions (also listed in the TDD)

- Payments are a simulated gateway (test mode). Card details never leave the browser and are not stored. Only the method and a label such as "Card •• 1111" are saved.
- WhatsApp and SMS messages are mocked: they are written to a log that the customer sees on the tracking page.
- The prep-time estimate is a transparent load-based formula with constants I chose, not a trained model. Promised time is the higher of the estimate and the outlet minimum.
- Loyalty rates (1 point per Rs 20, 1 point = Rs 1, Silver and Gold multipliers), scratch-card prize odds, coupon values, the 48-hour party notice and the 10 to 500 guest range are my own assumptions. The client should confirm them.
- The admin account acts as the catering manager. Delivery is by a partner rider (out of scope): kitchen staff mark an order delivered.
- Outlet coordinates, FSSAI numbers and phone numbers are fictional. Food photos are free-licence images.
- Seeded sample order totals come from the brief and do not add up exactly to their line items.

## 7. Known limits

- The 1,200 orders per hour peak and the median checkout under 60 seconds were **not load-tested or measured**.
- Access tokens are passed to server actions as arguments. Cookie-based sessions (`@supabase/ssr`) would be better.
- Kitchen staff can update any column of their outlet's orders. A database trigger that allows only valid status transitions is the next step.
- The delivery radius is checked when choosing an outlet, not again at checkout. Orders go to the outlet the customer picks. They are not auto-assigned.
- Only the Hyderabad price row exists. The table supports other cities, but the admin screen does not edit them yet.
- Existing dishes can have price, stock, photo and serving window edited, but not name or description.
- Notifications are in-app only (no push, email or SMS), and the first-time guide is remembered per browser.