import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFragment} from 'parse5';
import {formatFiling,formattedPage,filingReadingText,compactFilingTables,FILING_READING_VERSION} from '../lib/news/filing-format.mjs';
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

test('cached accounting tables keep currency and percent signs next to values without shifting year columns',()=>{
 const result=formatFiling('<table><tr><td>Region</td><th colspan="2">2025</th><th colspan="3">Change</th><th colspan="2">2024</th></tr><tr><td>Americas</td><td>$</td><td style="text-align:right"><strong>178,353&nbsp;</strong></td><td colspan="2">7&nbsp;</td><td>%</td><td>$</td><td>167,045</td></tr><tr><td>Europe</td><td colspan="2">111,032</td><td colspan="2">(4)</td><td>%</td><td></td><td>101,328</td></tr></table>');
 const doc={reading_version:result.version,reading_pages:result.pages};
 const page=formattedPage(doc),root=parseFragment(page.html),rows=[];
 function visit(n){if(n.tagName==='tr')rows.push(n);for(const c of n.childNodes||[])visit(c);}visit(root);
 const cells=rows.map(r=>r.childNodes.filter(n=>['td','th'].includes(n.tagName)));
 const span=c=>Number(c.attrs.find(a=>a.name==='colspan')?.value)||1;
 assert.deepEqual(cells.map(row=>row.map(span)),[[1,2,3,2],[1,2,3,2],[1,2,3,2]]);
 assert.match(page.html,/>\$&nbsp;<strong>178,353<\/strong>/);
 assert.match(page.html,/>7&nbsp;%<\/td>/);
 assert.match(page.html,/>\(4\)&nbsp;%<\/td>/);
 assert.equal(page.text,result.pages[0].text);
 assert.equal(selectedInSource('$\u00a0178,353',{read_text:page.text}),'$ 178,353');
 assert.equal(selectedInSource('(4)\u00a0%',{read_text:page.text}),'(4) %');
 assert.equal(compactFilingTables(page.html),page.html);
});

test('currency compaction leaves unrelated cells, dates and complex row spans intact',()=>{
 const html=formatFiling('<table><tr><td rowspan="2">$</td><td>100</td></tr><tr><td>200</td></tr></table><table><tr><td>Cash</td><td>September 27,<br>2025</td><td>35,934</td></tr><tr><td>Label</td><td>$</td><td>Not a number</td></tr></table>').pages[0].html;
 assert.equal(compactFilingTables(html),html);
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
