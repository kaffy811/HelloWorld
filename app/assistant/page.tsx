import {randomUUID} from 'node:crypto';
import {redirect,notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AssistantWorkspace} from '@/components/assistant-workspace';
import {EarlierChatAnswers} from '@/components/earlier-chat-answers';
import {UUID} from '@/lib/news/validation.mjs';
export default async function Assistant({searchParams}:{searchParams:Promise<{chat?:string;view?:string;page?:string}>}){
 const {chat,view,page}=await searchParams;
 if(chat&&!UUID.test(chat))notFound();
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(!user||user.is_anonymous)redirect('/login?next='+encodeURIComponent(chat?'/assistant?chat='+chat:view==='earlier'?'/assistant?view=earlier':'/assistant'));
 if(view==='earlier')return <EarlierChatAnswers ownerId={user.id} page={parseInt(page||'1')||1}/>;
 if(chat){const {data:c}=await s.from('ai_conversations').select('id').eq('id',chat).eq('owner_id',user.id).maybeSingle();if(!c)notFound();}
 const earlier=await s.from('analysis_versions').select('id').eq('owner_id',user.id).eq('kind','followup').limit(1);
 return <AssistantWorkspace conversationId={chat} newSourceId={randomUUID()} hasEarlierAnswers={!!earlier.data?.length}/>;
}
