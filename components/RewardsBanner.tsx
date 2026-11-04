"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPendingReward } from "@/app/rewards";
import ScratchModal from "@/components/ScratchModal";
import type { Reward } from "@/lib/prizes";

export default function RewardsBanner() {
  const [reward, setReward] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setReward(await getPendingReward(session.access_token));
    })();
  }, []);

  if (!reward) return null;
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="glass mt-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left">
        <span className="text-2xl">🎁</span>
        <span className="flex-1 text-sm font-semibold">You have a scratch card waiting</span>
        <span className="rounded-full bg-saffron px-3 py-1 text-xs font-bold text-kitchen">Scratch</span>
      </button>
      {open && (
        <ScratchModal reward={reward} onClose={(s) => { setOpen(false); if (s) setReward(null); }} />
      )}
    </>
  );
}