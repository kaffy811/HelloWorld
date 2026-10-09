import {createClient} from '@/lib/supabase/server';
import type {AIOutput} from './types';

export async function dailyLearning(ownerId:string|undefined,day:string,language:string){
 if(!ownerId)return {lessons:[] as AIOutput[],error:false};
 const s=await createClient();
 const [batch,stars]=await Promise.all([
  s.from('ai_daily_sets').select('run_id').eq('owner_id',ownerId).eq('day',day).eq('language',language).maybeSingle(),
  s.from('ai_lesson_saves').select('output_id').eq('owner_id',ownerId).order('created_at',{ascending:false}).limit(200)
 ]);
 let error=!!batch.error||!!stars.error;
 if(!batch.data?.run_id)return {lessons:[] as AIOutput[],error};
 const result=await s.from('ai_outputs').select('*').eq('owner_id',ownerId).eq('kind','lesson').eq('run_id',batch.data.run_id).order('slot');
 error=error||!!result.error;
 const lessons=(result.data||[]) as AIOutput[];
 if(!lessons.length)return {lessons,error};
 const votes=await s.from('ai_feedback').select('output_id,score').eq('owner_id',ownerId).in('output_id',lessons.map(l=>l.id));
 const scores=new Map((votes.data||[]).map(v=>[v.output_id,v.score]));
 const saved=new Set((stars.data||[]).map(r=>r.output_id));
 return {lessons:lessons.map(l=>({...l,saved:saved.has(l.id),score:scores.get(l.id)??null})),error:error||!!votes.error};
}
