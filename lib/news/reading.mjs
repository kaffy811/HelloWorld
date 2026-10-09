import {normalizeFilingText} from './validation.mjs';
// Render text only; provider HTML never reaches the browser as markup.
export function providerBody(html){
 if(typeof html!=='string'||html.length>1000000)return '';
 return html.replace(/<(script|style|nav|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi,'').split(/<\/(?:p|h[1-6]|li|tr|section)>|<br\s*\/?>/i).map(p=>normalizeFilingText(p,200001)).filter(Boolean).join('\n\n').slice(0,200000);
}
export function stockReturn(value,tickers=[]){return typeof value==='string'&&/^\/stocks\/[A-Z][A-Z0-9.]{0,11}(?:\/(?:news|financials))?$/.test(value)&&tickers.includes(value.split('/')[2])?value:null;}
export function filingPath(ticker,accession){return '/stocks/'+ticker+'/filings/'+accession;}
export function findFiling(rows,ticker,accession){
 if(!/^[A-Z][A-Z0-9.]{0,11}$/.test(ticker)||!/^\d{10}-\d{2}-\d{6}$/.test(accession))return null;
 const own=rows.filter(r=>r.ticker===ticker),filing=own.find(r=>r.kind==='filings')?.payload.filings?.find(f=>f.accession===accession);
 if(filing)return filing;
 for(const p of own.find(r=>r.kind==='financials')?.payload.periods||[])for(const m of Object.values(p.metrics||{}))if(m.accession===accession)return {accession,url:m.url,form:m.form,date:m.filed,period:p.end,title:ticker+' · '+m.form+' · '+p.end};
 return null;
}
export function textOnlyChat(input){if(input?.image_ids!==undefined&&(!Array.isArray(input.image_ids)||input.image_ids.length))throw new Error('Image uploads are not supported in chat. Please type your question.');}
