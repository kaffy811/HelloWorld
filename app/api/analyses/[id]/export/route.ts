import {createClient} from '@/lib/supabase/server';
import {UUID} from '@/lib/news/validation.mjs';
import {HttpError,errorResponse} from '@/lib/news/api';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user||user.is_anonymous)throw new HttpError(401,'Sign in to download your answer.');const {id}=await params;if(!UUID.test(id))throw new HttpError(400,'Invalid answer.');
 const {data:a}=await s.from('analysis_versions').select('content,evidence,created_at,run_id').eq('id',id).eq('owner_id',user.id).eq('kind','followup').maybeSingle();if(!a)throw new HttpError(404,'Answer unavailable.');
 const {data:run}=await s.from('generation_runs').select('prompt').eq('id',a.run_id).eq('owner_id',user.id).maybeSingle();let question='';try{question=JSON.parse(run?.prompt?.user||'{}').question||'';}catch{}
 const c=a.content;const text=['# '+c.headline,'## Your question',question,'## AI answer',c.summary,...[['Reported facts','facts'],['Business connection','impact'],['Potential benefits','upside'],['Potential pressures','downside']].flatMap(([title,key])=>['## '+title,...(c[key]||[]).map((v:{text:string})=>'- '+v.text)]),'## Limits',...(c.unknowns||[]).map((v:string)=>'- '+v),'## Terms',...(c.terms||[]).map((v:{term:string;definition:string})=>v.term+': '+v.definition),'## Sources',...(a.evidence||[]).map((v:{label:string;url:string})=>v.label+(v.url?' — '+v.url:'')),'Generated: '+a.created_at].join('\n\n');
 return new Response(text,{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="clearstock-answer-${id}.md"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return errorResponse(e);}}
