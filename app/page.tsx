import {getTranslator} from '@/lib/i18n/server';
import {T} from '@/components/language-provider';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {onboardingDestination} from '@/lib/onboarding';
import {companies} from '@/lib/news/data';
import {marketData} from '@/lib/market/data';
import {StockTable} from '@/components/market-display';
import {DailyAILearning} from '@/components/daily-ai-learning';
import {dailyLearning} from '@/lib/ai/daily-learning';
import {easternDay} from '@/lib/market/exploration.mjs';
import {concepts} from '@/lib/market/concepts.mjs';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{q?:string}>}){
 const {language,t:ui}=await getTranslator(),{q:raw=''}=await searchParams,q=raw.trim().slice(0,80),s=await createClient();
 const {data:{user}}=await s.auth.getUser(),signedIn=!!user&&!user.is_anonymous;
 if(signedIn){const {data:profile}=await s.from('profiles').select('display_name,first_name,last_name,onboarding_completed_at').eq('id',user!.id).single();if(!profile)throw new Error('Profile unavailable');const destination=onboardingDestination(profile);if(destination!=='/')redirect(destination);}
 const day=easternDay(new Date());
 const [directory,market,watch,daily]=await Promise.all([
  companies(),marketData(),signedIn?s.from('watchlist').select('ticker').eq('user_id',user!.id):Promise.resolve({data:[],error:null}),dailyLearning(signedIn?user!.id:undefined,day,language)
 ]);
 const watched=new Set((watch.data||[]).map(r=>r.ticker)),search=q.toLowerCase();
 const matches=directory.data.filter(c=>(c.ticker+' '+c.name+' '+c.sector+' '+ui(c.sector)).toLowerCase().includes(search));
 const terms=concepts.filter(c=>(c.key+' '+c.term+' '+c.definition+' '+ui(c.term)+' '+ui(c.definition)).toLowerCase().includes(search));
 return <>
  <section className="dashboard-heading"><div><span className="eyebrow"><T text="YOUR DAILY FINANCIAL VOCABULARY"/></span><h1><T text="Learn a little."/><span><T text=" Understand more."/></span></h1><p><T text="Five ideas a day. See them in real companies. Keep what you learn."/></p></div><Link className="text-link" href="/notebook"><T text="Open notebook →"/></Link></section>
  <form key={q} className="search-bar" action="/"><label htmlFor="learning-search"><T text="Find a financial term or company"/></label><div><input id="learning-search" aria-describedby="learning-search-scope" name="q" defaultValue={q} maxLength={80} placeholder={ui('EPS, cash flow, Apple…')}/><button className="button secondary"><T text="Search"/></button></div><p id="learning-search-scope" className="small"><T text="Search the learning library and companies on Clearstock. News search is on the News page."/></p></form>
  {q?<section className="content-section" aria-label={ui('Search results')}><div className="section-title"><h2><T text="Search results"/> · {q}</h2><Link className="source" href="/"><T text="Clear search"/></Link></div><h3><T text="Financial terms"/></h3>{terms.length?<div className="cards lesson-grid">{terms.map(c=><article className="panel lesson-card" key={c.key}><h3>{ui(c.term)}</h3><p>{ui(c.definition)}</p><Link className="source" href={'/learn/'+c.key}><T text="Read explanation →"/></Link></article>)}</div>:<p><T text="No matching terms in the learning library. Try EPS, cash flow or profit."/></p>}<h3 className="content-section"><T text="Companies"/></h3>{directory.error?<p><T text="Company directory is temporarily unavailable."/></p>:matches.length?<StockTable companies={matches} data={market.data} watched={watched} signedIn={signedIn} available={!watch.error}/>:<p><T text="No matching companies. Try a ticker or company name."/></p>}</section>:null}
  <div id="today"><DailyAILearning key={day+language} initial={daily.lessons} day={day} signedIn={signedIn} initialError={daily.error}/></div>
  <section className="content-section"><div className="section-title"><h2><T text="Your watchlist"/></h2><Link className="source" href="/stocks?view=watchlist"><T text="Manage in Stocks →"/></Link></div><p className="section-description"><T text="Choose a company, read its figures, and select an unfamiliar term for a simple explanation."/></p>{watch.error?<p><T text="Your watchlist is temporarily unavailable."/></p>:watched.size?<StockTable companies={directory.data.filter(c=>watched.has(c.ticker))} data={market.data} watched={watched} signedIn={signedIn}/>:<div className="panel empty-state"><h3><T text="Start with one company."/></h3><p><T text="Star a company in Stocks to bring it here. Use its reports to practise today's vocabulary."/></p><Link className="button secondary" href="/stocks"><T text="Explore stocks →"/></Link></div>}</section>
  {!q&&<details className="content-section learning-library"><summary><T text="Browse the financial vocabulary library"/></summary><div className="cards lesson-grid">{concepts.map(c=><article className="panel lesson-card" key={c.key} id={c.key}><span className="eyebrow"><T text="EDITORIAL EXPLANATION"/></span><h3>{ui(c.term)}</h3><p>{ui(c.definition)}</p><Link className="source" href={'/learn/'+c.key}><T text="Read explanation →"/></Link></article>)}</div></details>}
 </>;
}
