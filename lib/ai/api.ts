import {createClient} from '@/lib/supabase/server';
import {HttpError,errorResponse} from '@/lib/news/api';
import {ReaderError} from './generate.mjs';
export async function readerUser(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user||user.is_anonymous)throw new HttpError(401,'Sign in to use AI and save your learning.');return {supabase,user};}
export function readerResponse(e:unknown){if(e instanceof ReaderError)return Response.json({error:e.message},{status:e.status});return errorResponse(e);}
export function languageOf(v:unknown){if(v!==undefined&&!['en','zh-Hans'].includes(String(v)))throw new HttpError(400,'Choose English or Simplified Chinese.');return v==='en'?'en':'zh-Hans';}
