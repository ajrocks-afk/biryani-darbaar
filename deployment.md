# Biryani Darbaar: Setup and Deployment Notes

- **Live app:** https://biryani-darbaar-cvrm.vercel.app
- **GitHub:** https://github.com/ajrocks-afk/biryani-darbaar
- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL, Auth, Realtime), Vitest, Vercel

All data in this project is fictional. Payments are in test mode and no real money moves.

---

## 1. Demo logins (for the reviewer)

The password for every demo account is `Darbaar@123`. On the login page you can also tap a demo name to fill the form.

| Role | Email | What you can do |
|---|---|---|
| Customer | `customer@demo.com` | Browse outlets, order, pay (test), track live, use points, scratch cards, raise help requests, rate |
| Kitchen (Kondapur) | `kitchen@demo.com` | Live kitchen board and customer issues for **Kondapur only** |
| Kitchen (Kukatpally) | `kitchen2@demo.com` | Same, for **Kukatpally only** |
| Kitchen (Gachibowli Cloud Kitchen) | `kitchen3@demo.com` | Same, for **Gachibowli Cloud Kitchen only** |
| Admin | `admin@demo.com` | Menu admin, outlet dashboard, customer issues for all outlets, add kitchen staff |

**New customers can also create their own account** on the login page (Create account tab). Kitchen and admin accounts cannot be self-registered. An admin creates kitchen accounts under **Admin → Add staff**.

The demo customer starts with 300 loyalty points and shows as Gold tier, because the demo data includes synthetic past orders. A newly created account starts at 0 points and Bronze.

### Five-minute review path

1. Open the live app in **three windows**: customer, kitchen (`kitchen@demo.com`), and admin.
2. As the customer, choose **Kondapur**, add items to the cart, and pay with test card `4111 1111 1111 1111` (any future expiry, any 3-digit CVV).
3. Watch the order appear on the kitchen board **without refreshing**. Press **Accept & start**, then **+5 min**. The customer's tracking page updates, with a new promised time and a demo WhatsApp message.
4. Continue through **Mark ready**, **Handed to rider**, and **Mark delivered**. The customer gets a rating pop-up (optional) and earns points.
5. On the tracking page, tap **Something wrong with your order?** and send a complaint. Open **Customer issues** as the kitchen user and reply. The reply shows up on the customer's page.
6. As admin, open **Dashboard** (orders, average prep time, cancellations and repeat customers per outlet) and **Issues** (separate view per outlet).

### Test payment inputs

| Method | Input | Result |
|---|---|---|
| Card | `4111 1111 1111 1111` | Succeeds |
| Card | `4000 0000 0000 0002` | Declined |
| UPI | Any valid ID such as `name@bank` | Succeeds |
| UPI | ID starting with `fail` | Declined |

---

## 2. Run it locally

**Prerequisites:** Node.js 20 or newer, Git, and a free [Supabase](https://supabase.com) project.

```bash
# 1. Clone
git clone https://github.com/ajrocks-afk/biryani-darbaar.git
cd biryani-darbaar

# 2. Install
npm install

# 3. Create your environment file
cp .env.example .env.local        # on Windows PowerShell: Copy-Item .env.example .env.local
```

Open `.env.local` and fill in the three values from your Supabase project (**Project Settings → API**). See section 3.

Then set up the database (section 4), and run:

```bash
npm run dev       # http://localhost:3000
npm test          # unit tests (Vitest)
npm run build     # production build, includes the type check
```

---

## 3. Environment variables

Names only. Never commit values. `.env.local` is git-ignored, and `.env.example` lists the names.

| Name | Where it is used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Public key. Protected by Row Level Security |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses Row Level Security. Used only in server actions, after the caller's role is checked. Never exposed to the browser |

---

## 4. Database setup (Supabase)

1. **Create a project** at supabase.com.
2. **Run the SQL** in the `supabase/` folder using the SQL Editor, in the order listed there: schema first, then seed data, then the feature scripts. Run each file as a separate query.
3. **Create the demo users** under **Authentication → Users → Add user**, with "Auto Confirm User" ticked and password `Darbaar@123`:
   `customer@demo.com`, `kitchen@demo.com`, `kitchen2@demo.com`, `kitchen3@demo.com`, `admin@demo.com`.
   Then run the `profiles` insert statements at the bottom of `seed.sql`, which assign each user a role and an outlet.
4. **Authentication settings** (Authentication → Sign In / Providers → Email): turn **Confirm email off** so new sign-ups can order immediately. This is a demo choice (see Limits).
5. **Realtime:** the `orders` table must be in the `supabase_realtime` publication so the kitchen screen and tracking page update live.
6. **Photos:** food photos are in `public/food/`. File names must match the database exactly, because Vercel is case-sensitive.

---

## 5. How it is deployed

- **Hosting:** Vercel (free Hobby plan), connected to the GitHub repository. Every push to `main` builds and deploys automatically.
- **Database and auth:** one hosted Supabase project, used by both local development and the live app.
- **Vercel setup:**
  1. Import the GitHub repo as a new project (framework: Next.js, default build settings).
  2. Add the three environment variables from section 3 under **Settings → Environment Variables**.
  3. Deploy. To redeploy after changing a variable: **Deployments → ⋯ → Redeploy**.
- **Supabase URL settings** (Authentication → URL Configuration): Site URL is the Vercel URL, and Redirect URLs include `https://biryani-darbaar-cvrm.vercel.app/**` and `http://localhost:3000/**`.

---

## 6. Security summary

- No secrets in the repository. `.env.local` is ignored and only `.env.example` (names) is committed.
- **Row Level Security** is on for all tables. The `profiles` table has a read-own-row policy only, so users cannot change their own role.
- New accounts are always created as `customer` by a database trigger. Staff accounts can only be created by an admin through a server action that verifies the caller's role.
- Prices, totals, discounts and loyalty redemption are **recalculated on the server** and never trusted from the browser.
- Help requests and ratings are written through database functions that take the outlet from the customer's own order, so they cannot be pointed at another outlet.
- Inputs are validated on the server (quantities, coupon codes, payment method, text lengths).
- Marketing messages are opt-in. The sign-up checkbox is unticked by default, and consent is stored with a timestamp.

---

## 7. Known limits

- Payments are a **mock gateway** (test mode only). WhatsApp and SMS messages are **simulated**: they appear as "demo WhatsApp" messages in the order page and are logged in the database.
- Email confirmation is switched off to keep the demo friction-free.
- Kitchen staff can update any column of their own outlet's orders (a known trade-off, noted in the TDD).
- The 1,200 orders per hour peak has **not been load tested**.
- The complaint assistant is a rule-based guided form, not an AI model.
- Dashboard history before today's demo is synthetic.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Some food photos missing on the live site | File names in `public/food/` must match the database exactly, including capital letters |
| "Could not place order" | `SUPABASE_SERVICE_ROLE_KEY` is missing or mistyped. Fix it in Vercel, then redeploy |
| Login redirects wrongly | Hard refresh (Ctrl+Shift+R) or use a private window. Check the Supabase URL settings in section 5 |
| Kitchen board does not update live | Check that `orders` is in the Realtime publication. The page also refreshes every 10 seconds as a fallback |
| Build fails on a missing module | Run `npm install` and commit `package.json` and `package-lock.json` |