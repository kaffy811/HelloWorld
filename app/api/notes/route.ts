import { revalidatePath } from 'next/cache';
import { mutationUser,boundedBytes,HttpError,errorResponse } from '@/lib/news/api';
import {UUID} from '@/lib/news/validation.mjs';
import {imageIds,ownedImages} from '@/lib/images/server';
import {validateNote} from '@/lib/market/exploration.mjs';
async function noteBody(request:Request){try{return JSON.parse((await boundedBytes(request,100000)).toString());}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'Invalid note.');}}
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request),input=await noteBody(request);let note;
 try{note=validateNote(input);}catch(e){throw new HttpError(400,(e as Error).message);}
 const images=imageIds(input.image_ids);await ownedImages(supabase,user.id,images);
 const {data,error}=await supabase.from('personal_notes').insert({...note,image_ids:images,user_id:user.id}).select('id,version,updated_at').single();
 if(error)throw new HttpError(503,'Your note could not be saved. Please try again.');
 revalidatePath('/notebook');return Response.json(data,{status:201});
 }catch(e){return errorResponse(e);}}
export async function PATCH(request:Request){try{
 const {supabase,user}=await mutationUser(request),input=await noteBody(request);
 if(!input||!UUID.test(input.id||'')||!Number.isSafeInteger(input.version)||input.version<1)throw new HttpError(400,'Invalid note version.');
 let update;
 if(typeof input.archive==='boolean')update={archived_at:input.archive?new Date().toISOString():null};
 else{try{update=validateNote(input);}catch(e){throw new HttpError(400,(e as Error).message);}}
 if(input.image_ids!==undefined&&typeof input.archive!=='boolean'){const images=imageIds(input.image_ids);await ownedImages(supabase,user.id,images);update={...update,image_ids:images};}
 const {data,error}=await supabase.from('personal_notes').update({...update,version:input.version+1,updated_at:new Date().toISOString()}).eq('id',input.id).eq('user_id',user.id).eq('version',input.version).select('id,version,updated_at').maybeSingle();
 if(error)throw new HttpError(503,'Your note could not be saved.');
 if(!data)throw new HttpError(409,'This note changed in another tab. Reload it before saving. Your draft remains in this editor.');
 revalidatePath('/notebook');revalidatePath('/notebook/notes/'+input.id);return Response.json(data);
 }catch(e){return errorResponse(e);}}
export async function GET(request:Request){try{
 // Read-only downloads still require the same authenticated owner as the notebook.
 const {createClient}=await import('@/lib/supabase/server');const s=await createClient();const {data:{user}}=await s.auth.getUser();
 if(!user||user.is_anonymous)throw new HttpError(401,'Sign in to download your note.');
 const id=new URL(request.url).searchParams.get('id');if(!id||!UUID.test(id))throw new HttpError(400,'Invalid note.');
 const {data}=await s.from('personal_notes').select('title,body,updated_at,image_ids').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(!data)throw new HttpError(404,'Note unavailable.');
 return new Response('# '+data.title+'\n\n'+data.body+(data.image_ids||[]).map((id:string)=>'\n\n![Private image]('+new URL('/api/images?id='+id,request.url).href+')').join('')+'\n\nSaved: '+data.updated_at+'\n',{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="clearstock-note-${id}.md"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return errorResponse(e);}}
