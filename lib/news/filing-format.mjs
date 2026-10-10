import {parse,parseFragment,serialize} from 'parse5';
export const FILING_READING_VERSION='sec-html-v1';
const dropped=new Set(['head','script','style','iframe','frame','frameset','object','embed','svg','math','template','noscript','form','input','button','select','textarea','img','video','audio','canvas','ix:header','ix:hidden']);
const allowed=new Set(['div','p','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','caption','ul','ol','li','blockquote','strong','b','em','i','u','sup','sub','br','hr']);
const block=new Set(['div','p','h1','h2','h3','h4','h5','h6','table','tr','td','th','li','ul','ol','blockquote','br','hr']);
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value||'';
function invisible(node){return dropped.has(node.tagName)||node.attrs?.some(a=>a.name==='hidden')||attr(node,'aria-hidden')==='true'||/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(attr(node,'style'));}
function textOf(node){if(node.nodeName==='#text')return node.value;if(invisible(node))return '';const text=(node.childNodes||[]).map(textOf).join('');return block.has(node.tagName)?' '+text+' ':text;}
const normalized=node=>textOf(node).replace(/\s+/g,' ').trim();
function sourceHeading(node,text){if(text.length>170||!text)return false;const styles=[attr(node,'style'),...(node.childNodes||[]).map(c=>attr(c,'style'))].join(';');return /^item\s+\d+[a-z]?\b/i.test(text)||(/font-weight\s*:\s*(?:bold|[6-9]00)/i.test(styles)&&((/[A-Z]{3}/.test(text)&&text===text.toUpperCase())||/font-size\s*:\s*(?:1[6-9]|[2-9]\d)(?:\.\d+)?(?:pt|px)/i.test(styles)));}
function clean(node,insideTable=false){
 if(node.nodeName==='#text')return escape(node.value);if(invisible(node)||node.nodeName==='#comment')return '';
 const tag=node.tagName,plain=normalized(node);if(!['br','hr','td','th'].includes(tag)&&!plain)return '';
 const table=insideTable||tag==='table',children=!plain&&['td','th'].includes(tag)?'':(node.childNodes||[]).map(n=>clean(n,table)).join('');if(!tag||!allowed.has(tag)){
  if(tag==='span'&&/font-weight\s*:\s*(?:bold|[6-9]00)/i.test(attr(node,'style')))return '<strong>'+children+'</strong>';
  return children;
 }
 let output=tag,attributes='';
 if(['td','th'].includes(tag)){for(const name of ['colspan','rowspan']){const value=attr(node,name);if(/^[1-9]\d?$/.test(value))attributes+=' '+name+'="'+value+'"';}}
 const alignment=attr(node,'style').match(/(?:^|;)\s*text-align\s*:\s*(center|right)\b/i)?.[1]?.toLowerCase();if(alignment)attributes+=' class="filing-'+alignment+'"';
 if(!table&&['div','p'].includes(tag)&&!(node.childNodes||[]).some(c=>block.has(c.tagName)&&c.tagName!=='br')&&sourceHeading(node,plain))output='h2';
 if(tag==='table')return '<div class="filing-table-scroll" role="region" tabindex="0" aria-label="Original report table"><table>'+children+'</table></div>';
 if(tag==='br'||tag==='hr')return '<'+tag+'>';
 return '<'+output+attributes+'>'+children+'</'+output+'>';
}
function bodyOf(root){if(root.tagName==='body')return root;for(const c of root.childNodes||[]){const found=bodyOf(c);if(found)return found;}return null;}
export function formatFiling(html,budget=16000){
 if(typeof html!=='string'||Buffer.byteLength(html)>12000000)throw new Error('Filing exceeds HTML processing limit');
 const body=bodyOf(parse(html));if(!body)throw new Error('Filing has no readable body');
 const pages=[];let page={html:'',text:''};
 // Keep each original block (especially tables) intact across reading pages.
 function* readingNodes(node){if(['div','section','article'].includes(node.tagName)&&normalized(node).length>budget&&(node.childNodes||[]).some(c=>block.has(c.tagName))){for(const c of node.childNodes)yield* readingNodes(c);}else yield node;}
 for(const root of body.childNodes||[])for(const node of readingNodes(root)){const text=normalized(node),safe=clean(node);if(!text||!safe)continue;if(page.text&&page.text.length+text.length>budget){pages.push(page);page={html:'',text:''};}page.html+=safe;page.text+=(page.text?'\n\n':'')+text;}
 if(page.text)pages.push(page);
 if(!pages.length||pages.length>300||JSON.stringify(pages).length>8000000)throw new Error('Filing exceeds formatted processing limit');
 return {version:FILING_READING_VERSION,pages};
}
// SEC accounting layouts often separate a currency or percent sign from its
// number. Join only these adjacent cells, retaining their total column span so
// dates, blank-symbol rows and multi-year headings stay over the same values.
const financialNumber=text=>/^(?:[+\-−]?\(?\d[\d,.]*\)?|[—–-])$/.test(text);
const currency=text=>/^[\u0024£€¥]$/.test(text);
const spanOf=cell=>Number(attr(cell,'colspan'))||1;
function tableRows(table){
 const rows=[];
 function visit(node){if(node!==table&&node.tagName==='table')return;if(node.tagName==='tr')rows.push(node);else for(const child of node.childNodes||[])visit(child);}
 visit(table);return rows;
}
function trimCellText(cell){
 const texts=[];function visit(node){if(node.nodeName==='#text')texts.push(node);else for(const child of node.childNodes||[])visit(child);}
 visit(cell);if(texts.length){texts[0].value=texts[0].value.trimStart();texts[texts.length-1].value=texts[texts.length-1].value.trimEnd();}
}
function compactTable(table){
 const rows=tableRows(table),layouts=rows.map(row=>{
  let column=0;return (row.childNodes||[]).filter(n=>['td','th'].includes(n.tagName)).map(cell=>{const start=column;column+=spanOf(cell);return {cell,start,end:column};});
 });
 // Avoid changing complex grids whose cells extend into other rows.
 if(layouts.some(cells=>cells.some(({cell})=>Number(attr(cell,'rowspan'))>1)))return;
 const currencyPairs=new Set();
 for(const cells of layouts)for(let i=0;i<cells.length-1;i++)if(currency(normalized(cells[i].cell))&&financialNumber(normalized(cells[i+1].cell)))currencyPairs.add(cells[i].start+':'+cells[i+1].end);
 for(let r=0;r<rows.length;r++){
  const cells=layouts[r];
  for(let i=0;i<cells.length-1;i++){
   const left=cells[i],right=cells[i+1],a=normalized(left.cell),b=normalized(right.cell);
   const prefix=(currency(a)||(!a&&currencyPairs.has(left.start+':'+right.end)))&&financialNumber(b);
   const suffix=financialNumber(a)&&b==='%';
   if(!prefix&&!suffix)continue;
   const first=left.cell,second=right.cell;
   trimCellText(first);trimCellText(second);
   first.attrs=first.attrs.filter(attr=>!['class','colspan'].includes(attr.name));
   first.attrs.push({name:'class',value:'filing-right'},{name:'colspan',value:String(right.end-left.start)});
   // One nonbreaking space keeps the symbol close while preserving the
   // source's whitespace-normalized selection evidence for AI explanations.
   first.childNodes=[...(a?first.childNodes:[]),...(a?[{nodeName:'#text',value:'\u00a0',parentNode:first}]:[]),...second.childNodes];
   for(const child of first.childNodes)child.parentNode=first;
   rows[r].childNodes=rows[r].childNodes.filter(node=>node!==second);
   i++;
  }
 }
}
export function compactFilingTables(html){
 const root=parseFragment(html);
 function visit(node){for(const child of node.childNodes||[])visit(child);if(node.tagName==='table')compactTable(node);}
 visit(root);return serialize(root);
}
export function formattedPage(doc,part=1){const pages=doc.reading_version===FILING_READING_VERSION&&Array.isArray(doc.reading_pages)?doc.reading_pages:null;if(!pages?.length)return null;const page=Math.max(1,Math.min(pages.length,parseInt(String(part))||1)),content=pages[page-1];return {...content,html:compactFilingTables(content.html),page,total:pages.length};}
export function filingReadingText(doc,part){if(doc.reading_version!==FILING_READING_VERSION||!doc.reading_pages?.length)return doc.full_text;return part===undefined?doc.reading_pages.map(p=>p.text).join('\n\n'):formattedPage(doc,part).text;}
