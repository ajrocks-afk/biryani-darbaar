"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPendingReward } from "@/app/rewards";
import { burst } from "@/lib/confetti";
import ScratchModal from "@/components/ScratchModal";
import type { Reward } from "@/lib/prizes";

export default function OrderCelebration({ orderNo }: { orderNo: string }) {
  const [reward, setReward] = useState<Reward | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    burst("order");
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const r = await getPendingReward(session.access_token, orderNo);
      if (r) setTimeout(() => setReward(r), 1400);
    })();
  }, [orderNo]);

  function close() {
    setReward(null);
    // remove ?new=1 so a refresh doesn't replay the celebration
    window.history.replaceState(null, "", `/order/${orderNo}`);
  }

  return (
    <>
      <div className="pop mb-4 rounded-2xl bg-emerald p-3 text-center font-semibold text-white">
        🎉 Order placed successfully!
      </div>
      {reward && <ScratchModal reward={reward} onClose={close} />}
    </>
  );
}