import {normalizeSnapshot} from './processing.mjs';
export const POLL_MS=15000;
export const MARKET_PROXIES=['SPY','QQQ','DIA'];
export function mergeSnapshot(snapshot, previous, now=new Date()) {
 const fresh=normalizeSnapshot(snapshot,[],now);
 return {...previous,...fresh,bars:previous?.bars||[],features:previous?.features||fresh.features,
 history_period_end:previous?.history_period_end||null,volume_as_of:snapshot?.dailyBar?.t||null,retrieved_at:now.toISOString(),
 quality:{coverage:'IEX single exchange; not consolidated US volume',history_truncated:previous?.quality?.history_truncated||false}};
}
export function quoteEvidence(ticker,p,now=new Date()) {
 if(!p||!Number.isFinite(p.price)||p.price<=0||!Number.isFinite(Date.parse(p.as_of))||Date.parse(p.as_of)>+now)return null;

 const stats=p.history_period_end&&p.features?` Completed adjusted IEX daily history ends ${p.history_period_end}. Precomputed history features: 20-session mean ${Number.isFinite(p.features.ma20)?Number(p.features.ma20.toFixed(2)):'unavailable'} USD; five-session return ${Number.isFinite(p.features.return_5d)?Number(p.features.return_5d.toFixed(2)):'unavailable'} %; twenty-session return ${Number.isFinite(p.features.return_20d)?Number(p.features.return_20d.toFixed(2)):'unavailable'} %. These features are through that completed daily history, not recalculated for the latest trade.`:'';
 return {id:'market-snapshot',label:ticker+' · Alpaca IEX market snapshot',url:'https://docs.alpaca.markets/us/docs/market-data-faq',
 text:`Ticker ${ticker}. Price ${p.price} USD as of ${p.as_of}. Previous IEX daily close ${p.previous_close??'unavailable'} USD; daily change ${Number.isFinite(p.change)?Number(p.change.toFixed(2)):'unavailable'} USD; daily change percent ${Number.isFinite(p.change_percent)?Number(p.change_percent.toFixed(2)):'unavailable'} %. IEX daily-bar volume ${p.volume??'unavailable'} shares for bar timestamp ${p.volume_as_of||'unavailable'}. Change and percent values are deterministically rounded to two decimal places for display. IEX is one exchange, not a consolidated US market feed. A last trade can be old after the regular session closes. These observations do not establish that this news caused a price move. The snapshot is current context, not historical event-time evidence.${stats}`};
}
export async function alpacaJson(path,{clock=false}={}) {
 const origin=clock?'https://paper-api.alpaca.markets':'https://data.alpaca.markets';
 const r=await fetch(origin+path,{headers:{'APCA-API-KEY-ID':process.env.ALPACA_API_KEY_ID,'APCA-API-SECRET-KEY':process.env.ALPACA_API_SECRET_KEY},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Market provider returned '+r.status);
 const text=await r.text();if(text.length>3000000)throw new Error('Market response too large');return JSON.parse(text);
}
export async function currentMarket(admin) {
 const {data:cached,error}=await admin.from('market_refresh_state').select('payload,expires_at,updated_at').eq('id',1).maybeSingle();
 if(error)throw new Error('Market refresh migration is required');
 const fallback=()=>({...cached?.payload,stale:true,refresh_error:true,poll_ms:POLL_MS});
 if(cached&&Date.parse(cached.expires_at)>Date.now())return {...cached.payload,poll_ms:POLL_MS};
 if(!process.env.ALPACA_API_KEY_ID||!process.env.ALPACA_API_SECRET_KEY)throw new Error('Market feed is not configured');
 const {data:claimed,error:leaseError}=await admin.rpc('reserve_market_refresh');
 if(leaseError)throw new Error('Market refresh unavailable');
 if(!claimed){if(cached?.payload?.quotes)return {...cached.payload,stale:true,poll_ms:POLL_MS};throw new Error('Market refresh is in progress');}
 try {
  const [{data:companies,error:companyError},{data:rows,error:rowError}]=await Promise.all([
   admin.from('companies').select('ticker').eq('market','US').order('ticker'),
   admin.from('stock_data').select('ticker,payload').eq('kind','price')]);
  if(companyError||rowError)throw new Error('Market directory unavailable');
  const symbols=[...new Set([...(companies||[]).map(c=>c.ticker),...MARKET_PROXIES])];
  if(symbols.length>100)throw new Error('Market universe exceeds this collector limit');
  const snapshots={};for(let i=0;i<symbols.length;i+=50)Object.assign(snapshots,await alpacaJson('/v2/stocks/snapshots?feed=iex&symbols='+symbols.slice(i,i+50).join(',')));
  let session=cached?.payload?.session||null;
  if(!session||Date.now()-Date.parse(session.checked_at)>60000){try{const c=await alpacaJson('/v2/clock',{clock:true});if(typeof c.is_open==='boolean'&&Number.isFinite(Date.parse(c.timestamp)))session={is_open:c.is_open,timestamp:c.timestamp,next_open:c.next_open,next_close:c.next_close,checked_at:new Date().toISOString()};}catch{session=null;}}
  const now=new Date(),quotes={},previous=new Map((rows||[]).map(r=>[r.ticker,r.payload])),missing=[];
  for(const ticker of symbols){try{quotes[ticker]=mergeSnapshot(snapshots[ticker],previous.get(ticker),now);}catch{missing.push(ticker);if(previous.get(ticker))quotes[ticker]={...previous.get(ticker),stale:true};}}
  if(!Object.values(quotes).length||missing.length===symbols.length)throw new Error('No valid new market snapshot');
  const valid=symbols.filter(t=>quotes[t]&&!missing.includes(t));
  const {error:writeError}=await admin.from('stock_data').upsert(valid.map(ticker=>({ticker,kind:'price',source:'Alpaca IEX',as_of:quotes[ticker].as_of,updated_at:now.toISOString(),payload:quotes[ticker]})),{onConflict:'ticker,kind'});
  if(writeError)throw new Error('Market storage unavailable');
  const compactQuotes=Object.fromEntries(Object.entries(quotes).map(([ticker,p])=>{const {bars,...quote}=p;void bars;return [ticker,quote];}));
  const payload={quotes:compactQuotes,session,feed:'iex',coverage:'IEX only',checked_at:now.toISOString(),stale:false,missing};
  const {error:cacheError}=await admin.from('market_refresh_state').update({payload,updated_at:now.toISOString(),expires_at:new Date(+now+12000).toISOString(),lease_until:new Date(0).toISOString()}).eq('id',1);
  if(cacheError)throw new Error('Market cache unavailable');return {...payload,poll_ms:POLL_MS};
 }catch{await admin.from('market_refresh_state').update({lease_until:new Date(Date.now()+30000).toISOString()}).eq('id',1);if(cached?.payload?.quotes)return fallback();throw new Error('Market feed is temporarily unavailable');}
}
