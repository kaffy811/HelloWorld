import {createHash} from 'node:crypto';
import {validateGeneral} from './general.mjs';
import {fingerprint,validateReader,validateDaily} from './prompt.mjs';
import {aiEnabled,reserveMetered,settleUsage} from './billing.mjs';
export class ReaderError extends Error{constructor(status,message){super(message);this.status=status;}}
/** @param {{admin: import('@supabase/supabase-js').SupabaseClient,ownerId:string,kind:string,prompt:any,identity:object,source:import('./types').SourceSnapshot|null,selected?:string|null,question?:string|null,mode?:string,language?:string,conversation?:import('./types').Conversation|null,day?:string|null,candidates?:any[]|null,images?:any[],fetcher?:typeof fetch}} options */
export async function generateReader({admin,ownerId,kind,prompt,identity,source,selected=null,question=null,mode='explain',language='en',conversation=null,day=null,candidates=null,images=[],fetcher=fetch,repairAttempt=0}){
 if(!aiEnabled()||!process.env.GEMINI_API_KEY||!process.env.GEMINI_MODEL)throw new ReaderError(503,'AI is not configured yet.');
 const key=kind==='daily'?createHash('sha256').update(JSON.stringify({ownerId,day,language,version:prompt.prompt_version,kind})).digest('hex'):fingerprint(prompt,{ownerId,...identity});
 let reservation;
 try{reservation=await reserveMetered(admin,{ownerId,kind,key,prompt,imageCount:images.length});}catch{throw new ReaderError(503,'AI configuration or quota storage is unavailable.');}
 if(reservation?.cached_run){const {data,error:readError}=await admin.from('ai_outputs').select('*').eq('run_id',reservation.cached_run).eq('owner_id',ownerId).order('slot');if(readError||!data?.length)throw new ReaderError(503,'Saved explanation unavailable.');return data;}
 if(!reservation?.run_id){const messages={busy:'This explanation is being generated. Try again shortly.',rate_limit:'Please wait a few seconds before another AI request.',retry_limit:'This request has reached its retry limit. Try another phrase or return tomorrow.',user_quota:'Your daily AI allowance has been reached. Saved explanations remain available.',global_quota:'The site’s daily AI allowance has been reached. Saved explanations remain available.',daily_budget:'Today’s AI budget is fully allocated. Saved explanations remain available.',total_budget:'The site’s AI budget needs to be renewed. Saved explanations remain available.'};throw new ReaderError(429,messages[reservation?.state]||'AI generation is temporarily unavailable.');}
 let usage={},rawOutput='',dispatched=false,httpStatus=null;
 try{
  dispatched=true;
  const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(prompt.model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:prompt.system}]},contents:[{role:'user',parts:[{text:prompt.user},...images]}],generationConfig:prompt.generation_config}),signal:AbortSignal.timeout(25000)});
  httpStatus=response.status;
  if(!response.ok)throw new ReaderError(response.status===429?429:503,response.status===429?'Google’s request limit has been reached. Try later; saved content is still available.':'Google AI is temporarily unavailable.');
  const result=await response.json();usage=result.usageMetadata||{};const candidate=result.candidates?.[0];
  await settleUsage(admin,reservation.run_id,usage,{dispatched,httpStatus});
  if(candidate?.finishReason!=='STOP')throw new ReaderError(502,'AI did not finish this explanation. Please try again.');
  const raw=(candidate.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
  rawOutput=raw;const value=JSON.parse(raw);
  const outputs=candidates?validateDaily(value,candidates,language).map((lesson,i)=>({kind:'lesson',slot:i,...lesson,source_snapshot:{kind:'topic',id:candidates[i].key,title:candidates[i].term,read_text:candidates[i].definition,source_url:candidates[i].source,scope:'Learning guide; no company-specific claims',evidence:[{id:candidates[i].key,label:candidates[i].term,text:candidates[i].definition+' '+candidates[i].notes.join(' '),url:candidates[i].source}]},source_url:'/learn',language})):[{kind:kind==='chat'?'reply':mode,slot:0,content:source.kind==='general'?validateGeneral(value,language):validateReader(value,source.evidence,{brief:kind==='reader',language}),source_snapshot:source,source_url:source.source_url,selected_text:selected,question,language}];
  const {data,error:saveError}=await admin.rpc('complete_reader_generation',{p_run:reservation.run_id,p_outputs:outputs,p_usage:{...usage,model_version:result.modelVersion||prompt.model,response_id:result.responseId||null,finish_reason:candidate.finishReason,raw_output:raw,output_sha256:createHash('sha256').update(JSON.stringify(outputs.map(o=>o.content))).digest('hex'),validator_version:prompt.prompt_version},p_conversation:conversation?.id||null,p_revision:conversation?.revision??null,p_day:day});
  if(saveError||!data?.length)throw new ReaderError(409,'The conversation changed or the answer could not be saved. Reopen it before trying again.');
  return data;
 }catch(e){try{await settleUsage(admin,reservation.run_id,usage,{dispatched,httpStatus});}catch{/* Keep the conservative budget hold if recording fails. */}await admin.from('generation_runs').update({status:'failed',usage:{...usage,rejected_output:rawOutput.slice(0,24000),validation_error:e instanceof Error?e.message:'unknown'},error_code:e instanceof SyntaxError?'invalid_json':e instanceof ReaderError?'reader_'+e.status:'validation_failed'}).eq('id',reservation.run_id).eq('status','reserved');if(!repairAttempt&&kind!=='daily'&&!(e instanceof ReaderError)){
   // One bounded repair, separately metered and subject to the same source validator.
   // Rejected text is not promoted to evidence or included in the repair request.
   const repairPrompt={...prompt,prompt_version:prompt.prompt_version+'-repair1',system:prompt.system+' The previous attempt failed the response check. Return a concise answer with no numbered lists. Unless translating supplied text or the user explicitly asks for numbers, use no digits or dates. Use only qualitative background for title-only sources. Include valid supplied citation IDs. Follow the requested language and JSON schema exactly.'};
   return generateReader({admin,ownerId,kind,prompt:repairPrompt,identity:{...identity,repair:1},source,selected,question,mode,language,conversation,day,candidates,images,fetcher,repairAttempt:1});
  }
  throw e instanceof ReaderError?e:new ReaderError(502,'The answer could not pass the source check. Try a more specific question; no unverified answer was saved.');}
}
