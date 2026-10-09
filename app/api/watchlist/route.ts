import { revalidatePath } from "next/cache";
import {
  mutationUser,
  jsonBody,
  errorResponse,
  HttpError,
} from "@/lib/news/api";
export async function POST(request: Request) {
  try {
    const { supabase, user } = await mutationUser(request);
    const { ticker, follow } = await jsonBody(request);
    if (
      typeof ticker !== "string" ||
      !/^[A-Z.]{1,10}$/.test(ticker) ||
      typeof follow !== "boolean"
    )
      throw new HttpError(400, "Choose a supported US company.");
    const { error } = follow
      ? await supabase
          .from("watchlist")
          .upsert(
            { user_id: user.id, ticker },
            { onConflict: "user_id,ticker", ignoreDuplicates: true },
          )
      : await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("ticker", ticker);
    if (error) throw new HttpError(503, "Your watchlist could not be saved.");
    revalidatePath("/watchlist");
    revalidatePath("/");
    revalidatePath(`/stocks/${ticker}`);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
