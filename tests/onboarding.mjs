import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function load(file) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}
const pref = load('lib/learning-preferences.ts');
const flow = load('lib/onboarding.ts');
assert.equal(pref.languages.length, 10);
assert.equal(pref.confidenceLabels.length, 4);
const empty = {...pref.emptyPreferences};
assert.equal(Object.keys(pref.validatePreferences({...empty, id:'not-allowed'})).length, 6);
assert.equal(pref.validatePreferences({...empty, native_language_code:'zh-Hant-HK', english_confidence:4, learning_goals:['news','news']}).learning_goals.length, 1);
for (const value of [0,5,1.2]) assert.throws(()=>pref.validatePreferences({...empty,english_confidence:value}));
assert.throws(()=>pref.validatePreferences({...empty,native_language_code:'invalid'}));
assert.throws(()=>pref.validatePreferences({...empty,learning_goals:['trading']}));
assert.equal(pref.validatePreferences(empty).english_confidence, null);
const p={display_name:null,first_name:null,last_name:null,onboarding_completed_at:null};
assert.equal(flow.onboardingDestination(p),'/onboarding');
Object.assign(p,{display_name:'Test',first_name:'Test',last_name:'Learner'});
assert.equal(flow.onboardingDestination(p),'/onboarding/preferences');
p.onboarding_completed_at='2026-09-29';assert.equal(flow.onboardingDestination(p),'/');
p.display_name=' ';assert.equal(flow.onboardingDestination(p),'/onboarding');
console.log('PASS: language options, levels, payload allowlist, optional fields, invalid choices, goal deduplication and first/resumed/completed routes.');
