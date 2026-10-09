import test from 'node:test';
import assert from 'node:assert/strict';
import {aiEnabled,aiLimits,aiPrices,reservationCost,usageCost} from '../lib/ai/billing.mjs';
import {assertSameOrigin} from '../lib/news/validation.mjs';
test('production writes allow the exact deployment host but reject arbitrary previews and mismatched hosts',()=>{
 const prior={APP_ORIGIN:process.env.APP_ORIGIN,VERCEL_URL:process.env.VERCEL_URL,VERCEL_BRANCH_URL:process.env.VERCEL_BRANCH_URL};
 Object.assign(process.env,{APP_ORIGIN:'https://clearstock.example',VERCEL_URL:'clearstock-fixture.vercel.app',VERCEL_BRANCH_URL:'clearstock-main.vercel.app'});
 const req=(origin,host=new URL(origin).host)=>new Request('http://localhost/api/ai/chat',{headers:{origin,host,'x-forwarded-proto':'https'}});
 try{assert.doesNotThrow(()=>assertSameOrigin(req('https://clearstock.example')));assert.doesNotThrow(()=>assertSameOrigin(req('https://clearstock-fixture.vercel.app')));assert.throws(()=>assertSameOrigin(req('https://untrusted.vercel.app')));assert.throws(()=>assertSameOrigin(req('https://clearstock.example','other.example')));}finally{for(const [k,v] of Object.entries(prior))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('separate global and personal quotas accept more than twenty and reject malformed limits',()=>{
 assert.equal(aiEnabled({AI_ENABLED:'false',AI_FREE_TIER_ENABLED:'true'}),false);
 assert.equal(aiEnabled({AI_ENABLED:'true'}),true);
 assert.deepEqual(aiLimits({AI_DAILY_LIMIT:'500',AI_USER_DAILY_LIMIT:'60',AI_DAILY_BUDGET_USD:'0',AI_TOTAL_BUDGET_USD:'4.5'}),{daily:500,userDaily:60,minute:5,dailyBudget:0,totalBudget:4.5});
 for(const env of [{AI_DAILY_LIMIT:'NaN'},{AI_USER_DAILY_LIMIT:'1.5'},{AI_REQUESTS_PER_MINUTE:'0'},{AI_DAILY_BUDGET_USD:'-1'}])assert.throws(()=>aiLimits(env));
});
test('model changes cannot silently inherit another model price or claim free provider billing',()=>{
 assert.throws(()=>aiPrices('unknown-model',{}));
 assert.equal(aiPrices('gemini-3.5-flash-lite',{}).input_per_million,0.30);
 assert.equal(aiPrices('any',{AI_BILLING_MODE:'free'}).output_per_million,0);
});
test('cost counts cache discounts and thinking tokens; missing usage never becomes a fabricated zero',()=>{
 const prices=aiPrices('gemini-3.5-flash-lite',{});
 assert.equal(usageCost({promptTokenCount:1000,candidatesTokenCount:300},prices).estimated_cost_usd,0.00105);
 assert.equal(usageCost({promptTokenCount:1000,cachedContentTokenCount:500,candidatesTokenCount:300,thoughtsTokenCount:100,totalTokenCount:1400},prices).estimated_cost_usd,0.001165);
 assert.equal(usageCost({promptTokenCount:1000,candidatesTokenCount:300,totalTokenCount:1500},prices).thinking_tokens,200);
 assert.equal(usageCost({totalTokenCount:500},prices),null);
 assert.equal(usageCost({promptTokenCount:1,cachedContentTokenCount:2,candidatesTokenCount:1},prices),null);
 const prompt={system:'x',user:'y',generation_config:{maxOutputTokens:300}};
 assert.ok(reservationCost(prompt,prices,1)>reservationCost(prompt,prices));
});
