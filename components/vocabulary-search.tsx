'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useLanguage,T} from './language-provider';
import {BookmarkButton} from './bookmark-button';
import {AISave,AIRating} from './ai-output-tools';
import type {AIOutput} from '@/lib/ai/types';
type Entry={term:string;definition:string;selection:{glossary?:string;topic?:string};source_key:string};
export function VocabularySearch({signedIn,initialQuery=''}:{signedIn:boolean;initialQuery?:string}){
 const router=useRouter();
 const {language,t:ui}=useLanguage(),[query,setQuery]=useState(initialQuery),[result,setResult]=useState<{entry?:Entry;output?:AIOutput;saved?:boolean;text:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[missing,setMissing]=useState(false);
 async function search(){const text=query.trim();if(!text||busy)return;setBusy(true);setError('');setMissing(false);setResult(null);try{
 const r=await fetch('/api/vocabulary?term='+encodeURIComponent(text)),d=await r.json();if(!r.ok)throw new Error(d.error);
 if(d.entry)setResult({entry:d.entry,saved:d.saved,text});else if(!signedIn)setMissing(true);else{const ai=await fetch('/api/vocabulary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term:text})}),answer=await ai.json();if(!ai.ok)throw new Error(answer.error);setResult({...answer,text});}
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="vocabulary-search" key={language}><form className="search-bar" onSubmit={event=>{event.preventDefault();void search();}}><label htmlFor="financial-term"><T text="Explain a financial word or sentence"/></label><div><input id="financial-term" value={query} onChange={e=>setQuery(e.target.value)} maxLength={160} placeholder={ui('Revenue, inflation, free cash flow…')} required/><button className="button" disabled={busy}>{busy?<T text="Explaining…"/>:<T text="Explain term"/>}</button></div><p className="small"><T text="Financial vocabulary only. We check the glossary first; AI explains terms that are not in the library. Save any explanation to Notebook → Terms."/></p></form>
 {(result||error||missing)&&<button type="button" className="text-button vocabulary-back" onClick={()=>{setResult(null);setError('');setMissing(false);setQuery('');router.replace('/',{scroll:false});}}><T text="← Back to today’s words"/></button>}
 {error&&<p role="alert" className="panel notice">{ui(error)}</p>}{missing&&<div className="panel"><p><T text="This term is not in the glossary yet. Sign in to generate a short AI explanation."/></p><Link className="button secondary" href={'/login?next='+encodeURIComponent('/?term='+query)}><T text="Sign in to explain"/></Link></div>}{busy&&<p role="status" className="small"><T text="Checking the glossary, then AI if needed…"/></p>}{result&&<article className="panel vocabulary-result"><span className="eyebrow"><T text={result.entry?'QUICK GLOSSARY':'AI EXPLANATION'}/></span><h2>{result.text}</h2><p className="ai-answer">{result.entry?.definition||result.output?.content.answer}</p>{result.entry?<><p className="small"><T text="Reviewed glossary · instant · no AI quota used"/></p><BookmarkButton key={result.entry.source_key} selection={{...result.entry.selection,text:result.text}} initial={result.saved} signedIn={signedIn} returnPath={'/?term='+encodeURIComponent(result.text)}/></>:result.output&&<div className="ai-output-footer"><AISave key={result.output.id} id={result.output.id} kind="term" initial={result.output.saved}/><AIRating key={'rate'+result.output.id} outputId={result.output.id} initial={result.output.score}/></div>}</article>}
 </section>;
}
