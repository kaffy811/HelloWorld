import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {concepts} from '@/lib/market/concepts.mjs';
import {readingNotes} from '@/lib/market/learning-path.mjs';
import {createClient} from '@/lib/supabase/server';
import {BookmarkButton} from '@/components/bookmark-button';
import {EmojiFeedback} from '@/components/emoji-feedback';
import {ArticleAssistant} from '@/components/article-assistant';
import {TextSelectionHelper} from '@/components/text-selection-helper';
export default async function Lesson({params}:{params:Promise<{key:string}>}){
 const {t:ui}=await getTranslator();
 const {key}=await params,c=concepts.find(c=>c.key===key);if(!c)notFound();
 const s=await createClient(),{data:{user}}=await s.auth.getUser();const [bookmark,feedback]=user?await Promise.all([s.from('knowledge_bookmarks').select('id').eq('user_id',user.id).eq('source_key','concept:'+key).maybeSingle(),s.from('content_feedback').select('score').eq('user_id',user.id).eq('target_key','concept:'+key).maybeSingle()]):[{data:null},{data:null}];
 const source=['market-order','limit-order'].includes(key)?'https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders':['stock','price-value'].includes(key)?'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks':'https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements';
 return <><div className="breadcrumb"><Link href="/learn"><T text="Learn"/></Link><span>／</span>{ui(c.term)}</div><article className="lesson-article" data-readable="true"><header className="page-heading"><span className="eyebrow"><T text="EDITORIAL LEARNING EXPLANATION · US STOCKS"/></span><h1>{ui(c.term)}</h1><p className="lead">{ui(c.definition)}</p><BookmarkButton selection={{concept:key}} initial={!!bookmark.data} signedIn={!!user} returnPath={'/learn/'+key}/></header><ArticleAssistant source={{kind:"concept",id:key}} title={ui(c.term)} signedIn={!!user} returnPath={"/learn/"+key}/><section className="analysis-section"><h2><T text="How to read it in context"/></h2>{(readingNotes[key as keyof typeof readingNotes]||[]).map((text:string,i:number)=><p key={i}>{ui(text)}</p>)}</section><section className="panel question"><span className="eyebrow"><T text="CHECK YOUR UNDERSTANDING"/></span><h3>{ui(c.question)}</h3><p><T text="Try writing your explanation in your own words, then revisit this definition."/></p><Link className="source" href="/notebook/notes/new"><T text="Write a private note →"/></Link></section><section className="analysis-section"><h2><T text="Keep the source nearby"/></h2><a className="source" href={source} target="_blank" rel="noopener noreferrer">{source.includes('sec.gov')?<T text="SEC beginner guide to financial statements"/>:source.includes('types-orders')?<T text="Investor.gov guide to order types"/>:<T text="Investor.gov introduction to stocks"/>} ↗</a><p className="small"><T text="This is an editorial learning-library article. AI explanations are labeled and saved as separate versions."/></p></section><EmojiFeedback concept={key} initial={feedback.data?.score??null} signedIn={!!user} returnPath={'/learn/'+key} editorial/></article><TextSelectionHelper source={{kind:"concept",id:key}} choices={concepts.map(c=>({text:c.term,definition:c.definition,selection:{concept:c.key},provenance:'Learning library'}))} signedIn={!!user} returnPath={'/learn/'+key}/></>;
}
