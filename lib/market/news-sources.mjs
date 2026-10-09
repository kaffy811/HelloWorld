import {decode} from './processing.mjs';
export const newsSources = [['all','All sources'],['SEC','SEC'],['Federal Reserve','Federal Reserve'],['BLS','BLS'],['BEA','BEA'],['Benzinga via Alpaca','Benzinga via Alpaca']];
export const officialFeeds = [
 ['Federal Reserve','https://www.federalreserve.gov/feeds/press_monetary.xml','market'],
 ['Federal Reserve','https://www.federalreserve.gov/feeds/press_bcreg.xml','industry'],
 ['BLS','https://www.bls.gov/feed/bls_latest.rss','market'],
 ['BEA','https://apps.bea.gov/rss/rss.xml','market'],
];
export function alpacaNewsUrl(symbols, now, pageToken) {
 const q=new URLSearchParams({symbols:symbols.join(','),start:new Date(+now-7*86400000).toISOString(),limit:'50',sort:'desc',include_content:'false'});
 if(pageToken)q.set('page_token',pageToken);
 return 'https://data.alpaca.markets/v1beta1/news?'+q;
}
// Only provider-supplied public summaries are stored. No article bodies or images.
export function normalizeAlpacaNews(raw, companies, now=new Date()) {
 if(!Array.isArray(raw?.news))throw new Error('Invalid Alpaca news response');
 const configured=new Set(companies.map(c=>c.ticker)), rows=new Map();
 for(const n of raw.news){
  if(!Number.isSafeInteger(n.id)||n.id<1||n.source!=='benzinga'||typeof n.headline!=='string'||typeof n.url!=='string')continue;
  let url;try{url=new URL(n.url);}catch{continue;}
  const published=new Date(n.created_at), title=decode(n.headline);
  const tickers=[...new Set((Array.isArray(n.symbols)?n.symbols:[]).filter(t=>configured.has(t)))];
  if(url.protocol!=='https:'||!['www.benzinga.com','benzinga.com'].includes(url.hostname)||url.username||url.password||url.port||!url.pathname.startsWith('/')||!title||title.length>500||!tickers.length||!Number.isFinite(+published)||published>now)continue;
  url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
  rows.set(n.id,{source_key:'alpaca:'+n.id,title,excerpt:typeof n.summary==='string'?decode(n.summary).slice(0,3000):'',source:'Benzinga via Alpaca',source_url:url.href,category:'company',tickers,published_at:published.toISOString(),collected_at:now.toISOString()});
 }
 return [...rows.values()];
}
