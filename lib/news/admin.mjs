import { createClient } from "@supabase/supabase-js";
import {aiEnabled} from '../ai/billing.mjs';
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Background database access is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export function generationConfigured() {
  return Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_MODEL &&
    (process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    aiEnabled(),
  );
}
