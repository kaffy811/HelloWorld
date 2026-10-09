'use client';
import {T} from "@/components/language-provider";

import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {useLanguage} from './language-provider';
import {money,change} from '@/lib/market/format';
import {easternDate} from '@/lib/date';
import type {Price} from '@/lib/market/types';
type Snapshot={quotes?:Record<string,Price>;session?:{is_open:boolean;next_open:string;next_close:string}|null;checked_at?:string;stale?:boolean};
const MarketContext=createContext<{snapshot:Snapshot;subscribe:()=>()=>void}>({snapshot:{},subscribe:()=>()=>{}});
export function LiveMarketProvider({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<Snapshot>({}),[listeners,setListeners]=useState(0);
 const hasListeners=listeners>0;
 const subscribe=useCallback(()=>{setListeners(n=>n+1);return()=>setListeners(n=>Math.max(0,n-1));},[]);
 useEffect(()=>{if(!hasListeners)return;let busy=false,active=true;const controller=new AbortController();
  async function refresh(){if(busy||document.hidden)return;busy=true;try{const r=await fetch('/api/market/quotes',{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error();const d=await r.json();if(active)setSnapshot(d);}catch{if(active)setSnapshot(s=>({...s,stale:true}));}finally{busy=false;}}
  void refresh();const timer=setInterval(()=>void refresh(),15000),onVisible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[hasListeners]);
 return <MarketContext.Provider value={{snapshot,subscribe}}>{children}</MarketContext.Provider>;
}
export function useMarketPrice(ticker:string,initial?:Price){const {snapshot,subscribe}=useContext(MarketContext);useEffect(()=>subscribe(),[subscribe]);const quote=snapshot.quotes?.[ticker];return quote?{...initial,...quote,bars:initial?.bars||[],features:initial?.features||{ma20:null,return_5d:null,return_20d:null,volume_ratio20:null}}:initial;}
export function LiveMarketStatus(){const {snapshot,subscribe}=useContext(MarketContext),{t,language}=useLanguage();useEffect(()=>subscribe(),[subscribe]);return <p className="small live-market-status"><span className={'market-dot '+(snapshot.stale?'muted':'')}/>{t('Live IEX · refreshes every 15 seconds')} · {t(snapshot.session?snapshot.session.is_open?'Market open':'Market closed':'Market session unavailable')}{snapshot.checked_at&&<> · {t('Checked')} {easternDate(snapshot.checked_at,language)}</>}{snapshot.stale&&<> · {t('Previous snapshot retained')}</>}<span>{t('IEX single exchange; not the whole US market.')}</span></p>;}
export function LiveQuote({ticker,initial}:{ticker:string;initial?:Price}){const p=useMarketPrice(ticker,initial),{t,language}=useLanguage();return <><div className="quote-line"><strong>{money(p?.price)}</strong><span className={(p?.change??0)<0?'negative':'positive'}>{change(p?.change)} {p?.change_percent!=null?'('+change(p.change_percent)+'%)':''}</span></div><p className="small"><T text="Alpaca IEX · USD · "/>{t('Last trade')} {p?easternDate(p.as_of,language):'—'}</p><LiveMarketStatus/></>;}
export function LiveStockMetrics({ticker,initial}:{ticker:string;initial?:Price}){const p=useMarketPrice(ticker,initial),{t}=useLanguage();return <dl className="metric-grid">{[['Open',money(p?.open)],['High',money(p?.high)],['Low',money(p?.low)],['IEX volume',p?.volume?.toLocaleString('en-US')||'—'],['Previous IEX close',money(p?.previous_close)],['20-session average',money(p?.features.ma20)]].map(([label,value])=><div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>;}
