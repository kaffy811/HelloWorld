import {mutationUser,HttpError,errorResponse} from '@/lib/news/api';
import {adminClient} from '@/lib/news/admin.mjs';
import {syncData} from '@/lib/market/sync.mjs';
import {revalidatePath} from 'next/cache';
export const maxDuration=60;
export async function POST(request:Request){try{await mutationUser(request);const admin=adminClient();const {data:claimed,error}=await admin.rpc('reserve_news_refresh');if(error)throw new HttpError(503,'News refresh storage is unavailable.');if(!claimed)throw new HttpError(429,'News was recently refreshed or is updating. Please wait 10 minutes; refresh the page to read the saved feed.');
 try{const report=await syncData({newsOnly:true,web:true});revalidatePath('/news');revalidatePath('/');const partial=report.errors.length>0;return Response.json({message:partial?'Some sources could not be reached. Available updates were saved; earlier reports remain visible.':`News checked: ${report.articles} available updates imported.`,partial});}finally{await admin.from('news_refresh_gate').update({lease_until:new Date().toISOString()}).eq('id',1);}
 }catch(e){return errorResponse(e);}}
