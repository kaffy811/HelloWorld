import { createClient } from "@/lib/supabase/server";
import type { Analysis, Company } from "./types";
export const analysisColumns =
  "id,ticker,news_id,owner_id,kind,parent_id,content,evidence,is_public,created_at,data_as_of,language";
export async function companies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("ticker,name,sector,summary,learning_question,source_url")
    .order("name");
  return { data: (data || []) as Company[], error: Boolean(error) };
}
export async function analyses(ticker?: string, kind?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("analysis_versions")
    .select(analysisColumns)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);
  if (ticker) query = query.eq("ticker", ticker);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  return { data: (data || []) as Analysis[], error: Boolean(error) };
}
export {easternDate} from "@/lib/date";

export const impactLabels = {
  positive: "Potential business benefit",
  negative: "Potential business pressure",
  mixed: "Mixed business impact",
  unknown: "Impact is uncertain",
};
