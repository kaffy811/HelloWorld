import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackInput} from '../lib/product-feedback.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('product suggestions trim text, ignore supplied identity and keep an idempotent ID',()=>{assert.deepEqual(feedbackInput({id,body:'  Make the saved destination clearer.  ',preference:'examples',owner_id:'forged'}),{id,body:'Make the saved destination clearer.',preference:'examples'});});
test('malformed or oversized feedback and unknown preferences are rejected',()=>{for(const input of [null,[],{id,body:'a'},{id,body:'x'.repeat(2001)},{id:'bad',body:'hello'},{id,body:'hello',preference:'arbitrary instructions'}])assert.throws(()=>feedbackInput(input));});
