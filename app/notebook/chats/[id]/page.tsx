import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {UUID} from '@/lib/news/validation.mjs';
export default async function Conversation({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!UUID.test(id))notFound();const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user||user.is_anonymous)redirect('/login?next='+encodeURIComponent('/notebook/chats/'+id));const {data:c}=await s.from('ai_conversations').select('id').eq('id',id).eq('owner_id',user.id).maybeSingle();if(!c)notFound();redirect('/assistant?chat='+id);}
