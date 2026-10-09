import {createClient} from '@/lib/supabase/server';
import {mutationUser,errorResponse,HttpError} from '@/lib/news/api';
import {adminClient} from '@/lib/news/admin.mjs';
import {UUID} from '@/lib/news/validation.mjs';
import {filingDocument,validDocumentUrl} from '@/lib/news/documents.mjs';
import {currentMarket} from '@/lib/market/live.mjs';
export const maxDuration=60;
async function load(id:string,prepare=false){
 if(!UUID.test(id))throw new HttpError(400,'Invalid article.');const s=await createClient();
 const {data:a}=await s.from('analysis_versions').select('id,ticker,evidence,data_as_of').eq('id',id).maybeSingle();if(!a)throw new HttpError(404,'Article unavailable.');
 const admin=adminClient(),url=a.evidence.find((e:{url?:string})=>validDocumentUrl(e.url))?.url;let doc=null,documentError=false;
 try{if(url)doc=await filingDocument(admin,url,{fetchMissing:prepare});}catch{documentError=true;}
 let market=null;try{market=await currentMarket(admin);}catch{/* UI retains the saved snapshot. */}
 return Response.json({ticker:a.ticker,original_cutoff:a.data_as_of,market:market?.quotes?.[a.ticker]||null,market_stale:market?.stale??true,document:doc?{url:doc.source_url,char_count:doc.char_count,sha256:doc.content_sha256,retrieved_at:doc.retrieved_at}:null,document_error:documentError,source_url:url||null},{headers:{'Cache-Control':'private, no-store'}});
}
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{return await load((await params).id);}catch(e){return errorResponse(e);}}
export async function POST(r:Request,{params}:{params:Promise<{id:string}>}){try{await mutationUser(r);return await load((await params).id,true);}catch(e){return errorResponse(e);}}
