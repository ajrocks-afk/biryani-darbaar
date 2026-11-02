import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import StaffRedirect from "@/components/StaffRedirect";

async function Outlets() {
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, name, fssai_no, is_cloud_kitchen, delivery_radius_km")
    .order("name");

  if (error) return <p className="text-red-600">Could not load outlets: {error.message}</p>;
  if (!outlets?.length) return <p className="text-neutral-500">No outlets available right now.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {outlets.map((o) => (
        <li key={o.id}>
          <Link
            href={`/menu/${o.id}`}
            className="block rounded-xl border border-neutral-200 p-4 hover:border-neutral-900 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.name}</span>
              {o.is_cloud_kitchen && (
                <span className="text-xs rounded-full bg-neutral-100 px-2 py-0.5">Cloud kitchen</span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Delivers within {o.delivery_radius_km} km · FSSAI {o.fssai_no}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6">
      <StaffRedirect />
      <h1 className="text-3xl font-semibold tracking-tight">Biryani Darbaar</h1>
      <p className="mt-1 text-neutral-500">Choose your outlet to start ordering.</p>
      <Suspense fallback={<p className="mt-6 text-neutral-500">Loading outlets...</p>}>
        <Outlets />
      </Suspense>
    </main>
  );
}