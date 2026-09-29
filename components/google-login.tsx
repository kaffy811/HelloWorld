"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function GoogleLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    } catch { setError("Google sign-in is unavailable. Please try again or contact the site owner."); setBusy(false); }
  }
  return <><button className="button" onClick={login} disabled={busy}>{busy ? "Connecting…" : "Continue with Google"}</button>{error && <p role="alert" className="notice">{error}</p>}</>;
}
