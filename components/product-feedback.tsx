'use client';
import {useState,useRef} from 'react';
import Link from 'next/link';
import {useLanguage} from './language-provider';
export function ProductFeedback({signedIn}:{signedIn:boolean}){
 const {t}=useLanguage(),id=useRef('');
 const [body,setBody]=useState(''),[preference,setPreference]=useState(''),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false),[error,setError]=useState('');
 if(submitted)return <section className="panel feedback-confirmation" role="status"><span className="eyebrow">{t('FEEDBACK SUBMITTED')}</span><h2>{t('Thank you for your feedback!')}</h2><p>{t('Your suggestion has been submitted to the developer. We’ll keep improving Clearstock.')}</p><Link className="button" href="/">{t('Back to home')}</Link></section>;
 return <section className="panel"><h2>{t('Help us make Clearstock better.')}</h2><p className="small">{t('Share a suggestion or tell us what felt clear or confusing. This goes to the developer; use Rate on AI answers to rate their usefulness.')}</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');if(!id.current)id.current=crypto.randomUUID();try{const r=await fetch('/api/product-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.current,body,preference:preference||null})}),d=await r.json();if(!r.ok)throw new Error(d.error);setSubmitted(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <label htmlFor="product-suggestion">{t('Your feedback')}<textarea id="product-suggestion" rows={6} minLength={5} maxLength={2000} required value={body} disabled={busy||!signedIn} placeholder={t('What could we improve? What would you like to see next?')} onChange={e=>setBody(e.target.value)}/></label>
 <label htmlFor="feedback-preference">{t('For future articles')}<select id="feedback-preference" value={preference} disabled={busy||!signedIn} onChange={e=>setPreference(e.target.value)}><option value="">{t('No preference')}</option>{[['simpler','Keep it simpler'],['examples','More everyday examples'],['deeper','Go a little deeper'],['related','Connect related ideas']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label>
 <p className="small">{t('Your feedback is private. Please do not include passwords, account numbers or other sensitive information.')}</p>
 {signedIn?<button className="button" disabled={busy||body.trim().length<5}>{t(busy?'Submitting…':'Submit')}</button>:<Link className="button" href="/login?next=%2Ffeedback">{t('Sign in to submit feedback')}</Link>}
 {error&&<p className="notice" role="alert">{t(error)}</p>}</form></section>;
}
