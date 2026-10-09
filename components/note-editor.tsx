'use client';
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import {ImagePicker} from './image-picker';
import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export type PersonalNote={id:string;title:string;body:string;version:number;created_at:string;updated_at:string;archived_at:string|null;image_ids?:string[]};
export function NoteEditor({note}:{note?:PersonalNote}) {
 const {t:ui}=useLanguage();
 const router=useRouter(),[id,setId]=useState(note?.id||''),[version,setVersion]=useState(note?.version||1),[title,setTitle]=useState(note?.title||''),[body,setBody]=useState(note?.body||''),[images,setImages]=useState<string[]>(note?.image_ids||[]),[uploading,setUploading]=useState(false),[saved,setSaved]=useState({title:note?.title||'',body:note?.body||'',images:note?.image_ids||[]}),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const dirty=title!==saved.title||body!==saved.body||JSON.stringify(images)!==JSON.stringify(saved.images);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 return <form className="panel note-editor" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{
  const response=await fetch('/api/notes',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version,title,body,image_ids:images})});const data=await response.json();if(!response.ok)throw new Error(data.error);setId(data.id);setVersion(data.version);setSaved({title,body,images});setStatus('Saved privately to My notes.');if(!id)router.replace('/notebook/notes/'+data.id);router.refresh();
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <label htmlFor="note-title"><T text="Title"/><input id="note-title" value={title} onChange={e=>{setTitle(e.target.value);setStatus('');}} maxLength={160} required placeholder={ui("What I learned about earnings")}/></label>
 <label htmlFor="note-body"><T text="Your notes"/><textarea id="note-body" rows={16} value={body} onChange={e=>{setBody(e.target.value);setStatus('');}} maxLength={12000} required placeholder={ui("Write your observations, questions and ideas. This is your own writing, saved privately.")}/></label>
 <ImagePicker ids={images} onChange={setImages} disabled={busy} onBusy={setUploading}/><p className="small">{body.length.toLocaleString()}<T text=" / 12,000 characters · "/>{dirty?<T text="Unsaved changes"/>:<T text="No unsaved changes"/>}</p>
 <div className="note-actions"><button className="button" disabled={busy||uploading||(!dirty&&!!id)}>{busy?<T text="Saving…"/>:<T text="Save note"/>}</button>{id&&<a className="source" href={'/api/notes?id='+id}><T text="Download .md"/></a>}<Link className="source" href="/notebook?kind=notes"><T text="Back to My notes →"/></Link></div>
 {status&&<p role="status">{ui(status)}</p>}{error&&<p role="alert" className="notice preference-note">{ui(error)}</p>}
 </form>;
}
