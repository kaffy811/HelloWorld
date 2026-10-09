import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath, requestOrigin } from "@/lib/news/validation.mjs";
import { onboardingDestination } from "@/lib/onboarding";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const next = safeReturnPath((await cookies()).get("learning_return")?.value);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
