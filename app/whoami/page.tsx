"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function WhoAmI() {
  const [out, setOut] = useState("loading...");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setOut("NOT SIGNED IN (no session)"); return; }
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", session.user.id);
      setOut(JSON.stringify({ email: session.user.email, profileRows: data, error }, null, 2));
    })();
  }, []);

  return <pre className="p-6 text-sm">{out}</pre>;
}