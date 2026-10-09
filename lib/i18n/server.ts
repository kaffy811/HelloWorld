import {cache} from 'react';
import {cookies} from 'next/headers';
import {createClient} from '@/lib/supabase/server';
import {translate} from './translate.mjs';
export const getLanguage=cache(async():Promise<'en'|'zh-Hans'>=>{
 const store=await cookies(),browser=store.get('clearstock_language')?.value;
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(user&&!user.is_anonymous){const {data}=await s.from('profiles').select('preferred_language_code').eq('id',user.id).maybeSingle();if(data?.preferred_language_code==='en'||data?.preferred_language_code==='zh-Hans')return data.preferred_language_code;}
 return browser==='zh-Hans'?'zh-Hans':'en';
});
export async function getTranslator(){const language=await getLanguage();return {language,t:(text:string,params?:Record<string,string|number>)=>translate(language,text,params)};}
