import {concepts} from '../market/concepts.mjs';
import {readingNotes} from '../market/learning-path.mjs';
export const guide='https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide';
const orderGuide='https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders';
const stockGuide='https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks';
const extras=[
 ['balance-sheet','Balance sheet','A snapshot of assets, liabilities and shareholder equity at the reporting date. It differs from statements that cover activity over a period.','annual-quarter'],
 ['income-statement','Income statement','Shows revenue, expenses and profit or loss for a reporting period. It does not directly describe the cash currently in the bank.','revenue-profit'],
 ['assets','Assets','Resources owned by the company, including cash, inventory and property. Different assets have different uses and liquidity.','balance-sheet'],
 ['liabilities','Liabilities','Amounts and obligations the company owes. The balance sheet distinguishes current and longer-term obligations.','balance-sheet'],
 ['equity','Shareholder equity','Assets minus liabilities. This accounting balance is different from the market price of a company’s shares.','balance-sheet'],
 ['inventory','Inventory','Goods held for sale or used to make products. Holding inventory uses resources; selling goods is different from holding them.','assets'],
 ['current-assets','Current assets','Assets expected to turn into cash, be sold or used within the short-term reporting cycle. Compare their timing with current obligations.','assets'],
 ['current-liabilities','Current liabilities','Obligations due in the short term. Read the reporting date and payment timing before comparing with available resources.','liabilities'],
 ['cost-of-sales','Cost of sales','Costs associated with the products or services sold in a period. Subtracting these from revenue gives gross profit before other expenses.','margin'],
 ['gross-profit','Gross profit','Revenue after cost of sales, before other operating and financing expenses. It is not the same as net income.','margin'],
 ['operating-expenses','Operating expenses','Costs supporting the company’s operations, such as administration and research. The definition and presentation should be checked in the report.','revenue-profit'],
 ['operating-income','Operating income','Operating profit after relevant operating costs and before interest and income taxes. Check the company’s definitions when comparing measures.','margin'],
 ['net-income','Net income','Accounting profit or loss after relevant costs, interest and taxes for a period. It is not necessarily cash generated in that period.','revenue-profit'],
 ['depreciation','Depreciation','Allocates the cost of certain long-lived assets over periods of use. The expense does not necessarily represent a new cash payment in the same period.','cash-flow'],
 ['investing-cash-flow','Investing cash flow','Cash flows associated with investments and long-lived assets. This is a different part of the cash-flow statement from operations.','cash-flow'],
 ['financing-cash-flow','Financing cash flow','Cash flows associated with funding, such as borrowing, repaying debt or transactions with shareholders. Borrowing is not operating revenue.','cash-flow'],
 ['retained-earnings','Retained earnings','Accumulated earnings kept in the business rather than distributed, adjusted for losses. This accounting figure is not a separate cash account.','equity'],
 ['dividends','Dividends','Distributions to shareholders. They are different from a change in the share price and are not guaranteed.','stock'],
 ['fiscal-year','Fiscal year','A company’s financial reporting year may differ from the calendar year. Read the actual start and end dates before comparing periods.','annual-quarter'],
 ['year-to-date','Year-to-date figures','Cumulative activity from the start of a reporting year. A cumulative amount should not be treated as a single-quarter amount.','annual-quarter'],
 ['footnotes','Financial statement footnotes','Explain accounting policies, important assumptions and details behind reported totals. They help interpret the headline figures.','annual-quarter'],
 ['management-discussion','Management discussion and analysis','Management’s account of performance, trends and uncertainties. Distinguish their expectations from confirmed historical results.','annual-quarter'],
 ['cash-vs-profit','Cash versus accounting profit','Timing differences mean earnings and operating cash flow can differ. Read both statements over comparable periods.','cash-flow'],
 ['interest-expense','Interest expense','The accounting cost of borrowing for a period. It is distinct from repayment of the original debt principal.','liabilities']
];
export const topics=[...concepts.map(c=>({...c,related:[],source:['market-order','limit-order'].includes(c.key)?orderGuide:['stock','price-value'].includes(c.key)?stockGuide:guide,notes:readingNotes[c.key]||[]})),...extras.map(([key,term,definition,parent])=>({key,term,definition,related:[parent],source:guide,notes:[]}))];
export function normalText(text){return String(text||'').normalize('NFKC').replace(/\s+/g,' ').trim();}
export function dailyCandidates(bookmarks=[],savedTopics=[],chatTopics=[],day='',preferences={}){
 const known=new Set(savedTopics);const saved=bookmarks.map(b=>normalText(b.text).toLowerCase());
 for(const b of bookmarks)if(b.source_key?.startsWith('concept:'))known.add(b.source_key.slice(8));
 for(const t of topics)if(saved.some(s=>s===t.term.toLowerCase()||s===t.key||s===t.term.replace(/^A /,'').toLowerCase()))known.add(t.key);
 const relatedText=[...saved,...chatTopics.map(x=>normalText(x).toLowerCase())].join(' ');
 const hints=new Set();for(const [word,keys] of [['warehouse',['inventory','assets','margin']],['retail',['inventory','margin']],['membership',['revenue-profit','margin']],['10-k',['annual-quarter']],['10-q',['annual-quarter']],['annual',['annual-quarter']],['revenue',['revenue-profit']],['profit',['revenue-profit','margin']],['cash',['cash-flow']],['库存',['inventory','assets']],['营收',['revenue-profit']],['年报',['annual-quarter']]])if(relatedText.includes(word))keys.forEach(k=>hints.add(k));
 const anchors=new Set([...known,...hints]);
 const likedAnchors=new Set((preferences.liked_topic_keys||[]).flatMap(key=>[key,...(topics.find(t=>t.key===key)?.related||[])]));
 const offset=[...day].reduce((s,c)=>s+c.charCodeAt(0),0);
 return topics.filter(t=>!known.has(t.key)).map((t,i)=>({...t,rank:(t.related.some(k=>anchors.has(k))?100:0)+(likedAnchors.has(t.key)||t.related.some(k=>likedAnchors.has(k))?80:0)+((preferences.avoid_topic_keys||[]).includes(t.key)?-100:0)+(hints.has(t.key)?60:0)+(relatedText.includes(t.term.toLowerCase())?50:0)+((i+offset)%topics.length)/100})).sort((a,b)=>b.rank-a.rank).slice(0,5);
}
// Personal writing is examined locally; only allowlisted topic keys leave the server.
export function noteTopicKeys(notes=[]){const keys=new Set();for(const n of notes){const text=normalText((n.title||'')+' '+(n.body||'')).toLowerCase();for(const t of topics){const name=t.term.toLowerCase().replace(/^a /,'');if(name.length>=3&&text.includes(name))keys.add(t.key);}for(const [word,key] of [['cash flow','cash-flow'],['收入','revenue-profit'],['利润率','margin'],['现金流','cash-flow'],['每股收益','eps'],['净利润','net-income'],['资产负债表','balance-sheet'],['存货','inventory'],['折旧','depreciation'],['股息','dividends'],['年报','annual-quarter'],['季报','annual-quarter']])if(text.includes(word))keys.add(key);}return [...keys];}
