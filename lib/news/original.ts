import {officialOriginal} from './original-text.mjs';
import {filingDocument} from './documents.mjs';
import {adminClient} from './admin.mjs';
import {alpacaOriginal} from './alpaca-original.mjs';
export async function articleOriginal(article:{source:string;source_url:string;source_key?:string;body_text?:string|null;published_at?:string;tickers?:string[]}){
 if(article.source==='SEC'){try{const doc=await filingDocument(adminClient(),article.source_url,{fetchMissing:true});return doc?{text:doc.full_text as string,url:doc.source_url as string}:null;}catch{return null;}}
 if(article.source==='Benzinga via Alpaca')return article.body_text?{text:article.body_text,url:article.source_url}:alpacaOriginal(article,adminClient());
 return officialOriginal(article.source_url,article.source);
}
