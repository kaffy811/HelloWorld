import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {config} from '@/lib/supabase/config';
import {routeCookies} from '@/lib/supabase/route-cookies.mjs';
import {safeReturnPath,requestOrigin} from '@/lib/news/validation.mjs';
import {onboardingDestination} from '@/lib/onboarding';
export async function GET(request:Request){
 const store=await cookies(),buffer=routeCookies(store.getAll()),origin=requestOrigin(request),{url,key}=config();
 const s=createServerClient(url,key,{cookies:buffer.cookies}),{data:{user}}=await s.auth.getUser();
 if(!user||user.is_anonymous)return buffer.finish(NextResponse.redirect(new URL('/login?error=callback',origin)));
 const {data:profile,error}=await s.from('profiles').select('display_name,first_name,last_name,onboarding_completed_at').eq('id',user.id).maybeSingle();
 if(error)return buffer.finish(NextResponse.redirect(new URL('/login?error=profile',origin)));
 const destination=profile?onboardingDestination(profile):'/onboarding',next=safeReturnPath(store.get('learning_return')?.value);
 const response=NextResponse.redirect(new URL(destination==='/'?next:destination,origin));
 if(destination==='/')response.cookies.delete('learning_return');
 response.headers.set('Referrer-Policy','no-referrer');
 return buffer.finish(response);
}
