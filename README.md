# Biryani Darbaar

Direct ordering website with a live kitchen display for a Hyderabadi biryani chain (14 outlets and 3 cloud kitchens in the brief; 3 are seeded as a demo). Built as a take-home task for a software engineering internship.

- **Live app:** https://biryani-darbaar-cvrm.vercel.app
- **Demo logins and setup:** see [`deployment.md`](./deployment.md)

## What it does

**Customers (mobile-first)**
- Choose an outlet by location and delivery radius, with the nearest first
- Menu with photos, veg and non-veg marks, spice level, allergens, and "incl. 5% GST"
- Portions and add-ons, search, category chips and a veg-only filter
- Cart, coupons, loyalty points, a payment sheet (UPI, card, net banking, wallet, cash on delivery) in test mode
- Live order tracking, a live-order pill, "my orders", reorder suggestions that never touch the cart, cancel before the kitchen accepts
- Scratch-card rewards with confetti, ratings, help requests, and party order requests
- In-app notifications and a first-time guide

**Kitchen staff**
- Real-time board per outlet: New, Preparing, Ready, Out for delivery
- Timers, late colouring, a 10-minute late alert, a +5 min override and a new-order sound

**Admin**
- Menu and stock per outlet, add items with serving windows and photos
- Party orders (catering manager view) with call and WhatsApp buttons
- Customer issues, dashboard (orders, prep time, cancellations, repeat customers), staff

## How the AI part works

The prep-time estimate combines each dish's base time, extra portions, and the number of items already queued at the outlet. The promised time is the higher of the estimate and the outlet's minimum. A manager can add time, and an order 10 minutes past its promise raises an alert for the kitchen and the customer. Reorder suggestions come from the customer's own past orders and never add anything to the cart. It is an explainable formula, not a trained model, and it is covered by unit tests.

## Tech stack

Next.js 16 (App Router) with TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Realtime, Row Level Security), Vitest, deployed on Vercel.

## Project layout

```
app/            pages and server actions (customer, kitchen, admin, party, orders, staff)
components/     shared UI (menu, cart bar, payment sheet, notifications, kitchen helpers)
lib/            business logic: pricing, prep time, loyalty, options, geo, party, menu time
supabase/       SQL: schema, seed, feature scripts and RLS policies
public/food/    food photos
```

## Run it locally

Full step-by-step instructions, the SQL run order, and demo accounts are in [`deployment.md`](./deployment.md). In short:

```bash
npm install
cp .env.example .env.local   # fill in the three Supabase values
npm run dev
```

## Tests

```bash
npm test
```

Unit tests cover pricing and coupons, prep-time and the promise rule, loyalty points, option pricing, payment validation, scratch-card prizes, party-order rules, distance ranking and time-based menus.

## Security

No secrets are committed. Row Level Security is on for every table. Orders are created by a server action that verifies the caller's token and recalculates prices and discounts on the server. See `deployment.md` for details and known limits.

## Limits

Payments and WhatsApp messages are mocked. The 1,200 orders per hour peak and the sub-60-second checkout were not load-tested. All names, numbers, FSSAI licences and outlet details are fictional demo data.