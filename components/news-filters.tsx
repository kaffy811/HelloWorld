'use client';
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import {useState} from 'react';
import Link from 'next/link';
import {topics,sectors} from '@/lib/market/exploration.mjs';
type Filters={category:string;topic:string;sector:string;ticker:string;q:string;period:string;from:string;to:string};
export function NewsFilters({filters,companies}:{filters:Filters;companies:{ticker:string;name:string}[]}){
 const {t:ui}=useLanguage();
 const [period,setPeriod]=useState(filters.period);
 const allowed=filters.category==='policy'?['all','rates','regulation']:filters.category==='company'?['all','earnings','corporate','other']:filters.category==='industry'?['all','regulation','other']:['all',...topics.map(([k])=>k)];
 return <form action="/news" className="panel news-filter-panel"><input type="hidden" name="category" value={filters.category}/><div className="news-filter-grid">
 <label><T text="Topic"/><select name="topic" defaultValue={filters.topic}>{topics.filter(([key])=>allowed.includes(key)).map(([k,v])=><option key={k} value={k}>{ui(v)}</option>)}</select></label>
 <label><T text="Time range"/><select name="period" value={period} onChange={e=>setPeriod(e.target.value)}>{[['all','Any time'],['today','Today (New York)'],['7d','Past 7 days'],['30d','Past 30 days'],['custom','Custom dates']].map(([k,v])=><option key={k} value={k}>{ui(v)}</option>)}</select></label>
 <label><T text="Sector"/><select name="sector" defaultValue={filters.sector}>{sectors.map(([k,v])=><option key={k} value={k}>{ui(v)}</option>)}</select></label>
 <label><T text="Company"/><select name="ticker" defaultValue={filters.ticker}><option value=""><T text="All companies"/></option>{companies.map(c=><option value={c.ticker} key={c.ticker}>{c.ticker} · {c.name}</option>)}</select></label>
 {period==='custom'&&<><label><T text="From (New York)"/><input name="from" type="date" defaultValue={filters.from}/></label><label><T text="Through (New York)"/><input name="to" type="date" defaultValue={filters.to}/></label></>}
 </div><div className="news-filter-bottom"><label><T text="Headline keyword"/><input name="q" defaultValue={filters.q} maxLength={80} placeholder={ui("Inflation, regulation, earnings…")}/></label><button className="button"><T text="Apply filters"/></button><Link className="source" href="/news"><T text="Clear filters"/></Link></div></form>;
}
