import {createHash} from 'node:crypto';
import {adminClient} from '@/lib/news/admin.mjs';
import {currentMarket,quoteEvidence} from '@/lib/market/live.mjs';
import {filingDocument,documentPassages,validDocumentUrl} from '@/lib/news/documents.mjs';
import type {SourceSnapshot} from './types';
export async function enrichSource(source:SourceSnapshot,query='') {
 if(!source.ticker)return {...source,context_version:'reader-v9'};
 const admin=adminClient();let market=null,doc=null;
 try{const result=await currentMarket(admin);market=result.quotes?.[source.ticker]||null;}catch{
  const {data}=await admin.from('stock_data').select('payload').eq('ticker',source.ticker).eq('kind','price').maybeSingle();market=data?.payload||null;
 }
 const url=source.evidence.find(e=>validDocumentUrl(e.url))?.url;
 if(url){try{doc=await filingDocument(admin,url,{fetchMissing:false});}catch{/* Preserve the explicit excerpt scope if the SEC origin cannot be reached. */}}
 const passages=documentPassages(doc,query||source.title),quote=quoteEvidence(source.ticker,market);
 const retained=source.evidence.filter(e=>e.id!=='limitations'&&e.id!=='market-snapshot'&&(!doc||!(e.id==='filing'||e.id.startsWith('filing-part-'))));
 const evidence=[...(passages.length?passages:[]),...retained,...(quote?[quote]:[])];
 const scope=[quote?'Market context: timestamped Alpaca IEX snapshot, single exchange, no causal attribution.':'Market snapshot unavailable; do not infer price movement.',doc?'Full SEC original cached ('+doc.char_count+' characters, SHA256 '+doc.content_sha256+'); AI reads retrieved passages, not every line.':'Only the available source excerpt is in AI context.'].join(' ');
 const context_version=createHash('sha256').update(JSON.stringify({version:'reader-v9',id:source.id,document:doc?.content_sha256||null,market_evidence:quote?.text||null})).digest('hex');
 return {...source,scope,evidence,context_version};
}
