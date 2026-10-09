'use client';
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export function NewsRefresh({signedIn}:{signedIn:boolean}){
 const {t:ui}=useLanguage();const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');return <div className="news-refresh"><div className="reader-actions">{signedIn?<button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/news/refresh',{method:'POST'}),d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message);router.refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>{busy?<T text="Checking official sources…"/>:<T text="↻ Update news"/>}</button>:<Link className="source" href="/login?next=%2Fnews"><T text="Sign in to update news ↗"/></Link>}<details><summary><T text="Other ways to update"/></summary><p className="small"><T text="In the project folder, run "/><code><T text="npm run sync:data -- --news-only"/></code><T text=", then refresh this page. For quotes and financials too, run "/><code><T text="npm run sync:data"/></code><T text=". News updates do not call AI."/></p></details></div><p className="small"><T text="One shared news refresh per 10 minutes. Automatic scheduled updates are not enabled yet."/></p>{message&&<p className="small notice" role="status">{ui(message)}</p>}</div>;}
