import {officialOriginal} from './original-text.mjs';
import {filingDocument} from './documents.mjs';
import {adminClient} from './admin.mjs';
import {alpacaOriginal} from './alpaca-original.mjs';
export type OriginalDocument={text:string;url:string;reading_pages?:{html:string;text:string}[];reading_version?:string};
export async function articleOriginal(article:{source:string;source_url:string;source_key?:string;body_text?:string|null;published_at?:string;tickers?:string[]}):Promise<OriginalDocument|null>{
 if(article.source==='SEC'){try{const doc=await filingDocument(adminClient(),article.source_url,{fetchMissing:true,structured:true});return doc?{text:doc.full_text as string,url:doc.source_url as string,reading_pages:doc.reading_pages,reading_version:doc.reading_version}:null;}catch{return null;}}
 if(article.source==='Benzinga via Alpaca')return article.body_text?{text:article.body_text,url:article.source_url}:alpacaOriginal(article,adminClient());
 return officialOriginal(article.source_url,article.source);
}
