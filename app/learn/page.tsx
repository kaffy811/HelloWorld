import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import {getLanguage} from "@/lib/i18n/server";
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {concepts} from '@/lib/market/concepts.mjs';
import {easternDay} from '@/lib/market/exploration.mjs';
import {DailyAILearning} from '@/components/daily-ai-learning';
import type {AIOutput} from '@/lib/ai/types';
export default async function Learn({searchParams}:{searchParams:Promise<{view?:string}>}){
 if((await searchParams).view==='saved')redirect('/notebook?kind=lessons');
 const {t:ui}=await getTranslator();
 const language=await getLanguage(),s=await createClient(),{data:{user}}=await s.auth.getUser(),savedView=(await searchParams).view==='saved',day=easternDay(new Date());let lessons:AIOutput[]=[],error=false;
 if(user&&!user.is_anonymous){const [batch,stars]=await Promise.all([s.from('ai_daily_sets').select('run_id').eq('owner_id',user.id).eq('day',day).eq('language',language).maybeSingle(),s.from('ai_lesson_saves').select('output_id').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(200)]);error=!!batch.error||!!stars.error;
  const savedIds=(stars.data||[]).map(r=>r.output_id);if(savedView?savedIds.length:batch.data?.run_id){let query=s.from('ai_outputs').select('*').eq('owner_id',user.id).eq('kind','lesson');query=savedView?query.in('id',savedIds).order('created_at',{ascending:false}):query.eq('run_id',batch.data!.run_id).order('slot');const result=await query;error=error||!!result.error;lessons=(result.data||[]) as AIOutput[];}
  if(lessons.length){const {data:votes}=await s.from('ai_feedback').select('output_id,score').eq('owner_id',user.id).in('output_id',lessons.map(l=>l.id));const scores=new Map((votes||[]).map(v=>[v.output_id,v.score]));lessons=lessons.map(l=>({...l,saved:savedIds.includes(l.id),score:scores.get(l.id)??null}));}
 }
 return <><section className="page-heading"><span className="eyebrow"><T text="LEARN A LITTLE EVERY DAY"/></span><h1><T text="One idea. A clearer market."/></h1><p><T text="Short explanations to connect what you already know with what comes next."/></p></section><nav className="tabs" aria-label={ui("Learn filter")}><Link className={!savedView?'active':''} href="/learn"><T text="Today"/></Link><Link className={savedView?'active':''} href="/notebook?kind=lessons"><T text="Saved in Notebook"/></Link></nav><DailyAILearning key={savedView?'saved':'today'} initial={lessons} day={day} signedIn={!!user&&!user.is_anonymous} initialError={error} savedView={savedView}/>{!savedView&&<section className="content-section"><h2><T text="The learning library"/></h2><p className="section-description"><T text="Editorial definitions and examples. These remain available when the AI quota is used up."/></p><div className="cards lesson-grid">{concepts.map(c=><article className="panel lesson-card" key={c.key} id={c.key}><span className="eyebrow"><T text="EDITORIAL EXPLANATION"/></span><h3>{ui(c.term)}</h3><p>{ui(c.definition)}</p><Link className="source" href={'/learn/'+c.key}><T text="Read explanation →"/></Link></article>)}</div></section>}</>;
}
