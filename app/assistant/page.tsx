import {randomUUID} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {ArticleAssistant} from '@/components/article-assistant';
import {T} from '@/components/language-provider';
export default async function Assistant(){const s=await createClient(),{data:{user}}=await s.auth.getUser();const signedIn=!!user&&!user.is_anonymous;return <section className="narrow page-heading"><span className="eyebrow">Clearstock AI</span><h1><T text="Your AI assistant"/></h1><p><T text="Bring a question or a screenshot. Save useful conversations to Notebook."/></p><ArticleAssistant source={{kind:'general',id:randomUUID()}} title="Clearstock assistant" signedIn={signedIn} returnPath="/assistant" general initialOpen={signedIn}/></section>;}
