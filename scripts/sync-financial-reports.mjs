import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {adminClient} from '../lib/news/admin.mjs';
import {financialPeriods,reportFinancialPeriods} from '../lib/market/processing.mjs';
try{loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw e;}
if(!process.env.SEC_USER_AGENT?.includes('@'))throw Error('Set SEC_USER_AGENT with a contact email');
const admin=adminClient(),now=new Date();
const {data:companies,error}=await admin.from('companies').select('ticker,cik').eq('market','US').order('ticker');
if(error)throw Error('Company directory is unavailable');
let ready=0,failed=0;
for(const company of companies){
 try{
  const {data:stored,error:readError}=await admin.from('stock_data').select('payload').eq('ticker',company.ticker).eq('kind','filings').single();
  if(readError)throw Error('Stored filings unavailable');
  const response=await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`,{headers:{'User-Agent':process.env.SEC_USER_AGENT},redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('SEC returned HTTP '+response.status);
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>16000000)throw Error('Source exceeds size limit');chunks.push(chunk);}
  const raw=JSON.parse(Buffer.concat(chunks).toString('utf8')),periods=financialPeriods(raw,company.cik,now),report_periods=reportFinancialPeriods(raw,company.cik,stored.payload.filings||[],now);
  if(!periods.length||!report_periods.length)throw Error('No report-specific facts available');
  const {error:saveError}=await admin.from('stock_data').upsert({ticker:company.ticker,kind:'financials',source:'SEC',as_of:now.toISOString(),updated_at:now.toISOString(),payload:{periods,report_periods,evidence_hash:createHash('sha256').update(JSON.stringify(periods)).digest('hex'),schema_version:1,quality:{missing_values:'null',quarter_derived:false}}},{onConflict:'ticker,kind'});
  if(saveError)throw Error('Financial cache update failed');
  console.log(company.ticker+': '+report_periods.length+' report-specific periods');ready++;
 }catch(e){console.log(company.ticker+': '+e.message);failed++;}
 await new Promise(resolve=>setTimeout(resolve,600));
}
console.log(JSON.stringify({ready,failed}));if(failed)process.exitCode=1;
