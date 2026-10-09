import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as getConfig } from "@/lib/supabase/config";
import { fallbackCallback } from "@/lib/supabase/route-cookies.mjs";
export async function proxy(request: NextRequest) {
  const callback = fallbackCallback(request);
  if (callback) {
    const response = NextResponse.redirect(callback);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  let response = NextResponse.next({ request });
  const { url, key } = getConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/",
    "/onboarding/:path*",
    "/profile/:path*",
    "/notebook/:path*",
    "/auth/:path*",
    "/login",
    "/news/:path*",
    "/articles/:path*",
    "/learn/:path*",
    "/learning/:path*",
    "/stocks/:path*",
    "/watchlist",
    "/materials",
    "/assistant",
    "/feedback",
    "/api/:path*",
  ],
};
