import {glossary} from '@/lib/market/glossary.mjs';
import type {SupabaseClient} from '@supabase/supabase-js';
import {HttpError} from '@/lib/news/api';
import {UUID} from '@/lib/news/validation.mjs';
import {topics} from './topics.mjs';
import {readingNotes} from '@/lib/market/learning-path.mjs';
import {getLanguage} from '@/lib/i18n/server';
import {translate} from '@/lib/i18n/translate.mjs';
import {createHash} from 'node:crypto';
import {articleOriginal} from '@/lib/news/original';
import {readingPassage} from '@/lib/news/original-text.mjs';
import {storedFiling} from '@/lib/news/filing';
import {filingPath} from '@/lib/news/reading.mjs';
import {filingDocument} from '@/lib/news/documents.mjs';
import {adminClient} from '@/lib/news/admin.mjs';
import {filingReadingText} from '@/lib/news/filing-format.mjs';
import {originalPage} from '@/lib/news/original-text.mjs';
import {enrichSource} from './context';
import type {ReaderSource,SourceSnapshot} from './types';
function strings(value:unknown):string[]{if(typeof value==='string')return [value];if(Array.isArray(value))return value.flatMap(strings);if(value&&typeof value==='object')return Object.entries(value).filter(([k])=>k!=='evidence_ids'&&k!=='sentiment').flatMap(([,v])=>strings(v));return [];}
export async function resolveSource(s:SupabaseClient,input:ReaderSource,query=''):Promise<SourceSnapshot>{
 if(!input||typeof input!=='object'||typeof input.id!=='string')throw new HttpError(400,'Choose an article to explain.');
 if(input.part!==undefined&&(!Number.isInteger(input.part)||input.part<1||input.part>300))throw new HttpError(400,'Invalid report page.');
 let title='',read='',ticker:string|null=null,url='',scope='',evidence:SourceSnapshot['evidence']=[];
 if(input.kind==='general'){
  if(!UUID.test(input.id))throw new HttpError(400,'Invalid conversation.');
  return {kind:'general',id:input.id,title:'Clearstock assistant',read_text:'',source_url:'/assistant',scope:'Text-only general assistant; no browsing or verified live source.',context_version:'assistant-v2-text',evidence:[]};
 }else if(input.kind==='filing'){
  const [symbol,accession,...extra]=input.id.split(':');if(extra.length)throw new HttpError(400,'Invalid report.');
  const filing=await storedFiling(s,symbol,accession);if(!filing)throw new HttpError(404,'Financial report unavailable.');
  let doc;try{doc=await filingDocument(adminClient(),filing.url,{fetchMissing:true});}catch{throw new HttpError(503,'The original report could not be loaded. Please retry; the financial summary is not the full report.');}
  if(!doc)throw new HttpError(503,'Financial report unavailable.');
  ticker=symbol;title=filing.title;url=filingPath(symbol,accession);read=title+'\n\n'+readingPassage(input.part!==undefined&&!doc.reading_pages?.length?originalPage(doc.full_text,input.part).text:filingReadingText(doc,input.part),query);scope='Full SEC original is cached for in-site reading. AI receives the selected relevant passage only.';evidence=[{id:'source',label:'SEC original report',text:read,url:filing.url}];
 }else if(input.kind==='concept'){
  const c=topics.find(t=>t.key===input.id);if(!c)throw new HttpError(404,'Learning topic unavailable.');
  title=c.term;read=[c.term,c.definition,...(readingNotes[c.key as keyof typeof readingNotes]||c.notes)].join('\n\n');url='/learn/'+c.key;scope='Learning library definition and reading notes';evidence=[{id:c.key,label:c.term,text:read,url:c.source}];
 }else if(input.kind==='stock'){
  const {data:c}=await s.from('companies').select('ticker,name,summary,sector').eq('ticker',input.id).maybeSingle();if(!c)throw new HttpError(404,'Company unavailable.');
  title=c.name+' ('+c.ticker+')';ticker=c.ticker;read=[c.name,c.summary,c.sector].join('\n');url='/stocks/'+c.ticker;scope='Company introduction and learning glossary; market snapshots supplied separately';evidence=[{id:'company',label:'Company introduction',text:read}];
  const glossaryRead=glossary.map(g=>[g.en,g.zh,g.definitionEn,g.definitionZh].join(' — ')).join('\n');read+='\n'+glossaryRead;evidence.push({id:'glossary',label:'Reviewed financial glossary',text:glossaryRead});
 }else{
  if(!UUID.test(input.id))throw new HttpError(400,'Invalid article.');
  if(input.kind==='analysis'){
   const {data:a}=await s.from('analysis_versions').select('id,ticker,kind,content,evidence,data_as_of').eq('id',input.id).maybeSingle();if(!a||a.kind==='material')throw new HttpError(404,'Explanation unavailable.');
   title=a.content.headline;ticker=a.ticker;read=strings(a.content).join('\n\n');url=(a.kind==='news'?'/news/':'/learning/')+a.id;scope='Saved article and evidence as of '+a.data_as_of;
   evidence=(a.evidence||[]).map((e:{id:string;label:string;text:string;url?:string})=>({...e,text:e.text.slice(0,16000)}));
   // Existing AI prose is context to explain, never upgraded to primary factual evidence.
  }else if(input.kind==='article'){
   const {data:a}=await s.from('market_articles').select('id,title,excerpt,source,source_key,source_url,tickers,published_at,body_text').eq('id',input.id).maybeSingle();if(!a)throw new HttpError(404,'Article unavailable.');
   title=a.title;read=[a.title,a.excerpt||''].join('\n\n');url='/articles/'+a.id;ticker=a.tickers?.[0]||null;scope='Available source title and excerpt only; published '+a.published_at;const original=await articleOriginal(a);if(original){read=a.title+'\n\n'+readingPassage(input.part===undefined?original.text:original.reading_pages?.length?filingReadingText({...original,full_text:original.text},input.part):originalPage(original.text,input.part).text,query);scope='Provider original is available for in-site reading; AI receives selected passages only. Published '+a.published_at;}evidence=[{id:'source',label:a.source+' — available source text',text:read,url:original?.url||a.source_url}];
  }else if(input.kind==='lesson'){
   const {data:a}=await s.from('ai_outputs').select('*').eq('id',input.id).eq('kind','lesson').maybeSingle();if(!a)throw new HttpError(404,'Lesson unavailable.');
   title=a.content.title;read=title+'\n\n'+a.content.answer;url='/learn/ai/'+a.id;scope='Saved AI learning article with its original learning evidence';evidence=a.source_snapshot.evidence;
  }else throw new HttpError(400,'Unsupported article.');
 }
 if(['concept','stock'].includes(input.kind)){const language=await getLanguage();if(language==='zh-Hans')read+='\n\n'+read.split('\n').map(text=>translate(language,text)).join('\n');}
 const bounded=evidence.slice(0,8);if(!bounded.length)throw new HttpError(422,'There is no source text to explain.');
 const enriched=await enrichSource({kind:input.kind,id:input.id,title:title.slice(0,240),read_text:read.slice(0,14000),source_url:url,ticker,scope,evidence:bounded},query);
 return {...enriched,context_version:createHash('sha256').update(JSON.stringify({version:enriched.context_version,evidence:bounded})).digest('hex')};
}
