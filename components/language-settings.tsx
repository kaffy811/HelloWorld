'use client';
import {useState} from 'react';
import {useLanguage} from './language-provider';
export function LanguageSettings(){
 const {language,t}=useLanguage();
 const [value,setValue]=useState(language),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form onSubmit={async e=>{
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await fetch('/api/settings/language',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:value})});
   const data=await r.json();if(!r.ok)throw new Error(data.error);window.location.reload();
  }catch(e){setError((e as Error).message);setBusy(false);}
 }}>
 <label htmlFor="system-language">{t('System language')}</label>
 <select id="system-language" value={value} onChange={e=>setValue(e.target.value as typeof language)} disabled={busy}>
 <option value="en">English</option><option value="zh-Hans">简体中文</option></select>
 <p className="small">{t('Use one language throughout Clearstock and new AI answers.')}</p>
 <button className="button" disabled={busy}>{t(busy?'Saving…':'Save language')}</button>
 {error&&<p role="alert">{t(error)}</p>}</form>;
}
