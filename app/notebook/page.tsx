import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from 'next/link';
import {loadProfile} from '@/lib/profile';
import {onboardingDestination} from '@/lib/onboarding';
import {redirect} from 'next/navigation';
import {RemoveBookmark} from '@/components/bookmark-button';
import {type PersonalNote} from '@/components/note-editor';
import {easternDate} from '@/lib/news/data';
import type {Bookmark} from '@/lib/market/types';
export default async function Notebook({searchParams}:{searchParams:Promise<{kind?:string|string[];q?:string|string[];page?:string|string[];archived?:string|string[];legacy?:string|string[]}>}){
 const {t:ui}=await getTranslator();
 const {supabase:s,user,profile}=await loadProfile('/notebook');const destination=onboardingDestination(profile);if(destination!=='/')redirect(destination);
 const raw=await searchParams,one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v,input={kind:one(raw.kind),q:one(raw.q),page:one(raw.page),archived:one(raw.archived),legacy:one(raw.legacy)},kind=['all','terms','notes'].includes(input.kind||'')?input.kind!:'all',q=(input.q||'').trim().slice(0,80).replace(/[%_]/g,''),current=Math.max(1,Math.min(1000,parseInt(input.page||'1')||1));
 if(input.kind==='lessons')redirect('/notebook?kind=terms');
 if(input.kind==='chats')redirect(input.legacy==='1'?'/assistant?view=earlier':'/assistant');
 let bookmarks:Bookmark[]=[],notes:PersonalNote[]=[],count=0,error=false;
 if(kind==='all'||kind==='terms'){
  let query=s.from('knowledge_bookmarks').select('*',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false});if(q)query=query.ilike('text','%'+q+'%');
  const result=await query.range(kind==='all'?0:(current-1)*20,kind==='all'?4:current*20-1);bookmarks=(result.data||[]) as Bookmark[];count+=result.count||0;error=error||!!result.error;
 }
 if(kind==='all'||kind==='notes'){
  let query=s.from('personal_notes').select('*',{count:'exact'}).eq('user_id',user.id).order('updated_at',{ascending:false});if(q)query=query.ilike('title','%'+q+'%');
  const result=await query.range(kind==='all'?0:(current-1)*20,kind==='all'?4:current*20-1);notes=(result.data||[]) as PersonalNote[];count+=result.count||0;error=error||!!result.error;
 }
 const base=`/notebook?kind=${kind}&q=${encodeURIComponent(q)}`;
 const explanation={all:'Your saved terms and your own notes live here. Conversations are saved automatically in Chat.',terms:'Terms explained in context, saved with a source so you can revisit what they mean.',notes:'Your own observations, reflections and study documents. Write, edit and download them privately.'}[kind];
 return <><section className="page-heading"><span className="eyebrow"><T text="YOUR PRIVATE NOTEBOOK"/></span><h1><T text="Keep what you understand."/></h1><p><T text="Save knowledge here. Continue conversations in Chat."/> <Link className="source" href="/assistant"><T text="Open Chat →"/></Link></p></section>
 <nav className="tabs notebook-tabs" aria-label={ui("Notebook sections")}>{[['all','All saved'],['terms','Terms'],['notes','My notes']].map(([key,label])=><Link key={key} className={kind===key?'active':''} href={'/notebook?kind='+key}>{ui(label)}</Link>)}</nav>
 <div className="section-title notebook-intro"><p>{ui(explanation||'')}</p>{(kind==='notes'||kind==='all')&&<Link className="button" href="/notebook/notes/new"><T text="＋ New note"/></Link>}</div>
 {kind!=='all'&&<form className="search-bar compact-search" action="/notebook"><input type="hidden" name="kind" value={kind}/><label htmlFor="notebook-search">{kind==='terms'?<T text="Find a saved term"/>:<T text="Find by title"/>}</label><div><input id="notebook-search" name="q" defaultValue={q} maxLength={80} placeholder={kind==='terms'?'Revenue, EPS, profit margin…':'Search your notebook…'}/><button className="button secondary"><T text="Search"/></button></div></form>}
 {error?<div className="panel notice"><T text="Your notebook is temporarily unavailable. Please try again."/></div>:!count?<div className="panel empty-state"><h2>{q?<T text="No matching items"/>:kind==='all'?<T text="No saved knowledge yet."/>:kind==='terms'?<T text="Your first term starts here."/>:<T text="A space for your own ideas."/>}</h2><p>{kind==='all'?<T text="Save a word or sentence to Terms. Keep your own writing in My notes."/>:kind==='terms'?<T text="Save a term from a news explanation or the learning library. You can also select an explained term in an article."/>:<T text="Create a private note about what you learned or what you would like to understand."/>}</p><Link className="button" href={kind==='notes'?'/notebook/notes/new':'/learn'}>{kind==='notes'?<T text="Create a note →"/>:<T text="Explore today’s ideas →"/>}</Link></div>:<>
 {kind==='all'&&<p className="small"><T text="Showing the latest five items in each section. Choose a section to view all."/></p>}
 {(kind==='all'||kind==='terms')&&!!bookmarks.length&&<section className="collection-section">{kind==='all'&&<div className="section-title"><h2><T text="Terms"/></h2><Link className="source" href="/notebook?kind=terms"><T text="View all →"/></Link></div>}<div className="panel vocabulary-list">{bookmarks.map(b=><article className="vocabulary-row" key={b.id}><h2>{b.text}</h2><p className="vocabulary-definition">{b.explanation}</p><div className="vocabulary-row-actions"><Link className="source small" href={b.source_key.startsWith('concept:')?'/learn/'+b.source_key.slice(8):b.source_url}><T text="Return to context ↗"/></Link><RemoveBookmark id={b.id}/></div></article>)}</div></section>}
 {(kind==='all'||kind==='notes')&&!!notes.length&&<section className="collection-section">{kind==='all'&&<div className="section-title"><h2><T text="My notes"/></h2><Link className="source" href="/notebook?kind=notes"><T text="View all →"/></Link></div>}<div className="notebook-grid">{notes.map(n=><article className="panel notebook-item" key={n.id}><span className="eyebrow"><T text="MY OWN WRITING"/></span><h2><Link href={'/notebook/notes/'+n.id}>{n.title}</Link></h2><p className="note-preview">{n.body.slice(0,260)}{n.body.length>260?'…':''}</p><div className="notebook-item-footer"><Link className="source" href={'/notebook/notes/'+n.id}><T text="Open note →"/></Link></div><time className="small"><T text="Updated "/>{easternDate(n.updated_at)}</time></article>)}</div></section>}
 </>}
 {kind!=='all'&&count>20&&<nav className="history-pagination" aria-label={ui("Notebook pages")}>{current>1&&<Link href={base+'&page='+(current-1)}><T text="← Previous"/></Link>}<span><T text="Page "/>{current}<T text=" of "/>{Math.ceil(count/20)}</span>{current*20<count&&<Link href={base+'&page='+(current+1)}><T text="Next →"/></Link>}</nav>}
 </>;
}
