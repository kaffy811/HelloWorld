import {mutationUser,HttpError,errorResponse} from '@/lib/news/api';
import {readerUser} from '@/lib/ai/api';
import {adminClient} from '@/lib/news/admin.mjs';
import {syncData} from '@/lib/market/sync.mjs';
import {refreshStatus,refreshResult} from '@/lib/news/refresh-status.mjs';
import {revalidatePath} from 'next/cache';
export const maxDuration=60;
async function status(){const {data,error}=await adminClient().from('news_refresh_gate').select('lease_until,last_started').eq('id',1).maybeSingle();if(error)throw new HttpError(503,'News refresh storage is unavailable.');return refreshStatus(data);}
export async function GET(){try{
 await readerUser();const admin=adminClient();
 const [{data:latest},{data:runs}]=await Promise.all([
  admin.from("market_articles").select("collected_at").order("collected_at",{ascending:false}).limit(1),
  admin.from("data_sync_runs").select("report").not("finished_at","is",null).order("started_at",{ascending:false}).limit(1),
 ]);
 return Response.json({...await status(),last_imported:latest?.[0]?.collected_at||null,failed_sources:refreshResult(runs?.[0]?.report||{}).failed_sources,scheduled:process.env.ENABLE_NEWS_SCHEDULE==='true'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 await mutationUser(request);const admin=adminClient(),{data:claimed,error}=await admin.rpc('reserve_news_refresh');
 if(error)throw new HttpError(503,'News refresh storage is unavailable.');
 if(!claimed){const state=await status();return Response.json({error:'News was recently checked. Saved news is ready to read.',...state},{status:429,headers:{'Retry-After':String(state.retry_after),'Cache-Control':'private, no-store'}});}
 try{const report=await syncData({newsOnly:true,web:true}),result=refreshResult(report);revalidatePath('/news');revalidatePath('/');return Response.json({...result,retry_after:600,last_checked:new Date().toISOString()},{status:result.status==='failed'?503:200,headers:{'Cache-Control':'private, no-store'}});}
 finally{await admin.from('news_refresh_gate').update({lease_until:new Date().toISOString()}).eq('id',1);}
 }catch(e){return errorResponse(e);}}
