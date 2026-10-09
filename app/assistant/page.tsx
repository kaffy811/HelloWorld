import {randomUUID} from 'node:crypto';
import {redirect,notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AssistantWorkspace} from '@/components/assistant-workspace';
import {UUID} from '@/lib/news/validation.mjs';
export default async function Assistant({searchParams}:{searchParams:Promise<{chat?:string}>}){const {chat}=await searchParams;if(chat&&!UUID.test(chat))notFound();const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user||user.is_anonymous)redirect('/login?next='+encodeURIComponent(chat?'/assistant?chat='+chat:'/assistant'));if(chat){const {data:c}=await s.from('ai_conversations').select('id').eq('id',chat).eq('owner_id',user.id).maybeSingle();if(!c)notFound();}return <AssistantWorkspace conversationId={chat} newSourceId={randomUUID()}/>;}
