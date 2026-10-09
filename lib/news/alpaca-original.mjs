import {providerBody} from './reading.mjs';
export async function alpacaOriginal(article,admin){
 if(article.source!=='Benzinga via Alpaca'||!/^alpaca:\d+$/.test(article.source_key||'')||!process.env.ALPACA_API_KEY_ID||!process.env.ALPACA_API_SECRET_KEY)return null;
 const stamp=Date.parse(article.published_at);if(!Number.isFinite(stamp))return null;
 const q=new URLSearchParams({start:new Date(stamp-1000).toISOString(),end:new Date(stamp+1000).toISOString(),include_content:'true',limit:'50',sort:'desc'});
 if(article.tickers?.length)q.set('symbols',article.tickers.join(','));
 try{const response=await fetch('https://data.alpaca.markets/v1beta1/news?'+q,{headers:{'APCA-API-KEY-ID':process.env.ALPACA_API_KEY_ID,'APCA-API-SECRET-KEY':process.env.ALPACA_API_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(8000),next:{revalidate:3600}});
 if(!response.ok||!response.body)return null;const chunks=[];let size=0;const reader=response.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000){await reader.cancel();return null;}chunks.push(value);}const d=JSON.parse(Buffer.concat(chunks).toString('utf8')),n=d.news?.find(n=>'alpaca:'+n.id===article.source_key&&n.source==='benzinga'&&n.url?.split('?')[0]===article.source_url.split('?')[0]);
 const text=providerBody(n?.content);if(text.length<200)return null;
 await admin.from('market_articles').update({body_text:text}).eq('source_key',article.source_key);
 return {text,url:article.source_url};}catch{return null;}
}
