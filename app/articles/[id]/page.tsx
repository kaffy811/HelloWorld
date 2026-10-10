import {getTranslator} from "@/lib/i18n/server";

import {articleOriginal} from '@/lib/news/original';
import {formattedPage} from '@/lib/news/filing-format.mjs';
import {originalPage} from '@/lib/news/original-text.mjs';
import {OriginalReading} from '@/components/original-reading';
import {stockReturn} from '@/lib/news/reading.mjs';
import {T} from "@/components/language-provider";
import { ArticleAssistant } from "@/components/article-assistant";
import { TextSelectionHelper } from "@/components/text-selection-helper";
import { concepts } from "@/lib/market/concepts.mjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/news/validation.mjs";
import { easternDate } from "@/lib/news/data";
import type { Article } from "@/lib/market/types";
export const maxDuration=60;
export default async function ArticleDetail({
  params,searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{part?:string;from?:string}>;
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
  const q=await searchParams,from=stockReturn(q.from,a.tickers),path='/articles/'+id;
  const original=await articleOriginal(a);
  const part=original?(formattedPage(original,Number(q.part)||1)||originalPage(original.text,Number(q.part)||1)).page:1;
  const {data:{user}}=await s.auth.getUser();const signedIn=!!user&&!user.is_anonymous;
  return (
    <>
      <div className="breadcrumb">
        <Link href={from||"/news"}>{from?<>← {from.split("/")[2]} · <T text="Back to stock"/></>:<T text="News"/>}</Link>
        <span>／</span>
        {a.source}
      </div>
      <article className="source-article" data-readable="true">
        <span className="eyebrow">
          {a.source} · {ui(a.category)}
        </span>
        <h1>{a.title}</h1>
        <time className="small"><T text="Published "/>{easternDate(a.published_at)}</time>
        <ArticleAssistant source={{kind:"article",id}} title={a.title} signedIn={signedIn} returnPath={path+(from?'?from='+encodeURIComponent(from):'')}/>
        {original?<OriginalReading text={original.text} path={path} part={part} from={from} formatted={original}/>:<><div className="panel notice"><p><T text="The original article could not be loaded. Please retry; this is a source summary only."/></p><Link className="button secondary" href={path+(from?'?from='+encodeURIComponent(from):'')}><T text="Try again"/></Link></div><p className="lead">{a.excerpt}</p></>}
        <a className="source small" href={original?.url||a.source_url} target="_blank" rel="noopener noreferrer"><T text="Source website ↗"/></a>
        <div className="article-companies">
          {a.tickers.map((t) => (
            <Link className="ticker" key={t} href={`/stocks/${t}`}>
              {t}<T text=" · Overview →"/></Link>
          ))}
        </div>

      </article>
      <TextSelectionHelper source={{kind:"article",id,part}} choices={concepts.map(c=>({text:c.term,definition:c.definition,selection:{concept:c.key},provenance:"Learning library"}))} signedIn={signedIn} returnPath={path+(from?'?from='+encodeURIComponent(from):'')}/>
    </>
  );
}
