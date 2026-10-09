import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "./validation.mjs";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function mutationUser(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    throw new HttpError(403, "This request must come from this website.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous)
    throw new HttpError(401, "Sign in to continue.");
  return { supabase, user };
}
export async function boundedBytes(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new HttpError(413, "This upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request content.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, "This upload is too large.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request) {
  try {
    return JSON.parse((await boundedBytes(request, 20000)).toString());
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Invalid request.");
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "";
  if (/limit reached|quota reached|already being processed/.test(message))
    return Response.json(
      {
        error:
          "The generation limit has been reached or this item is being processed. Please try again later.",
      },
      { status: 429 },
    );
  return Response.json(
    { error: "We could not complete this action. Please try again later." },
    { status: 503 },
  );
}
