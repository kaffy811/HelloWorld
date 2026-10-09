import {learningPreferences} from '@/lib/ai/preferences.mjs';
import {getLanguage} from "@/lib/i18n/server";
import {mutationUser,HttpError} from '@/lib/news/api';
import {adminClient} from '@/lib/news/admin.mjs';
import {readerPrompt} from '@/lib/ai/prompt.mjs';
import {dailyCandidates,noteTopicKeys,DAILY_WORD_COUNT} from '@/lib/ai/topics.mjs';
import {generateReader} from '@/lib/ai/generate.mjs';
import {readerResponse} from '@/lib/ai/api';
import {easternDay} from '@/lib/market/exploration.mjs';
export const maxDuration=60;
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request),language=await getLanguage(),day=easternDay(new Date());
 const {data:existing,error:dailyError}=await supabase.from('ai_daily_sets').select('run_id,item_count').eq('owner_id',user.id).eq('day',day).eq('language',language).maybeSingle();if(dailyError)throw new HttpError(503,'Daily learning unavailable. Check the database migration.');
 if(existing?.item_count===DAILY_WORD_COUNT){const {data:lessons,error}=await supabase.from('ai_outputs').select('*').eq('run_id',existing.run_id).order('slot');if(error||lessons?.length!==DAILY_WORD_COUNT)throw new HttpError(503,'Saved daily learning unavailable.');return Response.json({lessons,day});}
 const [bookmarks,chats,notes]=await Promise.all([supabase.from('knowledge_bookmarks').select('source_key,text,ai_output_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(200),supabase.from('ai_conversations').select('title').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(30),supabase.from('personal_notes').select('title,body').eq('user_id',user.id).is('archived_at',null).order('updated_at',{ascending:false}).limit(30)]);
 if(bookmarks.error||chats.error||notes.error)throw new HttpError(503,'Your notebook could not be read. Please try again.');
 const knownIds=[...(bookmarks.data||[]).map(b=>b.ai_output_id).filter(Boolean)];
 const {data:known,error:knownError}=knownIds.length?await supabase.from('ai_outputs').select('topic_key').in('id',knownIds).eq('owner_id',user.id):{data:[],error:null};if(knownError)throw new HttpError(503,'Saved learning topics unavailable.');
 const [comments,ratings,recentOutputs,suggestions]=await Promise.all([supabase.from('ai_lesson_comments').select('body,preference').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(40),supabase.from('ai_feedback').select('output_id,score,reason').eq('owner_id',user.id).order('updated_at',{ascending:false}).limit(80),supabase.from('ai_outputs').select('id,topic_key,created_at').eq('owner_id',user.id).eq('kind','lesson').order('created_at',{ascending:false}).limit(100),supabase.from('product_feedback').select('preference').eq('owner_id',user.id).not('preference','is',null).order('created_at',{ascending:false}).limit(40)]);
 if(comments.error||ratings.error||recentOutputs.error||suggestions.error)throw new HttpError(503,'Your learning feedback could not be read.');
 const preferences=learningPreferences([...(comments.data||[]),...(suggestions.data||[]).map(s=>({body:'',preference:s.preference}))],ratings.data||[],recentOutputs.data||[]);
 const noteTopics=noteTopicKeys(notes.data||[]);
 const candidates=dailyCandidates(bookmarks.data||[],[...(known||[]).map(t=>t.topic_key).filter(Boolean),...noteTopics,...(recentOutputs.data||[]).filter(o=>easternDay(new Date(o.created_at))!==day&&new Date(o.created_at).getTime()>Date.now()-48*60*60*1000).map(o=>o.topic_key).filter(Boolean)],(chats.data||[]).map(c=>c.title),day,preferences);
 if(candidates.length!==DAILY_WORD_COUNT)throw new HttpError(422,'You have explored almost every topic in this library. Review Terms while we add more topics.');
 const inputProfile={note_topic_keys:noteTopics,known_terms:(bookmarks.data||[]).map(b=>b.text.replace(/\d[\d,.]*/g,'').trim().slice(0,160)).slice(0,40),saved_chat_topics:(chats.data||[]).map(c=>c.title.replace(/\d[\d,.]*/g,'').trim()).slice(0,12)};
 const prompt=readerPrompt({market:'US',language,day,notebook_profile:inputProfile,learning_preferences:preferences,topics:candidates.map(t=>({topic_key:t.key,title:t.term,evidence_id:t.key,definition:t.definition,notes:t.notes,source:t.source}))},{daily:true});
 // One stable reservation per owner/day, even if their notebook changes during this request.
 const lessons=await generateReader({admin:adminClient(),ownerId:user.id,kind:'daily',prompt,identity:{day},source:null,day,candidates,language});
 return Response.json({lessons,day});
 }catch(e){return readerResponse(e);}}
