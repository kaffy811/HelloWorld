import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {T} from '@/components/language-provider';
export const dynamic='force-dynamic';
export default async function Verified(){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(!user||user.is_anonymous)redirect('/login?error=callback');
 return <section className="panel auth-verification narrow"><span className="verified-icon" aria-hidden="true">✓</span><span className="eyebrow">Google</span><h1><T text="Verified"/></h1><p><T text="Google verified your account. Continue to finish signing in."/></p><a className="button" href="/auth/complete"><T text="Sign in"/></a><p className="small"><T text="Your account is ready. You will not need to verify with Google again."/></p></section>;
}
