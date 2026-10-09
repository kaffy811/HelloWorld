import {mutationUser,jsonBody,HttpError} from '@/lib/news/api';
import {UUID} from '@/lib/news/validation.mjs';
import {adminClient} from '@/lib/news/admin.mjs';
import {readerResponse} from '@/lib/ai/api';
import {revalidatePath} from 'next/cache';
export async function POST(request:Request){try{const {supabase,user}=await mutationUser(request),i=await jsonBody(request);
 if(!i||typeof i.saved!=='boolean'||!UUID.test(i.id||'')||!['term','chat','lesson'].includes(i.kind))throw new HttpError(400,'Choose an item to save.');
 if(i.kind==='chat'){
  const {data}=await supabase.from('ai_conversations').select('id,revision').eq('id',i.id).eq('owner_id',user.id).maybeSingle();if(!data||!data.revision)throw new HttpError(404,'A completed conversation is required.');
  const {error}=await adminClient().from('ai_conversations').update({saved:i.saved}).eq('id',i.id).eq('owner_id',user.id);if(error)throw new HttpError(503,'Conversation could not be saved.');
 }else{
  const {data:o}=await supabase.from('ai_outputs').select('*').eq('id',i.id).eq('owner_id',user.id).maybeSingle();if(!o)throw new HttpError(404,'Explanation unavailable.');
  if(i.kind==='lesson'){
   if(o.kind!=='lesson')throw new HttpError(400,'Choose a learning article.');
   const {error}=i.saved?await supabase.from('ai_lesson_saves').upsert({owner_id:user.id,output_id:o.id},{onConflict:'owner_id,output_id',ignoreDuplicates:true}):await supabase.from('ai_lesson_saves').delete().eq('owner_id',user.id).eq('output_id',o.id);if(error)throw new HttpError(503,'Learning article could not be saved.');
  }else{
   if(!['explain','translate'].includes(o.kind))throw new HttpError(400,'Choose a selected-text explanation.');
   const {error}=i.saved?await adminClient().from('knowledge_bookmarks').upsert({user_id:user.id,source_key:'ai:'+o.id,kind:'term',ai_output_id:o.id,text:o.selected_text,explanation:o.content.answer,source_url:o.source_url,provenance:'AI explanation',ticker:o.source_snapshot.ticker||null},{onConflict:'user_id,source_key',ignoreDuplicates:true}):await supabase.from('knowledge_bookmarks').delete().eq('user_id',user.id).eq('ai_output_id',o.id);if(error)throw new HttpError(503,'Term explanation could not be saved.');
  }
 }
 revalidatePath('/notebook');revalidatePath('/learn');return Response.json({saved:i.saved});
 }catch(e){return readerResponse(e);}}
