"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { needsAuthRefresh } from "@/lib/supabase/route-cookies.mjs";

export function AuthSessionSync({ userId }: { userId: string | null }) {
  const router = useRouter();
  const lastRefreshed = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) return;
      const id = session?.user?.id ?? null;
      if (id === userId) lastRefreshed.current = undefined;
      else if (needsAuthRefresh(userId, id, lastRefreshed.current)) {
        lastRefreshed.current = id;
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, userId]);
  return null;
}
