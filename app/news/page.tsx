import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {NewsRefresh} from '@/components/news-refresh';
import {articles,latestNewsImport} from '@/lib/market/data';
import {companies} from '@/lib/news/data';
import {easternDate} from '@/lib/news/data';
import {ArticleList} from '@/components/market-display';
import {NewsFilters} from '@/components/news-filters';
import {normalizeNewsFilters} from '@/lib/market/exploration.mjs';
export default async function News({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {t:ui}=await getTranslator();
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 const filters=normalizeNewsFilters(await searchParams);const [feed,directory,lastImport]=await Promise.all([filters.error?Promise.resolve({data:[],count:0,error:false}):articles(filters.ticker||undefined,filters.category,filters.page,filters),companies(),latestNewsImport()]);
 const url=(page:number,category=filters.category)=>{const query=new URLSearchParams();for(const key of ['topic','sector','ticker','q','period','from','to'] as const)if(filters[key]&&filters[key]!=='all')query.set(key,filters[key]);query.set('category',category);if(category!==filters.category)query.delete('topic');query.set('page',String(page));return '/news?'+query;};
 return <><section className="page-heading"><span className="eyebrow"><T text="US MARKET & COMPANY UPDATES"/></span><h1><T text="Find the news that matters to you."/></h1><p><T text="Start with a category, then narrow by topic, company and time."/></p><p className="small">{lastImport?'Last checked '+easternDate(lastImport)+'. ':<T text="No source updates imported yet. "/>}<T text="News updates are currently refreshed manually."/></p></section>
 <NewsRefresh signedIn={!!user&&!user.is_anonymous}/>
 <nav className="tabs" aria-label={ui("News categories")}>{[['all','All news'],['market','Markets'],['industry','Industry'],['company','Companies'],['policy','Policy']].map(([key,label])=><Link key={key} className={filters.category===key?'active':''} href={url(1,key)}>{ui(label)}</Link>)}</nav>
 <NewsFilters filters={filters} companies={directory.data}/>
 <p className="small"><T text="Coverage: SEC filings from six companies, Federal Reserve policy and financial-sector regulation, and BLS economic releases. Sector labels organize available reports; they do not imply broad sector-news coverage."/></p>
 <div className="section-title news-results"><h2>{feed.count} {feed.count===1?<T text="update"/>:<T text="updates"/>}</h2><span className="small"><T text="Newest published first"/></span></div>
 {filters.error?<div className="panel notice" role="alert">{filters.error}</div>:feed.data.length?<ArticleList items={feed.data}/>:<div className="panel empty-state"><h2>{feed.error?<T text="News is temporarily unavailable."/>:<T text="No reports match these filters."/>}</h2><p>{feed.error?<T text="Please try again later."/>:<T text="Try a wider time range or remove a company or sector filter."/>}</p><Link className="source" href="/news"><T text="View all news →"/></Link></div>}
 {feed.count>30&&<nav className="history-pagination" aria-label={ui("News pages")}>{filters.page>1&&<Link href={url(filters.page-1)}><T text="← Previous"/></Link>}<span><T text="Page "/>{filters.page}<T text=" of "/>{Math.max(1,Math.ceil(feed.count/30))}</span>{filters.page*30<feed.count&&<Link href={url(filters.page+1)}><T text="Next →"/></Link>}</nav>}
 </>;
}
