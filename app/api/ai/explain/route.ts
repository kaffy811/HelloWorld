import {getLanguage} from "@/lib/i18n/server";
import {mutationUser,jsonBody,HttpError} from '@/lib/news/api';
import {adminClient} from '@/lib/news/admin.mjs';
import {resolveSource} from '@/lib/ai/source';
import {readerPrompt,selectedInSource} from '@/lib/ai/prompt.mjs';
import {generateReader} from '@/lib/ai/generate.mjs';
import {readerResponse} from '@/lib/ai/api';
export const maxDuration=60;
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request),input=await jsonBody(request);
 if(!input||!['explain','translate'].includes(input.mode)||typeof input.text!=='string')throw new HttpError(400,'Choose text to explain or translate.');
 const language=await getLanguage(),source=await resolveSource(supabase,input.source,input.text);let selected:string;try{selected=selectedInSource(input.text,source);}catch(e){throw new HttpError(400,(e as Error).message);}
 const prompt=readerPrompt({market:'US',mode:input.mode,language,selected,article:{title:source.title,scope:source.scope,context:source.read_text},evidence:source.evidence},{brief:true});
 const [output]=await generateReader({admin:adminClient(),ownerId:user.id,kind:'reader',prompt,identity:{source_kind:source.kind,source_id:source.id,selected,mode:input.mode},source,selected,mode:input.mode,language});
 const [{data:vote},{data:bookmark}]=await Promise.all([supabase.from('ai_feedback').select('score').eq('owner_id',user.id).eq('output_id',output.id).maybeSingle(),supabase.from('knowledge_bookmarks').select('id').eq('user_id',user.id).eq('ai_output_id',output.id).maybeSingle()]);
 return Response.json({output:{...output,score:vote?.score??null,saved:!!bookmark}}, {headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return readerResponse(e);}}
