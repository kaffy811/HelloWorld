import {getLanguage} from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import {
  mutationUser,
  boundedBytes,
  errorResponse,
  HttpError,
} from "@/lib/news/api";
import { UUID, publicText } from "@/lib/news/validation.mjs";
import { adminClient, generationConfigured } from "@/lib/news/admin.mjs";
import { generateSaved } from "@/lib/news/generation.mjs";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { supabase: s, user } = await mutationUser(request);
    const bytes = await boundedBytes(request, 20000);
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const parent = form.get("parent_id");
    if (typeof parent !== "string" || !UUID.test(parent))
      throw new HttpError(
        410,
        "Learning cards have been retired. Ask a question from a news explanation.",
      );
    if (!generationConfigured())
      throw new HttpError(503, "AI answers are temporarily unavailable.");
    if (form.get("public_material") !== "true")
      throw new HttpError(
        400,
        "Confirm that your question contains no private information.",
      );
    if (form.has("file"))
      throw new HttpError(400, "Ask a text question about this news report.");
    const { data: base } = await s
      .from("analysis_versions")
      .select("id,ticker,kind,evidence,data_as_of")
      .eq("id", parent)
      .maybeSingle();
    if (!base || !["news", "followup"].includes(base.kind))
      throw new HttpError(404, "The original explanation is unavailable.");
    const { data: company } = await s
      .from("companies")
      .select("ticker,name,sector,summary,learning_question,source_url")
      .eq("ticker", base.ticker)
      .maybeSingle();
    if (!company) throw new HttpError(404, "Company unavailable.");
    let question;
    try {
      question = publicText(form.get("text"));
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const id = await generateSaved({
      admin: adminClient(),
      company,
      evidence: base.evidence,
      kind: "followup",
      ownerId: user.id,
      parentId: base.id,
      uploadId: null,
      question,
      language: await getLanguage(),
      dataAsOf: base.data_as_of,
    });
    revalidatePath("/notebook");
    return Response.json({ id });
  } catch (e) {
    return errorResponse(e);
  }
}
