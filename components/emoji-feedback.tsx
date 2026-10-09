'use client';
import {useLanguage} from "@/components/language-provider";

import {T} from "@/components/language-provider";

import {useId,useState} from 'react';
import Link from 'next/link';
const levels=[[1,'😕','Not useful'],[2,'🤔','Still unclear'],[3,'🙂','Somewhat useful'],[4,'💡','Useful'],[5,'🤩','Very useful']] as const;
export function EmojiFeedback({analysisId,concept,initial=null,signedIn,returnPath,editorial=false}:{analysisId?:string;concept?:string;initial?:number|null;signedIn:boolean;returnPath:string;editorial?:boolean}){
 const {t:ui}=useLanguage();
 const [value,setValue]=useState<number|null>(initial),[pick,setPick]=useState<number|null>(initial),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const id=useId();
 return <section className="panel feedback five-level-feedback"><span className="eyebrow">{editorial?<T text="RATE THIS LEARNING EXPLANATION"/>:<T text="RATE THIS AI EXPLANATION"/>}</span><h2><T text="How much did this help?"/></h2><p><T text="Rate your understanding from 1 to 5. You can update your rating."/></p>{!signedIn?<Link className="button" href={'/login?next='+encodeURIComponent(returnPath)}><T text="Sign in to rate"/></Link>:<><div className="emoji-scale" role="group" aria-label={ui("Explanation usefulness rating")}>{levels.map(([score,emoji,label])=><button key={score} type="button" disabled={busy} className={pick===score?'selected':''} aria-pressed={pick===score} aria-label={`${score}/5 — ${ui(label)}`} onClick={()=>{setPick(score);setError('');}}><span aria-hidden="true">{emoji}</span><strong>{score}</strong><small>{ui(label)}</small></button>)}</div>
 {pick!=null&&<div className="feedback-submit">{pick<=2&&<label htmlFor={id}><T text="What could be clearer? "/><span className="small"><T text="Optional"/></span><select id={id} value={reason} onChange={e=>setReason(e.target.value)}><option value=""><T text="No reason selected"/></option>{[['jargon','Too much jargon'],['too_long','Too long'],['connection','Company connection unclear'],['unanswered','Question not answered'],['factual_error','Possible factual error']].map(([k,v])=><option key={k} value={k}>{ui(v)}</option>)}</select></label>}<button className="button" disabled={busy||value===pick} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis_id:analysisId,concept,score:pick,reason:pick<=2?reason||null:null})});const data=await r.json();if(!r.ok)throw new Error(data.error);setValue(pick);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?<T text="Saving…"/>:value==null?<T text="Save rating"/>:<T text="Update rating"/>}</button></div>}
 </>}<p className="small" role="status">{value!=null?ui("Rating saved: {score}/5. You can change it.",{score:value}):''}</p>{error&&<p role="alert">{ui(error)}</p>}</section>;
}
