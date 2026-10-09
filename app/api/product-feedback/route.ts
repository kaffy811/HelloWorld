import {mutationUser,jsonBody,HttpError,errorResponse} from '@/lib/news/api';
import {feedbackInput} from '@/lib/product-feedback.mjs';
export async function POST(request:Request){try{
 const {supabase,user}=await mutationUser(request);let input;
 try{input=feedbackInput(await jsonBody(request));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,(e as Error).message);}
 const {data:existing,error:readError}=await supabase.from('product_feedback').select('id').eq('owner_id',user.id).eq('id',input.id).maybeSingle();
 if(readError)throw new HttpError(503,'Your feedback could not be submitted. Please try again.');
 if(existing)return Response.json({submitted:true},{headers:{'Cache-Control':'private, no-store'}});
 const {error}=await supabase.from('product_feedback').insert({...input,owner_id:user.id});
 if(error){if(error.message.includes('feedback_daily_limit'))throw new HttpError(429,'You have submitted five suggestions today. Please return tomorrow.');if(error.code!=='23505')throw new HttpError(503,'Your feedback could not be submitted. Please try again.');const retry=await supabase.from('product_feedback').select('id').eq('owner_id',user.id).eq('id',input.id).maybeSingle();if(!retry.data)throw new HttpError(503,'Your feedback could not be submitted. Please try again.');}
 return Response.json({submitted:true},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}}
