import Link from 'next/link';
import {T} from './language-provider';
import {originalPage,readingParagraphs} from '@/lib/news/original-text.mjs';
import {formattedPage} from '@/lib/news/filing-format.mjs';
export function OriginalReading({text,path,part=1,from,formatted}:{text:string;path:string;part?:number;from?:string|null;formatted?:{reading_version?:string;reading_pages?:{html:string;text:string}[]}|null}){
 const rich=formatted?formattedPage(formatted,part):null,page=rich||originalPage(text,part),url=(n:number)=>path+'?part='+n+(from?'&from='+encodeURIComponent(from):'');
 return <section className="original-reading"><div className="original-reading-heading"><span className="eyebrow"><T text="ORIGINAL SOURCE TEXT"/></span><p className="reading-tip"><T text="Select an unfamiliar word or sentence to explain it and save it to Terms."/></p></div>{rich?<div className="original-body filing-html" dangerouslySetInnerHTML={{__html:rich.html}}/>:<div className="original-body">{readingParagraphs(page.text).map((p:string,i:number)=><p key={i}>{p}</p>)}</div>}{page.total>1&&<nav className="history-pagination" aria-label="Original text pages">{page.page>1&&<Link href={url(page.page-1)}><T text="← Previous"/></Link>}<span><T text="Page "/>{page.page}<T text=" of "/>{page.total}</span>{page.page<page.total&&<Link href={url(page.page+1)}><T text="Next →"/></Link>}</nav>}</section>;
}
