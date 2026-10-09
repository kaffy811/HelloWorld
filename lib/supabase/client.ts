import { createBrowserClient } from "@supabase/ssr";
import { config } from "./config";
// The server callback exclusively exchanges OAuth codes. A browser client
// must not race it or consume a fallback code when a button is clicked later.
export function createClient() { const { url, key } = config(); return createBrowserClient(url, key, { auth: { detectSessionInUrl: false } }); }
