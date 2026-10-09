import {cookies} from 'next/headers';
import {createClient} from '@/lib/supabase/server';
import {assertSameOrigin} from '@/lib/news/validation.mjs';
import {jsonBody,HttpError,errorResponse} from '@/lib/news/api';
export async function POST(request:Request){try{
 try{assertSameOrigin(request);}catch{throw new HttpError(403,'This request must come from this website.');}
 const input=await jsonBody(request);if(!['en','zh-Hans'].includes(input?.language))throw new HttpError(400,'Choose English or Simplified Chinese.');
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 if(user&&!user.is_anonymous){const {data,error}=await s.from('profiles').update({preferred_language_code:input.language}).eq('id',user.id).select('id').single();if(error||!data)throw new HttpError(503,'Your language could not be saved.');}
 (await cookies()).set('clearstock_language',input.language,{path:'/',maxAge:31536000,httpOnly:true,sameSite:'lax',secure:new URL(request.url).protocol==='https:'});
 return Response.json({language:input.language});
 }catch(e){return errorResponse(e);}}
