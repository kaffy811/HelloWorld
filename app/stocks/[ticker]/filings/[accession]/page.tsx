import Link from 'next/link';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {storedFiling} from '@/lib/news/filing';
import {filingDocument} from '@/lib/news/documents.mjs';
import {adminClient} from '@/lib/news/admin.mjs';
import {filingPath} from '@/lib/news/reading.mjs';
import {OriginalReading} from '@/components/original-reading';
import {TextSelectionHelper} from '@/components/text-selection-helper';
import {ArticleAssistant} from '@/components/article-assistant';
import {T} from '@/components/language-provider';
export const maxDuration=60;
export default async function Filing({params,searchParams}:{params:Promise<{ticker:string;accession:string}>;searchParams:Promise<{part?:string}>}){
 const {ticker:raw,accession}=await params,ticker=raw.toUpperCase(),s=await createClient(),filing=await storedFiling(s,ticker,accession);if(!filing)notFound();
 let doc=null;try{doc=await filingDocument(adminClient(),filing.url,{fetchMissing:true});}catch{/* An unavailable original stays labelled; summary is never presented as a full report. */}
 const {data:{user}}=await s.auth.getUser(),path=filingPath(ticker,accession),source={kind:'filing' as const,id:ticker+':'+accession},signedIn=!!user&&!user.is_anonymous;
 return <><div className="breadcrumb"><Link href={'/stocks/'+ticker+'/financials'}>← {ticker} · <T text="Financials"/></Link><span>／</span>{filing.form}</div><article className="source-article" data-readable="true"><span className="eyebrow">SEC · {ticker}</span><h1>{filing.title}</h1><p className="small"><T text="Filed "/>{filing.date} · <T text="Period ended "/>{filing.period}</p>{doc?<><ArticleAssistant source={source} title={filing.title} signedIn={signedIn} returnPath={path}/><OriginalReading text={doc.full_text} path={path} part={Number((await searchParams).part)||1}/></>:<div className="panel notice"><p><T text="The original report could not be loaded. Please retry; the financial summary is not the full report."/></p><Link className="button secondary" href={path}><T text="Try again"/></Link></div>}<a className="source small" href={filing.url} target="_blank" rel="noopener noreferrer"><T text="Source website ↗"/></a></article><TextSelectionHelper source={source} signedIn={signedIn} returnPath={path}/></>;
}
