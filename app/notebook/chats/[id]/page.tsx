
import {T} from "@/components/language-provider";
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {UUID} from '@/lib/news/validation.mjs';
import {ArticleAssistant} from '@/components/article-assistant';
export default async function Conversation({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!UUID.test(id))notFound();const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user||user.is_anonymous)redirect('/login?next='+encodeURIComponent('/notebook/chats/'+id));const {data:c}=await s.from('ai_conversations').select('id,title,saved,source_snapshot').eq('id',id).eq('owner_id',user.id).maybeSingle();if(!c)notFound();return <><div className="breadcrumb"><Link href="/notebook?kind=chats"><T text="AI conversations"/></Link><span>／</span>{c.title}</div><section className="page-heading"><span className="eyebrow"><T text="PRIVATE AI CONVERSATION"/></span><h1>{c.title}</h1><p>{c.saved?<T text="This conversation is saved in your Notebook."/>:<T text="This conversation has not been added to Notebook."/>}</p><Link className="source" href={c.source_snapshot.source_url}><T text="Return to article →"/></Link></section><ArticleAssistant title={c.title} signedIn returnPath={'/notebook/chats/'+id} conversationId={id} general={c.source_snapshot.kind==='general'} initialOpen/></>;}
