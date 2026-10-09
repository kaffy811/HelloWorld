import {createClient} from '@/lib/supabase/server';
import {getLanguage} from '@/lib/i18n/server';
import {lookupVocabulary,vocabularyQuery,vocabularyPrompt} from '@/lib/ai/vocabulary.mjs';
import {mutationUser,jsonBody,HttpError} from '@/lib/news/api';
import {readerResponse} from '@/lib/ai/api';
import {generateReader} from '@/lib/ai/generate.mjs';
import {adminClient} from '@/lib/news/admin.mjs';
export const maxDuration=60;
export async function GET(request:Request){try{
 let text;try{text=vocabularyQuery(new URL(request.url).searchParams.get('term'));}catch(e){throw new HttpError(400,(e as Error).message);}
 const language=await getLanguage(),entry=lookupVocabulary(text,language);let saved=false;
 if(entry){const s=await createClient(),{data:{user}}=await s.auth.getUser();if(user&&!user.is_anonymous){const {data}=await s.from('knowledge_bookmarks').select('id').eq('user_id',user.id).eq('source_key',entry.source_key).maybeSingle();saved=!!data;}}
 return Response.json({entry,saved},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return readerResponse(e);}}
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request),input=await jsonBody(request),language=await getLanguage();let text;try{text=vocabularyQuery(input?.term);}catch(e){throw new HttpError(400,(e as Error).message);}
 const entry=lookupVocabulary(text,language);if(entry)return Response.json({entry});
 const source={kind:'general',id:'vocabulary',title:text,read_text:text,source_url:'/?term='+encodeURIComponent(text),scope:'General financial terminology; no verified live company facts.',evidence:[]};
 const prompt=vocabularyPrompt(text,language,process.env.GEMINI_MODEL),outputs=await generateReader({admin:adminClient(),ownerId:user.id,kind:'reader',prompt,identity:{vocabulary:text.toLowerCase(),language},source,selected:text,language});
 const output=outputs[0];const [bookmark,vote]=await Promise.all([supabase.from('knowledge_bookmarks').select('id').eq('user_id',user.id).eq('ai_output_id',output.id).maybeSingle(),supabase.from('ai_feedback').select('score').eq('owner_id',user.id).eq('output_id',output.id).maybeSingle()]);
 return Response.json({output:{...output,saved:!!bookmark.data,score:vote.data?.score??null}});
 }catch(e){return readerResponse(e);}}
