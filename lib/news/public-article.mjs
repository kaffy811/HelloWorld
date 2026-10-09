import {normalizeFilingText} from './validation.mjs';
export function validPublicArticleUrl(value){return /^https:\/\/www\.federalreserve\.gov\/(?:newsevents\/pressreleases\/[a-z0-9]+\.htm|monetarypolicy\/fomcminutes\d{8}\.htm)$/i.test(value||'');}
export function linkedMinutesUrl(html){const m=html.match(/href=["']((?:https:\/\/www\.federalreserve\.gov)?\/monetarypolicy\/fomcminutes\d{8}\.htm)["']/i);if(!m)return null;const url=new URL(m[1],'https://www.federalreserve.gov').href;return validPublicArticleUrl(url)?url:null;}
export function publicArticleExcerpt(html){
 const at=html.search(/<(?:div|article)\b[^>]*\bid=["']article["']/i);if(at<0)return '';
 const body=html.slice(at).split(/<footer\b|<div\b[^>]*\bid=["']footer["']/i)[0];
 const text=normalizeFilingText(body,120000),centers=[0];
 // Meeting minutes begin with administrative/market detail. Include policy and
 // economic discussions as explicit excerpts rather than silently truncating them.
 for(const phrase of ["Participants’ Views on Current Conditions and the Economic Outlook","Participants' Views on Current Conditions and the Economic Outlook","Committee Policy Actions","Staff Review of the Economic Situation"]){const at=text.indexOf(phrase);if(at>=0&&!centers.some(c=>Math.abs(c-at)<1500))centers.push(at);}
 if(centers.length===1)return text.slice(0,12000);
 const width=Math.floor(12000/centers.length);return centers.map(at=>text.slice(at,at+width)).join('\n\n[Separate source excerpt]\n\n');
}
async function publicHtml(url){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(4500),next:{revalidate:3600}});if(!r.ok)return null;const reader=r.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000){await reader.cancel();return null;}chunks.push(value);}return Buffer.concat(chunks).toString('utf8');
}
export async function publicArticleText(url){
 if(!validPublicArticleUrl(url))return null;
 try{const html=await publicHtml(url);if(!html)return null;
  const linked=linkedMinutesUrl(html);if(linked&&linked!==url){try{const minutes=await publicHtml(linked),text=minutes?publicArticleExcerpt(minutes):'';if(text.length>=200)return {text,url:linked,kind:'minutes'};}catch{/* Keep the announcement excerpt if the linked document is unreachable. */}}
  const text=publicArticleExcerpt(html);return text.length>=200?{text,url,kind:/\/monetarypolicy\//.test(url)?'minutes':'press-release'}:null;
 }catch{return null;}
}
