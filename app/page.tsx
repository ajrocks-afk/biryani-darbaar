import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

async function Outlets() {
  const { data: outlets, error } = await supabase
    .from("outlets")
    .select("id, name, fssai_no");
  if (error) {
    return <p className="text-red-600">Error: {error.message}</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {outlets?.map((o) => (
        <li key={o.id}>
          {o.name} (FSSAI {o.fssai_no})
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Biryani Darbaar</h1>
      <Suspense fallback={<p className="mt-4">Loading outlets...</p>}>
        <Outlets />
      </Suspense>
    </main>
  );
}