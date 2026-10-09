import {concepts} from './concepts.mjs';
import {easternDay} from './exploration.mjs';
const related={stock:['price-value','market-order'], 'revenue-profit':['margin','cash-flow','eps'],margin:['revenue-profit','cash-flow'],'price-value':['eps','annual-quarter'], 'market-order':['limit-order','price-value'],'limit-order':['market-order','price-value'],'cash-flow':['revenue-profit','annual-quarter'],eps:['annual-quarter','margin'],'annual-quarter':['cash-flow','eps']};
export function suggestedConcepts(bookmarks=[],now=new Date()) {
 const known=new Set(bookmarks.filter(b=>b.source_key?.startsWith('concept:')).map(b=>b.source_key.slice(8)));
 for(const c of concepts)if(bookmarks.some(b=>b.text?.trim().toLowerCase()===c.term.toLowerCase()))known.add(c.key);
 const candidates=[...new Set([...known].flatMap(key=>related[key]||[]))].filter(k=>!known.has(k));
 const fallback=concepts.map(c=>c.key).filter(k=>!known.has(k)&&!candidates.includes(k));
 const date=easternDay(now),offset=[...date].reduce((s,c)=>s+c.charCodeAt(0),0)%Math.max(1,fallback.length);
 return [...candidates,...fallback.slice(offset),...fallback.slice(0,offset)].slice(0,3).map(key=>({...concepts.find(c=>c.key===key),related:candidates.includes(key)}));
}
export const readingNotes={
 stock:['Read the company description before studying its share price. Identify what it sells and who pays for it.','A share price can change even when the company’s day-to-day products look the same. The price reflects transactions and changing expectations.'],
 'revenue-profit':['Check the period and the accounting measure. A revenue figure describes sales earned in that period; it does not describe cash already in the bank.','Compare revenue, costs and net income together. Faster sales growth does not automatically mean faster profit growth.'],
 margin:['The name of the margin matters. Gross margin, operating margin and net margin subtract different groups of expenses.','When comparing companies or periods, use the same margin definition. An adjusted margin can also differ from a GAAP margin.'],
 'price-value':['The latest displayed trade describes a transaction. A valuation is an estimate based on assumptions about the business and its future.','Separate a price observation from a claim that a company is cheap or expensive. Ask what evidence and assumptions support that claim.'],
 'market-order':['The latest displayed stock price is not a promise of the price at which an order will execute. Market conditions and available orders can change.','Distinguish getting an order filled from controlling its price. A market order gives priority to execution rather than a specified limit price.'],
 'limit-order':['A purchase limit and a sale limit set different price boundaries. An order may remain unfilled if available prices never meet its conditions.','A price condition is not a guarantee of execution. Review how an order type works before applying it in a brokerage account.'],
 'cash-flow':['Read the operating section of the cash-flow statement for the same reporting period as the income statement.','Cash collected from customers and cash paid to suppliers can occur in different periods from the related revenue and expenses. This helps explain why profit and cash flow differ.'],
 eps:['Check whether EPS is basic or diluted and whether it is GAAP or an adjusted measure. These labels affect comparisons.','Also check the period and the share count. EPS is a per-share measure; it does not tell the whole story about a company’s cash or total profit.'],
 'annual-quarter':['Start with the period covered, rather than the date the report was filed. A fiscal year may differ from the calendar year.','Quarterly reports can contain both three-month and cumulative figures. Do not treat a nine-month cash-flow figure as if it covered only the last three months.']
};
