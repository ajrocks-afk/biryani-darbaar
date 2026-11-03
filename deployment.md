# Biryani Darbaar: deployment notes

Live app: <<PASTE VERCEL URL HERE>>
GitHub: https://github.com/<<YOUR-USERNAME>>/biryani-darbaar

## 1. Run it locally

Requirements: Node.js 20 or newer, Git, and a free Supabase project.

1. Clone and install:
   ```bash
   git clone https://github.com/<<YOUR-USERNAME>>/biryani-darbaar.git
   cd biryani-darbaar
   npm install
   ```
2. Create a Supabase project (supabase.com, free tier).
3. In the Supabase SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
   The profiles part at the end of the seed needs the demo users to exist first (step 5).
4. Run the realtime and photo SQL from section 6 below.
5. In Supabase, go to Authentication, then Users, then Add user. Create the three demo
   users listed in section 4 with "Auto Confirm User" ticked. Then run the three
   `insert into profiles` statements at the end of `supabase/seed.sql`.
6. Copy `.env.example` to `.env.local` and fill in the two values (Project Settings, then API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
7. Start the app:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000
8. Run the tests:
   ```bash
   npm test
   ```

## 2. How it is deployed

- Frontend and server code: Next.js on Vercel (free tier), deployed from the GitHub repo.
- Database, authentication and realtime: Supabase (hosted Postgres).
- Food photos are static files in `public/food/` and are served by Vercel.

Deploy steps:
1. Push the repo to GitHub.
2. On vercel.com choose "Add New Project" and import the repo.
3. Add the two environment variables below in the Vercel project settings.
4. Click Deploy. Every push to `main` redeploys automatically.

## 3. Environment variables (names only)

| Name | Where it is used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server, Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server, Supabase public (anon) key |

No secret keys are used or stored in the repository. The Supabase service_role key is
never used by this app.

## 4. Demo logins (fictional accounts, test data only)

Password for all accounts: `Darbaar@123`

| Role | Email | What it can do |
|---|---|---|
| Customer | customer@demo.com | Browse menu, order, pay (test mode), track order live |
| Kitchen (Kondapur) | kitchen@demo.com | Kitchen board for the Kondapur outlet only |
| Kitchen (Kukatpally) | kitchen2@demo.com | Kitchen board for Kukatpally only |
| Kitchen (Cloud) | kitchen3@demo.com | Kitchen board for Gachibowli Cloud Kitchen only |
| Admin | admin@demo.com | Menu admin (pause items, edit prices); can view the kitchen screen for all outlets |

You can also tap the demo-account buttons on the login page.

## 5. Suggested walkthrough for the reviewer

1. Open the app, choose the **Kondapur** outlet, add items, apply coupon `DARBAAR10`
   (10% off, minimum Rs 300, up to Rs 150), and pay with test UPI or card.
2. Keep the order page open. In another browser window, sign in as kitchen@demo.com.
3. The new order appears on the kitchen board. Click "Accept & start", then "Mark ready".
   The customer's order page updates live. Try "+5 min" to extend the promise.
4. Sign in as admin@demo.com and pause an item at an outlet. It shows as out of stock
   on the customer menu.

Note: a kitchen account sees only its own outlet's orders. An order placed at
Kukatpally will not appear for kitchen@demo.com, which is the intended behaviour.

## 6. Supabase setup extras

Enable realtime on orders (run once):
```sql
alter publication supabase_realtime add table orders;
```

Link food photos (run once):
```sql
update menu_items set photo_url = case name
  when 'Chicken Dum Biryani Family Pack' then '/food/chicken-family.jpg'
  when 'Chicken Dum Biryani' then '/food/chicken-biryani.jpg'
  when 'Mutton Dum Biryani' then '/food/mutton-biryani.jpg'
  when 'Veg Biryani' then '/food/veg-biryani.jpg'
  when 'Mirchi ka Salan' then '/food/salan.jpg'
  when 'Mutton Haleem' then '/food/haleem.jpg'
  when 'Double ka Meetha' then '/food/meetha.jpg'
  when 'Chicken 65' then '/food/chicken65.jpg'
  when 'Paneer Tikka' then '/food/paneer-tikka.jpg'
  when 'Raita' then '/food/raita.jpg'
end;
```

## 7. Known limits (also listed in the TDD)

- Payment is a mock: the order is marked paid without a real gateway (the brief asks for test mode).
- All data is fictional. FSSAI numbers are invented. Food photos are from Unsplash/Pexels (free licence).
- The prep-time estimate is a transparent load-based formula, not a trained model.
- <<Update this line: state whether Row Level Security is enabled and which policies exist.>>