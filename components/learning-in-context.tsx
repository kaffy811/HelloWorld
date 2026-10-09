import Link from 'next/link';
import {T} from './language-provider';
import {companies} from '@/lib/news/data';
import {createClient} from '@/lib/supabase/server';
export async function LearningInContext({topicKey}:{topicKey:string}){
 const directory=await companies();if(!directory.data.length)return null;
 const s=await createClient(),{data:{user}}=await s.auth.getUser();
 const watch=user&&!user.is_anonymous?await s.from('watchlist').select('ticker').eq('user_id',user.id):{data:[]};
 const watched=new Set((watch.data||[]).map(r=>r.ticker));
 const selected=directory.data.filter(c=>watched.has(c.ticker));
 const examples=(selected.length?selected:directory.data).slice(0,3),overview=['stock','price-value','market-order','limit-order'].includes(topicKey);
 return <section className="panel learning-practice"><span className="eyebrow"><T text="TRY IT IN A REAL COMPANY"/></span><h2><T text="Put this idea in context"/></h2><p>{overview?<T text="Open a company overview. What does the company sell, and how is its share price different from the business itself?"/>:<T text="Open a company's financials. Find the reporting period, compare revenue with profit, and select any unfamiliar term for an explanation."/>}</p><div className="practice-links">{examples.map(c=><Link key={c.ticker} className="source" href={'/stocks/'+c.ticker+(overview?'':'/financials')}>{c.name} · {c.ticker} →</Link>)}</div></section>;
}
