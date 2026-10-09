import {createClient} from '@/lib/supabase/server';
import {ProductFeedback} from '@/components/product-feedback';
import {T} from '@/components/language-provider';
export default async function Feedback(){const s=await createClient(),{data:{user}}=await s.auth.getUser();return <div className="feedback-page"><header className="page-heading"><span className="eyebrow"><T text="YOUR IDEAS MATTER"/></span><h1><T text="Feedback"/></h1></header><ProductFeedback signedIn={!!user&&!user.is_anonymous}/></div>;}
