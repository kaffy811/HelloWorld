import { NextResponse } from "next/server";
import { assertSameOrigin, safeReturnPath } from "@/lib/news/validation.mjs";
import { jsonBody, errorResponse, HttpError } from "@/lib/news/api";
export async function POST(request: Request) {
  try {
    try {
      assertSameOrigin(request);
    } catch {
      throw new HttpError(403, "Start sign-in from this website.");
    }
    const input = await jsonBody(request);
    const next = safeReturnPath(input.next);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("learning_return", next, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        new URL(request.url).protocol === "https:" ||
        request.headers.get("x-forwarded-proto") === "https",
      maxAge: 1800,
      path: "/",
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
