import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/news/validation.mjs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id))
    return Response.json({ error: "Not found." }, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { data: analysis } = await supabase
    .from("analysis_versions")
    .select("run_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!analysis) return Response.json({ error: "Not found." }, { status: 404 });
  const { data } = await supabase
    .from("generation_runs")
    .select("prompt")
    .eq("id", analysis.run_id)
    .maybeSingle();
  if (!data) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json(data.prompt, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="generation-prompt.json"',
    },
  });
}
