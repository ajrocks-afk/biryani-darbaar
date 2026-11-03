import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import StaffRedirect from "@/components/StaffRedirect";
import FoodImage from "@/components/FoodImage";
import BlurText from "@/components/ui/BlurText";
import Reveal from "@/components/ui/Reveal";

const CATEGORIES = [
  { label: "Chicken", img: "chicken-biryani" },
  { label: "Mutton", img: "mutton-biryani" },
  { label: "Veg", img: "veg-biryani" },
  { label: "Desserts", img: "meetha" },
];
const BESTSELLERS = ["Chicken Dum Biryani", "Mutton Dum Biryani", "Mutton Haleem", "Paneer Tikka", "Double ka Meetha"];
const WHY = [
  { icon: "🔥", t: "Dum cooked" },
  { icon: "📡", t: "Live tracking" },
  { icon: "🧾", t: "GST included" },
  { icon: "✅", t: "FSSAI licensed" },
];

async function Bestsellers() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, photo_url, is_veg, item_prices(price_inr)")
    .in("name", BESTSELLERS);
  if (error || !data?.length) return null;

  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
      {data.map((m: any) => (
        <a key={m.id} href="#outlets" className="glass w-40 shrink-0 snap-start overflow-hidden rounded-2xl">
          <div className="relative h-28 w-full">
            <FoodImage src={m.photo_url} alt={m.name} />
            <span className="absolute left-2 top-2 rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white">
              Bestseller
            </span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${m.is_veg ? "bg-green-700" : "bg-red-700"}`} />
              <p className="truncate text-sm font-semibold">{m.name}</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-emerald">₹{m.item_prices?.[0]?.price_inr}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

async function Outlets() {
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, name, fssai_no, is_cloud_kitchen, delivery_radius_km")
    .order("name");
  if (error) return <p className="text-red-700">Could not load outlets. Please refresh.</p>;
  if (!outlets?.length) return <p className="text-ink/60">No outlets are open right now.</p>;

  return (
    <ul className="space-y-3">
      {outlets.map((o, i) => (
        <li key={o.id}>
          <Reveal delay={i * 0.06}>
            <Link href={`/menu/${o.id}`} className="glass flex items-center justify-between rounded-2xl p-4">
              <div>
                <p className="font-display text-base font-bold">{o.name}</p>
                <p className="mt-0.5 text-xs text-ink/60">
                  {o.delivery_radius_km} km delivery · FSSAI {o.fssai_no}
                </p>
                {o.is_cloud_kitchen && (
                  <span className="mt-1 inline-block rounded-full bg-terracotta/10 px-2 py-0.5 text-[10px] font-medium text-terracotta">
                    Cloud kitchen
                  </span>
                )}
              </div>
              <span className="text-xl text-emerald">›</span>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

const Skeleton = ({ h }: { h: string }) => <div className={`${h} animate-pulse rounded-2xl bg-sand`} />;

export default function Home() {
  return (
    <main className="pb-28">
      <StaffRedirect />

      {/* Hero */}
      <section
        className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-emerald bg-cover bg-center"
        style={{ backgroundImage: "url(/food/chicken-biryani.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative flex h-80 flex-col justify-end p-5 text-white">
          <h1 className="font-display text-3xl font-bold leading-tight">
            <BlurText text="Your Royal Feast Awaits." />
          </h1>
          <p className="shiny mt-1 text-sm">Slow-cooked dum. Rich aromas. Delivered hot.</p>
          <a href="#outlets" className="mt-4 block rounded-xl bg-saffron py-3 text-center text-sm font-bold text-kitchen shadow-lg">
            ORDER NOW →
          </a>
        </div>
      </section>

      <div className="px-4">
        {/* Categories */}
        <Reveal className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold">Explore the menu</h2>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <a key={c.label} href="#outlets" className="relative h-24 overflow-hidden rounded-2xl shadow-md">
                <FoodImage src={`/food/${c.img}.jpg`} alt={c.label} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute inset-x-0 bottom-1.5 text-center text-xs font-semibold text-white">
                  {c.label}
                </span>
              </a>
            ))}
          </div>
        </Reveal>

        {/* Offer banner */}
        <Reveal className="mt-6">
          <div className="relative overflow-hidden rounded-3xl bg-emerald-dark p-5 text-white">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-saffron/30" />
            <p className="text-xs uppercase tracking-widest text-saffron">Today's offer</p>
            <p className="mt-1 font-display text-2xl font-bold">Get 10% OFF</p>
            <p className="mt-1 text-xs text-white/70">On orders above ₹300 · up to ₹150 off</p>
            <span className="mt-3 inline-block rounded-lg border border-dashed border-saffron px-3 py-1 text-sm font-bold tracking-wider text-saffron">
              Use code DARBAAR10
            </span>
          </div>
        </Reveal>

        {/* Bestsellers */}
        <Reveal className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold">Darbaar's bestsellers</h2>
          <Suspense fallback={<Skeleton h="h-44" />}>
            <Bestsellers />
          </Suspense>
        </Reveal>

        {/* Why us */}
        <Reveal className="mt-6">
          <div className="glass grid grid-cols-4 gap-2 rounded-2xl p-3 text-center">
            {WHY.map((w) => (
              <div key={w.t}>
                <div className="text-2xl">{w.icon}</div>
                <p className="mt-1 text-[11px] font-medium leading-tight">{w.t}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Outlets */}
        <section id="outlets" className="mt-8 scroll-mt-4">
          <h2 className="mb-3 font-display text-lg font-bold">Choose your outlet</h2>
          <Suspense fallback={<div className="space-y-3"><Skeleton h="h-16" /><Skeleton h="h-16" /><Skeleton h="h-16" /></div>}>
            <Outlets />
          </Suspense>
        </section>
      </div>
    </main>
  );
}