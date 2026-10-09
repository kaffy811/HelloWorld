import {glossary,glossaryText} from '@/lib/market/glossary.mjs';
import {getLanguage} from '@/lib/i18n/server';
import { revalidatePath } from "next/cache";
import {
  mutationUser,
  jsonBody,
  errorResponse,
  HttpError,
} from "@/lib/news/api";
import { UUID } from "@/lib/news/validation.mjs";
import { adminClient } from "@/lib/news/admin.mjs";
import { resolveBookmark } from "@/lib/market/concepts.mjs";
import { analysisColumns } from "@/lib/news/data";
export async function POST(request: Request) {
  try {
    const { supabase, user } = await mutationUser(request);
    const input = await jsonBody(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new HttpError(400, "Invalid saved item.");
    if(input.glossary){const entry=glossary.find(g=>g.key===input.glossary);if(!entry)throw new HttpError(400,"Choose a known glossary term.");const language=await getLanguage(),g=glossaryText(entry,language);const {error}=await adminClient().from("knowledge_bookmarks").upsert({user_id:user.id,source_key:"glossary:"+entry.key+":"+language,kind:"term",text:g.term,explanation:g.definition,source_url:"/learn",provenance:"Learning library"},{onConflict:"user_id,source_key",ignoreDuplicates:true});if(error)throw new HttpError(503,"Your notebook is temporarily unavailable. Please try again.");revalidatePath("/notebook");return Response.json({saved:true});}
    if (!input.concept && input.section !== "terms") throw new HttpError(410,"Sentence collections have been retired. Save an explained term or write your own note.");
    let analysis = null;
    if (!input.concept) {
      if (!UUID.test(input.analysis_id || ""))
        throw new HttpError(400, "Choose a term or sentence.");
      const { data } = await supabase
        .from("analysis_versions")
        .select(analysisColumns)
        .eq("id", input.analysis_id)
        .maybeSingle();
      if (!data) throw new HttpError(404, "The explanation is unavailable.");
      analysis = data;
    }
    let bookmark;
    try {
      bookmark = resolveBookmark(input, analysis);
    } catch {
      throw new HttpError(
        400,
        "Choose a term or sentence from this explanation.",
      );
    }
    // Authentication and source visibility were checked with the user's RLS client.
    // Ignore user-submitted text/definition; store only the canonical source snapshot.
    const { data, error } = await adminClient()
      .from("knowledge_bookmarks")
      .upsert(
        { ...bookmark, user_id: user.id },
        { onConflict: "user_id,source_key", ignoreDuplicates: true },
      )
      .select("id");
    if (error)
      throw new HttpError(
        503,
        "Your notebook is temporarily unavailable. Please try again.",
      );
    revalidatePath("/notebook");
    return Response.json({ saved: true, id: data?.[0]?.id });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await mutationUser(request);
    const input = await jsonBody(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new HttpError(400, "Invalid saved item.");
    if (!UUID.test(input.id || ""))
      throw new HttpError(400, "Invalid saved item.");
    const { error } = await supabase
      .from("knowledge_bookmarks")
      .delete()
      .eq("id", input.id)
      .eq("user_id", user.id);
    if (error) throw new Error("delete");
    revalidatePath("/notebook");
    return Response.json({ removed: true });
  } catch (e) {
    return errorResponse(e);
  }
}
