import {officialOriginal} from './original-text.mjs';
import {filingDocument} from './documents.mjs';
import {adminClient} from './admin.mjs';
export async function articleOriginal(article:{source:string;source_url:string}){
 if(article.source==='SEC'){try{const doc=await filingDocument(adminClient(),article.source_url,{fetchMissing:false});return doc?{text:doc.full_text as string,url:doc.source_url as string}:null;}catch{return null;}}
 return officialOriginal(article.source_url,article.source);
}
