import {createHash} from 'node:crypto';
import {normalizeFilingText} from './validation.mjs';
export function validDocumentUrl(value){return /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d+\/[A-Za-z0-9_.-]+\.html?$/.test(value||'');}
export async function filingDocument(admin,url,{fetchMissing=false}={}) {
 if(!validDocumentUrl(url))return null;
 const {data,error}=await admin.from('filing_documents').select('*').eq('source_url',url).maybeSingle();
 if(error)throw new Error('Filing document migration is required');if(data||!fetchMissing)return data;
 if(!process.env.SEC_USER_AGENT?.includes('@'))throw new Error('SEC contact is not configured');
 const r=await fetch(url,{headers:{'User-Agent':process.env.SEC_USER_AGENT,'Accept-Encoding':'gzip, deflate'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('SEC document is temporarily unavailable');
 const chunks=[];let size=0;const reader=r.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000000){await reader.cancel();throw new Error('Filing exceeds processing limit');}chunks.push(value);}
 const full=normalizeFilingText(Buffer.concat(chunks).toString('utf8'),2000001);
 if(full.length<200||full.length>2000000)throw new Error('Filing exceeds text processing limit');
 const row={source_url:url,full_text:full,content_sha256:createHash('sha256').update(full).digest('hex'),char_count:full.length,retrieved_at:new Date().toISOString()};
 const {error:saveError}=await admin.from('filing_documents').upsert(row,{onConflict:'source_url'});if(saveError)throw new Error('Filing could not be cached');return row;
}
// Model input uses explicit retrieved passages, not a claim that it read the whole report.
export function documentPassages(doc,query='',budget=18000){
 if(!doc)return [];const text=doc.full_text;const terms=[...new Set((query.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(t=>!['explain','article','available','translate','simply','meaning','business'].includes(t)))].slice(0,8);
 const centers=[0];for(const term of [...terms,'management’s discussion','management\'s discussion','risk factors','financial statements','warehouses']){const lower=text.toLowerCase();let at=lower.indexOf(term);const later=lower.indexOf(term,Math.max(5000,at+term.length));if(at<5000&&later>=0&&['risk factors','financial statements','management’s discussion',"management's discussion"].includes(term))at=later;if(at>=0&&!centers.some(c=>Math.abs(c-at)<1500))centers.push(at);}
 const width=Math.floor(budget/Math.min(centers.length,6)),parts=[];
 for(const at of centers.slice(0,6)){const start=Math.max(0,at-300),end=Math.min(text.length,start+width);parts.push({id:'filing-part-'+parts.length,label:'SEC document passage '+(parts.length+1),url:doc.source_url,text:`Source document SHA256 ${doc.content_sha256}. Character offsets ${start} to ${end} of ${doc.char_count}. Retrieved passage, not the full document in model context. `+text.slice(start,end)});}
 return parts;
}
