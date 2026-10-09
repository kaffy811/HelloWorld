import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { config } from "@/lib/supabase/config";
import { routeCookies } from "@/lib/supabase/route-cookies.mjs";
import { requestOrigin } from "@/lib/news/validation.mjs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const store = await cookies();
  const sessionCookies = routeCookies(store.getAll());
  if (code) {
    const { url: supabaseUrl, key } = config();
    const supabase = createServerClient(supabaseUrl, key, { cookies: sessionCookies.cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("auth_callback_failed", { stage: "user", code: userError?.code, status: userError?.status });
        return sessionCookies.finish(NextResponse.redirect(new URL("/login?error=callback", origin)));
      }
      // The exchange response writes cookies before the confirmation page is rendered.
      // A subsequent full navigation verifies the stored session, without a second OAuth.
      const response = NextResponse.redirect(new URL("/auth/verified", origin));
      response.headers.set("Referrer-Policy", "no-referrer");
      return sessionCookies.finish(response);
    }
    console.warn("auth_callback_failed", { stage: "exchange", code: error.code, status: error.status });
  }
  return sessionCookies.finish(NextResponse.redirect(new URL("/login?error=callback", origin)));
}
