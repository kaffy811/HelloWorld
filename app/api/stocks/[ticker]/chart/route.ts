import { adminClient } from '@/lib/news/admin.mjs';
import { minuteBars, chartSessions } from '@/lib/market/exploration.mjs';
import { errorResponse, HttpError } from '@/lib/news/api';
export const runtime='nodejs';
export const maxDuration=60;
async function provider(path:string) {
 const r=await fetch('https://data.alpaca.markets/v2/stocks/'+path,{headers:{'APCA-API-KEY-ID':process.env.ALPACA_API_KEY_ID!,'APCA-API-SECRET-KEY':process.env.ALPACA_API_SECRET_KEY!},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok) throw new Error('Market feed unavailable');
 const text=await r.text();if(text.length>3000000) throw new Error('Response too large');return JSON.parse(text);
}
export async function GET(request:Request,{params}:{params:Promise<{ticker:string}>}) {
 try {
  const ticker=(await params).ticker.toUpperCase(),range=new URL(request.url).searchParams.get('range')||'live';
  if(!/^[A-Z.]{1,12}$/.test(ticker)||!['live','5d'].includes(range)) throw new HttpError(400,'Choose a supported stock and time range.');
  const admin=adminClient();const {data:company}=await admin.from('companies').select('ticker').eq('ticker',ticker).eq('market','US').maybeSingle();if(!company)throw new HttpError(400,'Choose a supported stock.');
  const {data:cached,error:cacheError}=await admin.from('stock_chart_cache').select('payload,expires_at,updated_at').eq('ticker',ticker).eq('range',range).maybeSingle();
  if(cacheError) throw new HttpError(503,'The intraday chart is temporarily unavailable. Daily history is still available.');
  const response=(payload:Record<string,unknown>,stale=false)=>Response.json({...payload,stale},{headers:{'Cache-Control':'private, no-store'}});
  if(cached && Date.parse(cached.expires_at)>Date.now() && Array.isArray(cached.payload.bars)) return response(cached.payload);
  if(!process.env.ALPACA_API_KEY_ID||!process.env.ALPACA_API_SECRET_KEY) throw new HttpError(503,'Intraday prices are not connected. Choose a daily range.');
  const {data:claimed,error:leaseError}=await admin.rpc('reserve_chart_refresh',{p_ticker:ticker,p_range:range});
  if(leaseError) throw new HttpError(503,'The intraday chart is temporarily unavailable.');
  if(!claimed) {
   if(cached?.payload?.bars?.length) return response(cached.payload,true);
   throw new HttpError(503,'The chart is being refreshed. Please try again shortly.');
  }
  try {
   const now=new Date(),q=new URLSearchParams({feed:'iex',timeframe:range==='live'?'1Min':'15Min',start:new Date(+now-10*86400000).toISOString(),end:now.toISOString(),limit:'10000',adjustment:'all',sort:'asc'});
   const [raw,snapshot]=await Promise.all([provider(ticker+'/bars?'+q),provider(ticker+'/snapshot?feed=iex')]);
   if(raw.next_page_token) throw new Error('Incomplete intraday history');
   const bars=chartSessions(minuteBars(raw.bars,new Date()),range);
   if(!bars.length) throw new Error('No intraday trades');
   const trade=snapshot.latestTrade;
   const quote=trade&&Number.isFinite(trade.p)&&trade.p>0&&Number.isFinite(Date.parse(trade.t))&&Date.parse(trade.t)<=Date.now()+3000?{price:trade.p,as_of:trade.t}:null;
   const reference=Number.isFinite(snapshot.prevDailyBar?.c)&&snapshot.prevDailyBar.c>0?snapshot.prevDailyBar.c:null;
   const refreshed_at=new Date().toISOString();
   const payload={ticker,range,bars,interval:range==='live'?'1 minute':'15 minutes',feed:'IEX',as_of:bars.at(-1)?.time,quote,reference_close:reference,refreshed_at,session_count:new Set(bars.map((b:{time:string})=>new Date(b.time).toLocaleDateString('en-CA',{timeZone:'America/New_York'}))).size};
   const {error}=await admin.from('stock_chart_cache').update({payload,updated_at:refreshed_at,expires_at:new Date(Date.now()+(range==='live'?60000:300000)).toISOString(),lease_until:new Date(0).toISOString()}).eq('ticker',ticker).eq('range',range);
   if(error) throw new Error('Cannot cache chart');
   return response(payload);
  } catch {
   // Keep the previous valid chart, and back off for one minute on provider errors.
   await admin.from('stock_chart_cache').update({lease_until:new Date(Date.now()+60000).toISOString()}).eq('ticker',ticker).eq('range',range);
   if(cached?.payload?.bars?.length) return response(cached.payload,true);
   throw new HttpError(503,'Intraday data is temporarily unavailable. Choose 1M, 3M, 6M or 1Y for saved daily history.');
  }
 } catch(e) {return errorResponse(e);}
}
