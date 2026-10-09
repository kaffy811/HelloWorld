import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Article, StockData, Price } from "./types";
export const marketData = cache(async () => {
  const s = await createClient();
  const { data, error } = await s
    .from("stock_data")
    .select("ticker,kind,payload,source,as_of,updated_at");
  return { data: (data || []) as StockData[], error: Boolean(error) };
});
export function priceFor(data: StockData[], ticker: string) {
  return data.find((d) => d.ticker === ticker && d.kind === "price")
    ?.payload as Price | undefined;
}
export const articles = cache(
  async (ticker?: string, category?: string, page = 1, filters?: {source?:string;topic?:string;sector?:string;q?:string;start?:string|null;end?:string|null}) => {
    const s = await createClient();
    let q = s
      .from("market_articles")
      .select("id,title,excerpt,source,source_key,source_url,category,topic,sector,tickers,published_at,sec_news_id", { count: "exact" })
      .order("published_at", { ascending: false })
      .range((page - 1) * 30, page * 30 - 1);
    if (ticker) q = q.contains("tickers", [ticker]);
    if (category && ["market", "industry", "company"].includes(category))
      q = q.eq("category", category);
    if(category === "policy") q=q.in("topic",["rates","regulation"]);
    if(filters?.source && filters.source!=="all") q=q.eq("source",filters.source);
    if(filters?.topic && filters.topic!=="all") q=q.eq("topic",filters.topic);
    if(filters?.sector && filters.sector!=="all") q=q.eq("sector",filters.sector);
    if(filters?.q) q=q.ilike("title","%"+filters.q+"%");
    if(filters?.start) q=q.gte("published_at",filters.start);
    if(filters?.end) q=q.lt("published_at",filters.end);
    const { data, error, count } = await q;
    const rows = (data || []) as Article[];
    const ids = rows.map((a) => a.sec_news_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: analysis } = await s
        .from("analysis_versions")
        .select("id,news_id")
        .eq("kind", "news")
        .eq("is_public", true)
        .in("news_id", ids)
        .order("created_at", { ascending: false });
      for (const a of rows)
        a.analysis_id = analysis?.find((v) => v.news_id === a.sec_news_id)?.id;
    }
    return { data: rows, error: Boolean(error), count: count || 0 };
  },
);
export {money,change} from "./format";

export const latestNewsImport=cache(async()=>{const s=await createClient();const {data}=await s.from("market_articles").select("collected_at").order("collected_at",{ascending:false}).limit(1);return data?.[0]?.collected_at||null;});
