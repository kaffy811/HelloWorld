import {getTranslator} from "@/lib/i18n/server";

import {articleOriginal} from '@/lib/news/original';
import {originalPage,readingParagraphs} from '@/lib/news/original-text.mjs';
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
export default async function ArticleDetail({
  params,searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{part?:string}>;
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
  const original=await articleOriginal(a),part=original?originalPage(original.text,Number((await searchParams).part)||1):null;
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
        {original&&part?<section className="original-reading"><div className="original-reading-heading"><span className="eyebrow"><T text="ORIGINAL SOURCE TEXT"/></span><p className="small"><T text="Select an unfamiliar word or sentence to explain it and save it to Terms."/></p></div><div className="original-body">{readingParagraphs(part.text).map((paragraph:string,i:number)=><p key={i}>{paragraph}</p>)}</div>{part.total>1&&<nav className="history-pagination" aria-label={ui('Original text pages')}>{part.page>1&&<Link href={'/articles/'+id+'?part='+(part.page-1)}><T text="← Previous"/></Link>}<span><T text="Page "/>{part.page}<T text=" of "/>{part.total}</span>{part.page<part.total&&<Link href={'/articles/'+id+'?part='+(part.page+1)}><T text="Next →"/></Link>}</nav>}</section>:<><p className="lead">{a.excerpt}</p><p className="small"><T text="Summary available here. The original article can be read on the publisher’s website."/></p></>}
        <a
          className="button"
          href={original?.url||a.source_url}
          target="_blank"
          rel="noopener noreferrer"
        ><T text="Read the original report ↗"/></a>
        <div className="article-companies">
          {a.tickers.map((t) => (
            <Link className="ticker" key={t} href={`/stocks/${t}`}>
              {t}<T text=" · Overview →"/></Link>
          ))}
        </div>

      </article>
      <TextSelectionHelper source={{kind:"article",id}} choices={concepts.map(c=>({text:c.term,definition:c.definition,selection:{concept:c.key},provenance:"Learning library"}))} signedIn={Boolean(user)} returnPath={"/articles/"+id}/>
    </>
  );
}
