import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import { ArticleAssistant } from "@/components/article-assistant";
import { TextSelectionHelper } from "@/components/text-selection-helper";
import { concepts } from "@/lib/market/concepts.mjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/news/validation.mjs";
import { easternDate } from "@/lib/news/data";
import type { Article } from "@/lib/market/types";
export default async function ArticleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
 const {t:ui}=await getTranslator();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await createClient();
  const { data, error } = await s
    .from("market_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("News is temporarily unavailable.");
  if (!data) notFound();
  const a = data as Article;
  if (a.sec_news_id) {
    const { data: ai } = await s
      .from("analysis_versions")
      .select("id")
      .eq("news_id", a.sec_news_id)
      .eq("kind", "news")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (ai?.[0]) redirect("/news/" + ai[0].id);
  }
  const {data:{user}}=await s.auth.getUser();
  return (
    <>
      <div className="breadcrumb">
        <Link href="/news"><T text="News"/></Link>
        <span>／</span>
        {a.source}
      </div>
      <article className="source-article" data-readable="true">
        <span className="eyebrow">
          {a.source} · {ui(a.category)}
        </span>
        <h1>{a.title}</h1>
        <time className="small"><T text="Published "/>{easternDate(a.published_at)}</time>
        <ArticleAssistant source={{kind:"article",id}} title={a.title} signedIn={Boolean(user)} returnPath={"/articles/"+id}/>
        <p className="lead">{a.excerpt}</p>
        <a
          className="button"
          href={a.source_url}
          target="_blank"
          rel="noopener noreferrer"
        ><T text="Read the original report ↗"/></a>
        <div className="article-companies">
          {a.tickers.map((t) => (
            <Link className="ticker" key={t} href={`/stocks/${t}`}>
              {t}<T text=" · Overview →"/></Link>
          ))}
        </div>
        <section className="panel">
          <h2><T text="Source first"/></h2>
          <p><T text="This page contains the available source title and excerpt. AI explains that saved context; read the original report for the full document."/></p>
          <Link className="source" href="/news"><T text="Browse more news →"/></Link>
        </section>
      </article>
      <TextSelectionHelper source={{kind:"article",id}} choices={concepts.map(c=>({text:c.term,definition:c.definition,selection:{concept:c.key},provenance:"Learning library"}))} signedIn={Boolean(user)} returnPath={"/articles/"+id}/>
    </>
  );
}
