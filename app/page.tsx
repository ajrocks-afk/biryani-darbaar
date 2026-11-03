import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import StaffRedirect from "@/components/StaffRedirect";

async function Outlets() {
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, name, fssai_no, is_cloud_kitchen, delivery_radius_km")
    .order("name");

  if (error) return <p className="text-red-700">Could not load outlets. Please refresh.</p>;
  if (!outlets?.length) return <p className="text-ink/60">No outlets are open right now.</p>;

  return (
    <ul className="space-y-3">
      {outlets.map((o) => (
        <li key={o.id}>
          <Link
            href={`/menu/${o.id}`}
            className="block rounded-2xl border border-sand bg-white p-5 transition hover:border-emerald hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold">{o.name}</span>
              {o.is_cloud_kitchen && (
                <span className="rounded-full bg-terracotta/10 px-2.5 py-0.5 text-xs font-medium text-terracotta">
                  Cloud kitchen
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink/60">
              Delivers within {o.delivery_radius_km} km · FSSAI {o.fssai_no}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OutletsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-sand" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <StaffRedirect />
      <section className="bg-emerald px-5 py-12 text-center text-cream">
        <h1 className="font-display text-4xl font-bold">Hyderabad's biryani , darbaar.</h1>
        <p className="mx-auto mt-3 max-w-sm text-cream/80">
          Dum-cooked, delivered hot. Order from your nearest outlet.
        </p>
      </section>
      <div className="mx-auto max-w-2xl px-5 py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Choose your outlet
        </h2>
        <Suspense fallback={<OutletsSkeleton />}>
          <Outlets />
        </Suspense>
      </div>
    </main>
  );
}