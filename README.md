# 🍛 Biryani Darbaar

> Direct ordering website for a Hyderabadi biryani chain, with a live kitchen display. Order faster, pay less commission, own your customers.

🌐 **Live app:** <<PASTE VERCEL URL HERE>>
📄 **Setup & demo logins:** see [`deployment.md`](./deployment.md)

---

## 📖 About

Biryani Darbaar is a take-home project built for a Hyderabad food chain with multiple outlets and cloud kitchens. The chain pays delivery apps 25-30% commission on every order and does not own its customer data. This app gives it its own ordering site, with one central menu, orders routed straight to the right outlet's kitchen screen, and live status for the customer.

## ✨ Features

### 🧑‍🍳 For customers
- 📍 Pick an outlet and browse its menu with food photos
- 🥗 Veg / non-veg marks, spice levels and portion options
- 🛒 Cart and quick checkout
- 💳 Test-mode payment (no real money moves)
- ⏱️ Honest promised delivery time, based on current kitchen load
- 📡 Live order tracking: Received → Preparing → Ready → Out for delivery → Delivered
- 🧾 Prices shown inclusive of 5% GST

### 🔥 For kitchen staff
- 🖥️ Live kitchen display, one per outlet, readable from a distance
- 🆕 New orders appear instantly, with no refresh
- ⏲️ Countdown timers, with colour marking for orders running late
- ➕ "+5 min" button that updates the customer's promised time
- 🚨 Warning when an order is 10+ minutes late
- ✅ One-tap stage changes: Accept → Ready → Handed to rider → Delivered

### 🛠️ For admins
- 🍽️ Central menu admin: items, prices, availability and photos

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Framework | ⚛️ Next.js 16 (App Router) + TypeScript |
| Styling | 🎨 Tailwind CSS |
| Database & Auth | 🐘 Supabase (PostgreSQL + Auth) |
| Real-time | ⚡ Supabase Realtime (Postgres changes) |
| Security | 🔒 Row Level Security + role-based access |
| Testing | 🧪 Vitest |
| Hosting | ▲ Vercel |

## 🏗️ How it works

```
Customer places order ──► Database (Supabase)
                               │
                  Realtime change event
                    ┌──────────┴──────────┐
                    ▼                     ▼
          Kitchen screen of        Customer's live
          the right outlet         status page
```

1. 📲 The customer places an order at a chosen outlet.
2. 🗄️ The order is saved with a promised time (the higher of the prep estimate and the outlet's minimum).
3. ⚡ A realtime event updates that outlet's kitchen screen and the customer's status page together.
4. 👨‍🍳 Kitchen staff move the order through each stage, and the customer sees every change live.

## 📁 Project structure

```
app/          → pages and routes (customer, kitchen, admin, login)
components/   → shared UI pieces (e.g. LiveStatus)
lib/          → business logic (pricing, prep time) and tests
public/       → static assets and food photos
supabase/     → database schema and seed data
```

## 🚀 Run locally

**Prerequisites:** Node.js 20+ and a free [Supabase](https://supabase.com) project.

```bash
# 1. Clone the repo
git clone https://github.com/ajrocks-afk/biryani-darbaar.git
cd biryani-darbaar

# 2. Install dependencies
npm install

# 3. Create your env file and fill in the values
cp .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 🎉

Full database setup (schema, seed data, demo users) is in [`deployment.md`](./deployment.md).

## 🔐 Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (anon) key for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key, **server only**, never exposed to the browser |

> ⚠️ Never commit `.env.local`. Only `.env.example` (names, no values) is in the repo.

## 🧪 Tests

```bash
npm test
```

Covers the core business logic: pricing and prep-time estimation.

## 🛡️ Security

- 🔑 No secrets in the repository
- 👥 Role-based access: customer, kitchen and admin
- 🧱 Row Level Security on database tables
- ✅ Server-side validation when placing orders

## 🔑 Demo accounts

Demo logins for the reviewer are listed in [`deployment.md`](./deployment.md).

## ✂️ What was cut (and what's next)

- 🎁 Loyalty points
- 📊 Admin dashboard (orders, prep time, cancellations, repeat customers)
- 🎉 Party order form
- 📱 Real WhatsApp/SMS notifications (messages are mocked)
- 💸 Live payment gateway (test mode only)

## ⚠️ Assumptions

- Payments are mocked, since no real gateway is connected.
- Prep time is estimated from the number of active orders at the outlet.
- Sample data follows the problem statement. Outlet names and menu are seeded.

## 👤 Author

Built by **Arya Baban Jadhav** for the Isocode Labs Software Engineering Intern take-home task.

---

Made with ❤️ and a lot of biryani 🍛
