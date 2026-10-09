import test from 'node:test';import assert from 'node:assert/strict';
import {mergeSnapshot,quoteEvidence,currentMarket} from '../lib/market/live.mjs';
import {validDocumentUrl,documentPassages} from '../lib/news/documents.mjs';
import {normalizeFilingText} from '../lib/news/validation.mjs';
import {translate} from '../lib/i18n/translate.mjs';
const now=new Date('2026-10-08T22:00:00Z');const raw={latestTrade:{p:11,t:'2026-10-08T19:59:00Z'},dailyBar:{o:10,h:12,l:9,v:500,t:'2026-10-08T04:00:00Z'},prevDailyBar:{c:10}};
test('live refresh preserves completed daily history/features, validates last trade and labels volume time',()=>{
 const previous={bars:[{time:'2026-10-07',close:10}],features:{ma20:9},history_period_end:'2026-10-07'};const p=mergeSnapshot(raw,previous,now);assert.equal(p.price,11);assert.equal(p.change,1);assert.deepEqual(p.bars,previous.bars);assert.deepEqual(p.features,previous.features);assert.equal(p.volume_as_of,raw.dailyBar.t);assert.throws(()=>mergeSnapshot({...raw,latestTrade:{p:0,t:raw.latestTrade.t}},previous,now));assert.throws(()=>mergeSnapshot({...raw,latestTrade:{p:11,t:'2026-10-09'}},previous,now));
});
test('quote evidence is an observed IEX snapshot, not event reaction; identical quotes have stable replay inputs',()=>{
 const p=mergeSnapshot(raw,{},now),e=quoteEvidence('AAPL',p,now);assert.match(e.text,/IEX is one exchange/);assert.match(e.text,/not historical event-time evidence/);assert.match(e.text,/500 shares/);assert.match(e.text,/two decimal places/);const noisy=quoteEvidence('AAPL',{...p,change:5.519999999999982,change_percent:.5858877473040591},now);assert.match(noisy.text,/5.52 USD/);assert.match(noisy.text,/0.59 %/);assert.doesNotMatch(noisy.text,/999999/);assert.match(e.text,/2026-10-08T04:00/);assert.deepEqual(e,quoteEvidence('AAPL',{...p,retrieved_at:'2026-10-08T22:01:00Z'},new Date('2026-10-08T22:01:00Z')));assert.equal(quoteEvidence('AAPL',{...p,as_of:'2026-10-09'},now),null);
});
test('SEC retrieval accepts only fixed official document paths; passages keep verifiable offsets and bounded length',()=>{
 assert.ok(validDocumentUrl('https://www.sec.gov/Archives/edgar/data/909832/000090983226000093/cost-20260830.htm'));for(const bad of ['http://www.sec.gov/Archives/edgar/data/1/1/a.htm','https://evil.com/a.htm','https://www.sec.gov/Archives/edgar/data/1/1/../../a.htm','https://www.sec.gov/Archives/edgar/data/1/1/a.htm?key=x'])assert.equal(validDocumentUrl(bad),false);
 const full='Company intro. '.repeat(400)+'Risk factors. '.repeat(500)+'Financial statements. '.repeat(600);const doc={full_text:full,source_url:'https://www.sec.gov/Archives/edgar/data/1/1/a.htm',content_sha256:'a'.repeat(64),char_count:full.length};const passages=documentPassages(doc,'Financial statements',5000);assert.deepEqual(passages,documentPassages(doc,'Financial statements',5000));assert.ok(passages.reduce((n,e)=>n+e.text.length,0)<6500);assert.ok(passages.every(e=>e.url===doc.source_url&&e.text.includes(doc.content_sha256)&&e.text.includes('not the full document')));
});
test('global translations keep original source/user text, localize controls and respect language',()=>{
 assert.equal(translate('en','Save'),'Save');assert.equal(translate('zh-Hans','Save'),'收藏');assert.equal(translate('zh-Hans','AAPL'),'AAPL');assert.equal(translate('zh-Hans','My personal test note'),'My personal test note');assert.match(translate('zh-Hans','Add TSLA to watchlist'),/TSLA/);assert.equal(translate('zh-Hans','Market closed'),'美股常规时段已收盘');
});
test('shared market reads reuse a fresh cache without provider or write calls',async()=>{
 const admin={from(name){assert.equal(name,'market_refresh_state');return {select(){return this},eq(){return this},async maybeSingle(){return {data:{payload:{quotes:{AAPL:{price:11}},stale:false},expires_at:new Date(Date.now()+10000).toISOString()}}}}},rpc(){throw new Error('fresh cache must not claim a refresh')}};const result=await currentMarket(admin);assert.equal(result.quotes.AAPL.price,11);assert.equal(result.poll_ms,15000);
});

test('SEC normalization preserves decimal/hex encoded text and strips hidden scripts',()=>{assert.equal(normalizeFilingText('<p>Management&#x2019;s &#57;&#51;&#57; warehouses &amp; stores.</p><script>ignore()</script>'), 'Management’s 939 warehouses & stores.');});
