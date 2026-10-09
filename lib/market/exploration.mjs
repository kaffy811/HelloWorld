// Shared deterministic transformations: no provider calls or user data exports.
export const chartRanges = ['live','5d','1m','3m','6m','1y'];
export function easternDay(value) { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)); }
export function minuteBars(raw, now = new Date()) {
 const rows = new Map();
 for(const b of raw || []) {
  if(!b?.t || !Number.isFinite(Date.parse(b.t)) || Date.parse(b.t)>+now || ![b.o,b.h,b.l,b.c,b.v].every(Number.isFinite) || Math.min(b.o,b.h,b.l,b.c)<=0 || b.v<0 || b.h<Math.max(b.o,b.c,b.l) || b.l>Math.min(b.o,b.c,b.h)) continue;
  const clock = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(b.t));
  if(clock<'09:30' || clock>='16:00') continue;
  rows.set(b.t,{time:b.t,open:b.o,high:b.h,low:b.l,close:b.c,volume:b.v});
 }
 return [...rows.values()].sort((a,b)=>a.time.localeCompare(b.time));
}
export function chartSessions(bars, range) {
 const sessions = [...new Set(bars.map(b=>easternDay(b.time)))];
 const selected = new Set(sessions.slice(range==='live' ? -1 : -5));
 return bars.filter(b=>selected.has(easternDay(b.time)));
}
export function aggregateBars(bars, interval='daily') {
 if(interval==='daily') return bars;
 const buckets = new Map();
 for(const b of bars) {
  let key;
  if(interval==='monthly') key = easternDay(b.time).slice(0,7);
  else { const date = new Date(easternDay(b.time)+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7)); key=date.toISOString().slice(0,10); }
  const old=buckets.get(key);
  if(!old) buckets.set(key,{...b}); else {old.high=Math.max(old.high,b.high);old.low=Math.min(old.low,b.low);old.close=b.close;old.volume+=b.volume;}
 }
 return [...buckets.values()];
}
export function dailyRange(bars, range, interval='daily') {
 const count = {'1m':22,'3m':66,'6m':132,'1y':260}[range] || 260;
 return aggregateBars(bars.slice(-count),interval);
}
export const topics = [['all','All topics'],['rates','Interest rates'],['inflation','Inflation'],['jobs','Jobs & economy'],['regulation','Regulation'],['earnings','Financial reports'],['corporate','Company events'],['other','Other updates']];
export const sectors = [['all','All sectors'],['technology','Technology'],['consumer','Consumer'],['communications','Communications'],['financials','Financials']];
export function classifyArticle(a) {
 const ticker=a.tickers?.[0], title=(a.title||'').toLowerCase();
 let topic='other', sector='all';
 if(a.source==='SEC') {topic=/10-[kq]/i.test(title)?'earnings':'corporate';sector=['AAPL','MSFT'].includes(ticker)?'technology':ticker==='NFLX'?'communications':'consumer';}
 else if(a.source==='Federal Reserve') {topic=a.category==='industry'?'regulation':'rates';if(topic==='regulation') sector='financials';}
 else if(a.source==='BLS') topic=/employment|unemployment|payroll|labor|job/.test(title)?'jobs':/price|inflation|cpi|ppi/.test(title)?'inflation':'jobs';
 return {topic,sector};
}
function validDate(value) { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value; }
function midnightET(value) { const d=new Date(value+'T12:00:00Z');const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(d));return new Date(+d-(hour*3600000)).toISOString(); }
export function normalizeNewsFilters(input={},now=new Date()) {
 const one=v=>Array.isArray(v)?v[0]:v;
 const category=['all','market','industry','company','policy'].includes(one(input.category))?one(input.category):'all';
 const topic=topics.some(([k])=>k===one(input.topic))?one(input.topic):'all';
 const sector=sectors.some(([k])=>k===one(input.sector))?one(input.sector):'all';
 const ticker=/^[A-Z][A-Z0-9.]{0,5}$/.test(one(input.ticker)||'')?one(input.ticker):''; // Database-backed company choices; new tickers need no code allowlist.
 const q=String(one(input.q)||'').trim().slice(0,80).replace(/[%_]/g,'');
 const period=['all','today','7d','30d','custom'].includes(one(input.period))?one(input.period):'all';
 let start=null,end=null,error=''; const from=one(input.from)||'',to=one(input.to)||'';
 if(period==='today') start=midnightET(easternDay(now));
 else if(period==='7d'||period==='30d') start=new Date(+now-(period==='7d'?7:30)*86400000).toISOString();
 else if(period==='custom') {
  if((from&&!validDate(from))||(to&&!validDate(to))||(!from&&!to)||(from&&to&&from>to)) error='Choose a valid start and end date.';
  else {if(from) start=midnightET(from);if(to) {const next=new Date(to+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);end=midnightET(next.toISOString().slice(0,10));}}
 }
 const page=Math.max(1,Math.min(1000,parseInt(one(input.page))||1));
 return {category,topic,sector,ticker,q,period,from,to,start,end,page,error};
}
export function validateNote(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('Invalid note.');
 const title=typeof input.title==='string'?input.title.trim():'';
 const body=typeof input.body==='string'?input.body.trim():'';
 if(!title||title.length>160) throw new Error('Add a title, up to 160 characters.');
 if(!body||body.length>12000) throw new Error('Add your notes, up to 12,000 characters.');
 return {title,body};
}
