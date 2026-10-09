import {adminClient} from '@/lib/news/admin.mjs';
import {scheduledAuthorized} from '@/lib/news/scheduled.mjs';
import {syncData} from '@/lib/market/sync.mjs';
import {refreshResult,refreshStatus} from '@/lib/news/refresh-status.mjs';
import {revalidatePath} from 'next/cache';
export const maxDuration=60;
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(!scheduledAuthorized(request.headers.get('authorization'),process.env.NEWS_SYNC_TOKEN))return Response.json({error:'Unauthorized'},{status:401,headers});
 const admin=adminClient();
 const {data:claimed,error}=await admin.rpc('reserve_news_refresh');
 if(error)return Response.json({error:'News refresh unavailable'},{status:503,headers});
 if(!claimed){const {data}=await admin.from('news_refresh_gate').select('lease_until,last_started').eq('id',1).maybeSingle();return Response.json({skipped:true,...refreshStatus(data)},{headers});}
 try{
  const result=refreshResult(await syncData({newsOnly:true,web:true}));
  revalidatePath('/news');revalidatePath('/');revalidatePath('/stocks/[ticker]','page');
  return Response.json(result,{status:result.status==='failed'?503:200,headers});
 }catch{return Response.json({error:'News refresh failed; previously saved news remains available'},{status:503,headers});}
 finally{await admin.from('news_refresh_gate').update({lease_until:new Date().toISOString()}).eq('id',1);}
}
