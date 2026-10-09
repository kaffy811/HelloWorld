import Link from 'next/link';
import {T} from './language-provider';
import {createClient} from '@/lib/supabase/server';
import {easternDate} from '@/lib/news/data';
import type {Analysis} from '@/lib/news/types';

// Preserve earlier single-answer history when consolidating conversations into Chat.
export async function EarlierChatAnswers({ownerId,page=1}:{ownerId:string;page?:number}){
 const s=await createClient();
 const current=Math.max(1,Math.min(1000,page));
 const result=await s.from('analysis_versions').select('id,ticker,content,created_at,run_id',{count:'exact'}).eq('owner_id',ownerId).eq('kind','followup').order('created_at',{ascending:false}).range((current-1)*20,current*20-1);
 const answers=(result.data||[]) as (Pick<Analysis,'id'|'ticker'|'content'|'created_at'>&{run_id:string})[];
 const questions=new Map<string,string>();
 if(answers.length){
  const runs=await s.from('generation_runs').select('id,prompt').eq('owner_id',ownerId).in('id',answers.map(a=>a.run_id));
  for(const r of runs.data||[]){try{const question=JSON.parse(r.prompt.user).question;if(typeof question==='string')questions.set(r.id,question);}catch{/* Older prompts may not have a structured question. */}}
 }
 return <><div className="breadcrumb"><Link href="/assistant"><T text="← Chat"/></Link></div><section className="page-heading"><span className="eyebrow"><T text="PRIVATE AI CONVERSATION"/></span><h1><T text="Earlier answers"/></h1><p><T text="Earlier answers are kept in Chat. Open an answer to revisit its context and continue."/></p></section>{result.error?<p className="notice" role="alert"><T text="Earlier answers are temporarily unavailable. Please try again."/></p>:!answers.length?<p><T text="No earlier answers yet."/></p>:<div className="conversation-list">{answers.map(a=><article className="panel conversation-item" key={a.id}><div className="card-top"><h2><Link href={'/learning/'+a.id}>{a.content.headline}</Link></h2><Link className="ticker" href={'/stocks/'+a.ticker}>{a.ticker}</Link></div>{questions.has(a.run_id)&&<div className="conversation-message user-message"><span className="eyebrow"><T text="YOU ASKED"/></span><p>{questions.get(a.run_id)}</p></div>}<Link className="source" href={'/learning/'+a.id}><T text="Open & continue →"/></Link><time className="small"><T text="Generated "/>{easternDate(a.created_at)}</time></article>)}</div>}{(result.count||0)>20&&<nav className="history-pagination" aria-label="Chat history pages">{current>1&&<Link href={'/assistant?view=earlier&page='+(current-1)}><T text="← Previous"/></Link>}<span><T text="Page "/>{current}<T text=" of "/>{Math.ceil((result.count||0)/20)}</span>{current*20<(result.count||0)&&<Link href={'/assistant?view=earlier&page='+(current+1)}><T text="Next →"/></Link>}</nav>}</>;
}
