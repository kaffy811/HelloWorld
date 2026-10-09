import test from 'node:test';import assert from 'node:assert/strict';
import {minuteBars,chartSessions,aggregateBars,normalizeNewsFilters,validateNote} from '../lib/market/exploration.mjs';
import {suggestedConcepts} from '../lib/market/learning-path.mjs';
const raw=(t,o=10,c=11)=>({t,o,h:12,l:9,c,v:100});
test('intraday data rejects future/invalid OHLC and after-hours; preserves individual minutes',()=>{
 const rows=minuteBars([raw('2026-10-08T13:30:00Z'),raw('2026-10-08T13:31:00Z'),raw('2026-10-08T12:00:00Z'),raw('2026-10-08T20:00:00Z'),raw('2026-10-09T13:30:00Z'),raw('2026-10-08T13:32:00Z',13)],new Date('2026-10-08T18:00:00Z'));assert.equal(rows.length,2);assert.equal(rows[1].time,'2026-10-08T13:31:00Z');
});
test('5D means last five actual sessions, rather than five calendar days',()=>{
 const bars=minuteBars(['01','02','05','06','07','08'].map(d=>raw(`2026-10-${d}T14:00:00Z`)),new Date('2026-10-08T19:00:00Z'));assert.equal(chartSessions(bars,'5d').length,5);assert.equal(chartSessions(bars,'live')[0].time,'2026-10-08T14:00:00Z');
});
test('weekly OHLC uses first open, highest high, lowest low, last close and summed volume',()=>{
 const bars=minuteBars([raw('2026-10-05T14:00:00Z',10,11),raw('2026-10-06T14:00:00Z',11,10)],new Date('2026-10-08T19:00:00Z'));const [bar]=aggregateBars(bars,'weekly');assert.equal(bar.open,10);assert.equal(bar.close,10);assert.equal(bar.high,12);assert.equal(bar.low,9);assert.equal(bar.volume,200);
});
test('today and inclusive custom dates respect New York DST',()=>{
 const summer=normalizeNewsFilters({period:'today'},new Date('2026-10-08T17:00:00Z'));assert.equal(summer.start,'2026-10-08T04:00:00.000Z');const winter=normalizeNewsFilters({period:'custom',from:'2026-12-01',to:'2026-12-02'});assert.equal(winter.start,'2026-12-01T05:00:00.000Z');assert.equal(winter.end,'2026-12-03T05:00:00.000Z');
});
test('invalid dates, reversed ranges, unsupported symbols and wildcard input cannot widen a query',()=>{
 assert.ok(normalizeNewsFilters({period:'custom',from:'2026-99-01'}).error);assert.ok(normalizeNewsFilters({period:'custom',from:'2026-02-31'}).error);assert.ok(normalizeNewsFilters({period:'custom',from:'2026-10-09',to:'2026-10-08'}).error);assert.equal(normalizeNewsFilters({ticker:'UNKNOWN',q:'%_%',page:'-1'}).q,'');assert.equal(normalizeNewsFilters({ticker:'UNKNOWN'}).ticker,'');assert.equal(normalizeNewsFilters({ticker:'TSLA'}).ticker,'TSLA');
});
test('daily library suggestions exclude saved concepts and related known terms',()=>{
 const now=new Date('2026-10-08T18:00:00Z'),saved=[{source_key:'concept:revenue-profit',text:'Revenue and profit'},{source_key:'analysis:term:0',text:'Diluted EPS'}],suggestions=suggestedConcepts(saved,now);assert.ok(suggestions.every(c=>!['eps','revenue-profit'].includes(c.key)));assert.ok(suggestions.some(c=>c.related));assert.deepEqual(suggestions,suggestedConcepts(saved,now));
});
test('private notes bound title/body and discard client-supplied owner or provenance',()=>{
 assert.deepEqual(validateNote({title:' My note ',body:' My own thoughts ',user_id:'forged'}),{title:'My note',body:'My own thoughts'});assert.throws(()=>validateNote({title:'a',body:'x'.repeat(12001)}));assert.throws(()=>validateNote(null));
});
