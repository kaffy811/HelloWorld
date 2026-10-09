"use client";
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function GoogleLogin({ next = "/" }: { next?: string }) {
 const {t:ui}=useLanguage();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setError("");
    try {
      const prepared = await fetch("/auth/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next }),
      });
      if (!prepared.ok) throw new Error("Unable to prepare sign-in.");
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError(
        "Google sign-in is unavailable. Please try again or contact the site owner.",
      );
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button" onClick={login} disabled={busy}>
        {busy ? <T text="Connecting…"/> : <T text="Continue with Google"/>}
      </button>
      {error && (
        <p role="alert" className="notice">
          {ui(error)}
        </p>
      )}
    </>
  );
}
