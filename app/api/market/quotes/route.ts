import {adminClient} from '@/lib/news/admin.mjs';
import {currentMarket} from '@/lib/market/live.mjs';
export const maxDuration=60;
export async function GET(){try{const market=await currentMarket(adminClient());const quotes=Object.fromEntries(Object.entries(market.quotes||{}).map(([ticker,p])=>{const {bars,features,...quote}=p as import('@/lib/market/types').Price;void bars;void features;return [ticker,quote];}));return Response.json({...market,quotes},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Market feed is temporarily unavailable. The previous snapshot is retained.',poll_ms:30000},{status:503,headers:{'Cache-Control':'no-store'}});}}
