import {loadEnvFile} from 'node:process';
import {adminClient} from '../lib/news/admin.mjs';
import {filingDocument,validDocumentUrl} from '../lib/news/documents.mjs';
try{loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
// Warm the same public reports linked by the UI, so a hosting-network failure doesn't block reading.
const admin=adminClient(),ticker=process.argv.find(a=>a.startsWith('--ticker='))?.slice(9);
let q=admin.from('stock_data').select('ticker,kind,payload').in('kind',['filings','financials']);if(ticker)q=q.eq('ticker',ticker);
const {data,error}=await q;if(error)throw new Error('Stored financial data unavailable.');
const urls=new Set();for(const r of data||[]){if(r.kind==='filings')for(const f of (r.payload.filings||[]).slice(0,20))urls.add(f.url);
 if(r.kind==='financials')for(const frequency of ['annual','quarter','instant','year-to-date'])for(const m of Object.values(r.payload.periods?.find(p=>p.frequency===frequency)?.metrics||{}))urls.add(m.url);}
let ready=0,failed=0;for(const url of urls){if(!validDocumentUrl(url))continue;try{const d=await filingDocument(admin,url,{fetchMissing:true,structured:true});if(d?.reading_pages?.length){ready++;console.log('Cached '+new URL(url).pathname+' · '+d.char_count+' characters · '+d.reading_pages.length+' formatted pages');}else throw new Error('Formatted original unavailable');}catch(e){failed++;console.log('Unavailable '+new URL(url).pathname+' · '+e.message);}await new Promise(r=>setTimeout(r,200));}
console.log(JSON.stringify({ready,failed}));if(failed)process.exitCode=1;
