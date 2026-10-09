import {mutationUser,jsonBody,HttpError,errorResponse} from '@/lib/news/api';
import {UUID} from '@/lib/news/validation.mjs';
import {concepts} from '@/lib/market/concepts.mjs';
import {revalidatePath} from 'next/cache';
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request),input=await jsonBody(request);
 if(!input||typeof input!=='object'||Array.isArray(input)||!Number.isInteger(input.score)||input.score<1||input.score>5)throw new HttpError(400,'Choose a rating from 1 to 5.');
 const reasons=['jargon','too_long','connection','unanswered','factual_error'];if(input.reason!=null&&!reasons.includes(input.reason))throw new HttpError(400,'Invalid feedback reason.');
 const analysisId=typeof input.analysis_id==='string'&&UUID.test(input.analysis_id)?input.analysis_id:null,conceptKey=concepts.find(c=>c.key===input.concept)?.key||null;
 if(Boolean(analysisId)===Boolean(conceptKey))throw new HttpError(400,'Choose one explanation to rate.');
 if(analysisId){const {data}=await supabase.from('analysis_versions').select('id,kind').eq('id',analysisId).maybeSingle();if(!data||!['news','followup'].includes(data.kind))throw new HttpError(404,'Explanation unavailable.');}
 const target=analysisId?'analysis:'+analysisId:'concept:'+conceptKey;
 const {error}=await supabase.from('content_feedback').upsert({user_id:user.id,target_key:target,analysis_id:analysisId,concept_key:conceptKey,score:input.score,reason:input.reason||null,updated_at:new Date().toISOString()},{onConflict:'user_id,target_key'});
 if(error)throw new HttpError(503,'Your rating could not be saved. Please try again.');revalidatePath('/notebook');revalidatePath('/learn');return Response.json({saved:true,score:input.score});
 }catch(e){return errorResponse(e);}}
