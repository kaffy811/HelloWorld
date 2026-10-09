import type {SupabaseClient} from '@supabase/supabase-js';
import {findFiling} from './reading.mjs';
export async function storedFiling(s:SupabaseClient,ticker:string,accession:string){
 const {data,error}=await s.from('stock_data').select('ticker,kind,payload').eq('ticker',ticker).in('kind',['filings','financials']);
 if(error)throw new Error('Financial reports are temporarily unavailable.');
 return findFiling(data||[],ticker,accession);
}
