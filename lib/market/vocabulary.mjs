import {glossaryEntry,glossaryText} from './glossary.mjs';
import {topics,normalText} from '../ai/topics.mjs';
import {translate} from '../i18n/translate.mjs';
export function vocabularyQuery(value){const text=typeof value==='string'?normalText(value):'';if(!text||text.length>160)throw new Error('Enter a financial word or sentence of up to 160 characters.');return text;}
export function lookupVocabulary(value,language='en'){
 const text=vocabularyQuery(value),alias={eps:'Diluted EPS',capex:'Capital expenditure','p&l':'Income statement','operating profit':'Operating income','cash flow statement':'Cash flow'},entry=glossaryEntry(alias[text.toLowerCase()]||text);
 if(entry){const g=glossaryText(entry,language);return {...g,selection:{glossary:entry.key},source_key:'glossary:'+entry.key+':'+language};}
 const topic=topics.find(t=>[t.term,t.key,translate('zh-Hans',t.term)].some(label=>normalText(label).toLowerCase()===text.toLowerCase()));if(!topic)return null;
 const definition=translate(language,topic.definition);if(language==='zh-Hans'&&definition===topic.definition)return null;
 return {term:translate(language,topic.term),definition,selection:{topic:topic.key},source_key:'topic:'+topic.key+':'+language};
}

export function bookmarkedVocabularyText(input,entry,language){if(input===undefined)return entry.term;const text=vocabularyQuery(input),found=lookupVocabulary(text,language);if(!found||found.source_key!==entry.source_key)throw new Error('Choose the matching glossary word or sentence.');return text;}
