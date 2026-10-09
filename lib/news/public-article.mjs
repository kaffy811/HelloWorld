import {normalizeFilingText} from './validation.mjs';
export function validPublicArticleUrl(value){return /^https:\/\/www\.federalreserve\.gov\/newsevents\/pressreleases\/[a-z0-9]+\.htm$/i.test(value||'');}
export function publicArticleExcerpt(html){
 const at=html.search(/<(?:div|article)\b[^>]*\bid=["']article["']/i);if(at<0)return '';
 const body=html.slice(at).split(/<footer\b|<div\b[^>]*\bid=["']footer["']/i)[0];
 return normalizeFilingText(body,12000);
}
export async function publicArticleText(url){
 if(!validPublicArticleUrl(url))return null;
 try{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(6000),next:{revalidate:3600}});if(!r.ok)return null;const reader=r.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000){await reader.cancel();return null;}chunks.push(value);}const text=publicArticleExcerpt(Buffer.concat(chunks).toString('utf8'));return text.length>=200?text:null;}catch{return null;}
}
