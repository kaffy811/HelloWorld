
import {T} from "@/components/language-provider";
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AISave,AIRating} from '@/components/ai-output-tools';
import {TextSelectionHelper} from '@/components/text-selection-helper';
import {UUID} from '@/lib/news/validation.mjs';
import {easternDate} from '@/lib/news/data';
import type {AIOutput} from '@/lib/ai/types';
export default async function Lesson({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!UUID.test(id))notFound();const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user||user.is_anonymous)redirect('/login?next='+encodeURIComponent('/learn/ai/'+id));const {data}=await s.from('ai_outputs').select('*').eq('id',id).eq('owner_id',user.id).eq('kind','lesson').maybeSingle();if(!data)notFound();const l=data as AIOutput;const [star,vote]=await Promise.all([s.from('ai_lesson_saves').select('output_id').eq('owner_id',user.id).eq('output_id',id).maybeSingle(),s.from('ai_feedback').select('score').eq('owner_id',user.id).eq('output_id',id).maybeSingle()]);
 return <><div className="breadcrumb"><Link href="/#today"><T text="Today"/></Link><span>／</span><T text="AI learning article"/></div><article className="lesson-article" data-readable="true"><header className="page-heading"><span className="eyebrow"><T text="GOOGLE GEMINI · YOUR PRIVATE LEARNING ARTICLE"/></span><h1>{l.content.title}</h1><p className="small"><T text="Saved article · original language"/> · {l.language==='en'?'English':'简体中文'}</p><p className="small"><T text="Generated "/>{easternDate(l.created_at)}</p><AISave id={id} kind="lesson" initial={!!star.data}/></header><section className="analysis-section"><p className="ai-answer">{l.content.answer}</p></section><div className="ai-output-footer"><span className="small"><T text="How much did this help you understand?"/></span><AIRating outputId={id} initial={vote.data?.score}/></div></article><TextSelectionHelper source={{kind:'lesson',id}} signedIn returnPath={'/learn/ai/'+id}/></>;
}
