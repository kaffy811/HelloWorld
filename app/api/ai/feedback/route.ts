import {mutationUser,jsonBody,HttpError} from '@/lib/news/api';
import {UUID} from '@/lib/news/validation.mjs';
import {readerResponse} from '@/lib/ai/api';
export async function POST(request:Request){try{const {supabase,user}=await mutationUser(request),i=await jsonBody(request);
 if(!i||!UUID.test(i.output_id||'')||!Number.isInteger(i.score)||i.score<1||i.score>5)throw new HttpError(400,'Choose an explanation and a score from 1 to 5.');
 if(i.reason!=null&&!['jargon','too_long','connection','unanswered','factual_error'].includes(i.reason))throw new HttpError(400,'Invalid feedback reason.');
 const {data}=await supabase.from('ai_outputs').select('id').eq('id',i.output_id).eq('owner_id',user.id).maybeSingle();if(!data)throw new HttpError(404,'Explanation unavailable.');
 const {error}=await supabase.from('ai_feedback').upsert({owner_id:user.id,output_id:i.output_id,score:i.score,reason:i.reason||null,updated_at:new Date().toISOString()},{onConflict:'owner_id,output_id'});if(error)throw new HttpError(503,'Your rating could not be saved.');return Response.json({saved:true,score:i.score});
 }catch(e){return readerResponse(e);}}
