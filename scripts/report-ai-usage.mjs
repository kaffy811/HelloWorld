import {loadEnvFile} from 'node:process';
import {adminClient} from '../lib/news/admin.mjs';
import {aiLimits} from '../lib/ai/billing.mjs';
try{loadEnvFile('.env.local');}catch(e){if(e.code!=='ENOENT')throw new Error('Cannot read local configuration.');}
const admin=adminClient(),limits=aiLimits(),days=new Map();let offset=0;
for(;;){
 const {data,error}=await admin.from('ai_usage_ledger').select('created_at,model,state,input_tokens,cached_tokens,output_tokens,thinking_tokens,estimated_cost_usd,reserved_cost_usd').order('created_at').order('run_id').range(offset,offset+999);
 if(error)throw new Error('Unable to read AI metering. Check server credentials and migration 007.');
 for(const row of data){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.created_at));const value=days.get(day)||{day,requests:0,input_tokens:0,output_tokens:0,thinking_tokens:0,estimated_usd:0,held_usd:0,unknown_requests:0};value.requests++;value.input_tokens+=Number(row.input_tokens||0);value.output_tokens+=Number(row.output_tokens||0);value.thinking_tokens+=Number(row.thinking_tokens||0);if(row.estimated_cost_usd!==null)value.estimated_usd+=Number(row.estimated_cost_usd);else{value.held_usd+=Number(row.reserved_cost_usd);value.unknown_requests++;}days.set(day,value);}
 if(data.length<1000)break;offset+=1000;
}
const rows=[...days.values()],sum=(key)=>rows.reduce((n,r)=>n+r[key],0);
console.log(JSON.stringify({notice:'USD estimate, not a Google invoice. Unknown or interrupted requests retain their conservative budget hold. No prompts, user IDs, images or API keys are included.',reset_timezone:'America/Los_Angeles',limits,cumulative_estimated_usd:sum('estimated_usd'),cumulative_held_usd:sum('held_usd'),days:rows},null,2));
