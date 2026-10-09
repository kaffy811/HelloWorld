import {
  mutationUser,
  jsonBody,
  errorResponse,
  HttpError,
} from "@/lib/news/api";
import { validRating } from "@/lib/news/validation.mjs";
export async function POST(request: Request) {
  try {
    const { supabase, user } = await mutationUser(request);
    let input;
    try {
      input = validRating(await jsonBody(request));
    } catch {
      throw new HttpError(400, "Choose an available rating.");
    }
    const { error } = await supabase
      .from("ratings")
      .insert({ ...input, user_id: user.id });
    if (error?.code === "23505")
      throw new HttpError(409, "You have already rated this version.");
    if (error)
      throw new HttpError(403, "This explanation is not available for rating.");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
