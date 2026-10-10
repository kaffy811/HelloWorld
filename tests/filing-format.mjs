import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFragment} from 'parse5';
import {formatFiling,formattedPage,filingReadingText,FILING_READING_VERSION} from '../lib/news/filing-format.mjs';
import {selectedInSource} from '../lib/ai/prompt.mjs';

test('SEC HTML keeps report headings, inline XBRL values and complete financial tables',()=>{
 const result=formatFiling('<div style="display:none"><ix:header>Hidden metadata</ix:header></div><div style="text-align:center"><span style="font-weight:700;font-size:20pt">CONSOLIDATED STATEMENTS OF OPERATIONS</span></div><p>Fiscal <strong>2025</strong> results.</p><table onclick="evil()"><tr><th colspan="2">Net sales</th><th>2025</th></tr><tr><td>Products</td><td> </td><td style="text-align:right"><ix:nonfraction>307,003</ix:nonfraction></td></tr></table>',30);
 assert.equal(result.pages.length,3);
 assert.match(result.pages[0].html,/<h2 class="filing-center">/);
 assert.match(result.pages[2].html,/<table><tbody><tr><th colspan="2">Net sales/);
 assert.match(result.pages[2].html,/<td><\/td><td class="filing-right">307,003/);
 assert.equal(result.pages[2].text,'Net sales 2025 Products 307,003');
 assert.doesNotMatch(JSON.stringify(result),/Hidden metadata|onclick/);
 assert.equal(selectedInSource('Net sales',{read_text:result.pages[2].text}),'Net sales');
});

test('malicious and malformed source markup cannot create active HTML, styles, links or arbitrary attributes',()=>{
 const attacks=['<p onclick="evil()" style="background:url(https://evil.test)">Safe &lt;script&gt;</p><script>bad()</script><iframe src="https://evil.test">frame</iframe>', '<svg><foreignObject><p onload="evil()">Bad</p></foreignObject></svg><p>Visible</p>', '<table><tr><td rowspan="2" colspan="999" onmouseover="evil()">123</td></tr></table><a href="javascript:evil()">Read</a>', '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=evil()>Text<p>After</p>', '<form><input name=x><p>Form</p></form><p aria-hidden="true">Private</p><p hidden>Hidden</p><p style="visibility:hidden">Invisible</p><p>Public</p>'];
 const tags=new Set(['div','p','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','caption','ul','ol','li','blockquote','strong','b','em','i','u','sup','sub','br','hr']);
 for(const html of attacks){let result;try{result=formatFiling(html+'<p>Visible ending</p>');}catch(error){assert.match(error.message,/Filing exceeds formatted processing limit/);continue;}const safe=result.pages.map(p=>p.html).join('');
  function inspect(n){if(n.tagName){assert.ok(tags.has(n.tagName),n.tagName);for(const a of n.attrs){assert.ok(['class','colspan','rowspan','role','tabindex','aria-label'].includes(a.name),a.name);if(a.name==='class')assert.match(a.value,/^filing-(center|right|table-scroll)$/);if(['colspan','rowspan'].includes(a.name))assert.match(a.value,/^[1-9]\d?$/);}}for(const c of n.childNodes||[])inspect(c);}
  inspect(parseFragment(safe));assert.doesNotMatch(safe,/evil\(|javascript:|https:|<script|<img|<iframe|<style|Private|Hidden|Invisible/);
 }
});

test('HTML pages preserve whole tables and use the exact displayed page as selected-text evidence',()=>{
 const result=formatFiling('<div><p>'+'Introduction. '.repeat(40)+'</p><table><tr><td>Operating income</td><td>133,050</td></tr></table><p>'+'Later report. '.repeat(40)+'</p></div>',100);
 assert.equal(result.pages.length,3);
 const doc={reading_pages:result.pages,reading_version:result.version,full_text:'Old flattened text'};
 assert.equal(formattedPage(doc,999).page,3);assert.equal(formattedPage(doc,-1).page,1);
 assert.equal(filingReadingText(doc,2),'Operating income 133,050');
 assert.equal(selectedInSource('Operating income',{read_text:filingReadingText(doc,2)}),'Operating income');
 assert.throws(()=>selectedInSource('Introduction',{read_text:filingReadingText(doc,2)}));
 assert.equal(formattedPage({...doc,reading_version:'old'}),null);
 assert.equal(filingReadingText({...doc,reading_version:'old'},2),'Old flattened text');
 assert.equal(result.version,FILING_READING_VERSION);
});
