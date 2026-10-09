import {getTranslator} from '@/lib/i18n/server';
import {T} from '@/components/language-provider';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {companies} from '@/lib/news/data';
import {marketData} from '@/lib/market/data';
import {StockTable} from '@/components/market-display';
export default async function Stocks({searchParams}:{searchParams:Promise<{q?:string;sector?:string;view?:string}>}){
 const {t:ui}=await getTranslator(),query=await searchParams,q=(query.q||'').trim().slice(0,80),view=query.view==='watchlist'?'watchlist':'all',s=await createClient();
 const {data:{user}}=await s.auth.getUser(),signedIn=!!user&&!user.is_anonymous;
 const [directory,market,watch]=await Promise.all([companies(),marketData(),signedIn?s.from('watchlist').select('ticker').eq('user_id',user!.id):Promise.resolve({data:[],error:null})]);
 const sectors=[...new Set(directory.data.map(c=>c.sector))].sort(),sector=sectors.includes(query.sector||'')?query.sector!:'all',watched=new Set((watch.data||[]).map(r=>r.ticker));
 const results=directory.data.filter(c=>(view==='all'||watched.has(c.ticker))&&(sector==='all'||c.sector===sector)&&(c.ticker+' '+c.name).toLowerCase().includes(q.toLowerCase()));
 return <><section className="page-heading"><span className="eyebrow"><T text="LEARN THROUGH REAL COMPANIES"/></span><h1><T text="Stocks"/></h1><p><T text="Explore six US companies. Star the ones you want to learn from."/></p></section>
 <form key={view+sector+q} className="panel stock-directory-filters" action="/stocks"><div className="stock-filter-grid"><label htmlFor="stock-query"><T text="Company or ticker"/><input id="stock-query" name="q" defaultValue={q} placeholder={ui('Apple or AAPL')} maxLength={80}/></label><label htmlFor="stock-sector"><T text="Industry"/><select id="stock-sector" name="sector" defaultValue={sector}><option value="all">{ui('All industries')}</option>{sectors.map(k=><option key={k} value={k}>{ui(k)}</option>)}</select></label><label htmlFor="stock-view"><T text="Show"/><select id="stock-view" name="view" defaultValue={view}><option value="all">{ui('All stocks')}</option><option value="watchlist">{ui('My watchlist')}</option></select></label></div><div className="stock-filter-actions"><button className="button secondary"><T text="Apply filters"/></button><Link className="source" href="/stocks"><T text="Reset"/></Link><span className="small">{ui(results.length===1?'{count} company':'{count} companies',{count:results.length})}</span></div></form>
 {directory.error?<div className="panel notice"><T text="Company directory is temporarily unavailable."/></div>:view==='watchlist'&&!signedIn?<div className="panel empty-state"><h2><T text="Your watchlist"/></h2><p><T text="Sign in to follow companies and see them on Today."/></p><Link className="button" href="/login?next=%2Fstocks%3Fview%3Dwatchlist"><T text="Sign in"/></Link></div>:view==='watchlist'&&watch.error?<p><T text="Your watchlist is temporarily unavailable."/></p>:results.length?<StockTable companies={results} data={market.data} watched={watched} signedIn={signedIn} available={!watch.error}/>:<div className="panel empty-state"><h2><T text="No companies match these filters."/></h2><p><T text="Try another industry or show all stocks. Tap a star to add a company to your watchlist."/></p><Link className="source" href="/stocks"><T text="Show all stocks →"/></Link></div>}
 </>;
}
