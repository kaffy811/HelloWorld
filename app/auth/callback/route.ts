import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { config } from "@/lib/supabase/config";
import { routeCookies } from "@/lib/supabase/route-cookies.mjs";
import { safeReturnPath, requestOrigin } from "@/lib/news/validation.mjs";
import { onboardingDestination } from "@/lib/onboarding";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const store = await cookies();
  const next = safeReturnPath(store.get("learning_return")?.value);
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
      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("display_name,first_name,last_name,onboarding_completed_at")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };
      const destination = profile
        ? onboardingDestination(profile)
        : "/onboarding";
      const response = NextResponse.redirect(
        new URL(destination === "/" ? next : destination, origin),
      );
      if (destination === "/") response.cookies.delete("learning_return");
      if (next !== "/" && destination !== "/")
        response.cookies.set("learning_return", next, {
          httpOnly: true,
          sameSite: "lax",
          secure: origin.startsWith("https:"),
          maxAge: 1800,
          path: "/",
        });
      return sessionCookies.finish(response);
    }
    console.warn("auth_callback_failed", { stage: "exchange", code: error.code, status: error.status });
  }
  return sessionCookies.finish(NextResponse.redirect(new URL("/login?error=callback", origin)));
}
