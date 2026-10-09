
import {T} from "@/components/language-provider";
import {notFound,redirect} from 'next/navigation';
import {loadProfile} from '@/lib/profile';
import {onboardingDestination} from '@/lib/onboarding';
import {UUID} from '@/lib/news/validation.mjs';
import {NoteEditor} from '@/components/note-editor';
import Link from 'next/link';
export default async function Note({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;const {supabase,user,profile}=await loadProfile('/notebook/notes/'+id);const destination=onboardingDestination(profile);if(destination!=='/')redirect(destination);
 if(id!=='new'&&!UUID.test(id))notFound();
 const {data,error}=id==='new'?{data:undefined,error:null}:await supabase.from('personal_notes').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(error)return <div className="panel notice"><T text="Your notes are temporarily unavailable."/></div>;
 if(id!=='new'&&!data)notFound();
 return <><section className="page-heading"><Link className="source" href="/notebook?kind=notes"><T text="← My notes"/></Link><h1>{id==='new'?<T text="A space for your own thinking."/>:<T text="Edit your note."/>}</h1><p><T text="Your observations and study notes stay private. They are your writing."/></p></section><NoteEditor note={data}/></>;
}
