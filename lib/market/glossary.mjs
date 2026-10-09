// Curated, deterministic definitions: no model call, token cost or AI provenance.
export const glossary=[
 ['revenue','Revenue','营业收入','Sales earned during a reporting period. It is not necessarily cash collected.','报告期内销售商品或服务赚取的收入，不一定已经收到现金。'],
 ['operating-income','Operating income','营业利润','Profit from operations after relevant operating costs, before interest and income taxes. It helps show how the core business performed.','扣除相关经营成本后、支付利息和所得税前的利润，用来观察主营业务的表现。'],
 ['net-income','Net income','净利润','Accounting profit after relevant expenses, interest and taxes. Profit is different from cash flow.','扣除相关费用、利息和税款后的会计利润。净利润与现金流不同。'],
 ['eps','Diluted EPS','稀释每股收益','Profit attributable to each share after allowing for securities that could become shares. Use comparable reporting periods.','考虑可能转成普通股的证券后，每股对应的利润。比较时应使用相同报告期间。'],
 ['assets','Total assets','总资产','Resources reported as assets, such as cash, inventory and equipment. Asset value is not the company’s stock-market value.','公司报表中的资产，例如现金、存货和设备。总资产不等于股票市场中的公司市值。'],
 ['liabilities','Total liabilities','总负债','Reported obligations owed to others. Check their timing and terms as well as the total.','公司对其他方承担的债务和义务。除了总额，也要看偿还时间和条件。'],
 ['equity','Shareholders’ equity','股东权益','The accounting difference between assets and liabilities. It is not the current market value of the shares.','总资产减去总负债后的会计余额，不等于股票的当前市值。'],
 ['cash','Cash & cash equivalents','现金及现金等价物','Cash and short-term highly liquid holdings that qualify as cash equivalents. This is a balance at a date, not a period’s profit.','现金和符合条件、流动性很高的短期资产。这是某一天的余额，不是一个期间的利润。'],
 ['operating-cash','Operating cash flow','经营现金流','Cash generated or used by operating activities over a period. Timing differences mean it can differ from net income.','一个期间内经营活动带来或消耗的现金。收付款时间等因素使它可能与净利润不同。'],
 ['capex','Capital expenditure','资本支出','Spending on long-lived assets such as equipment. It differs from an expense immediately charged to that period’s profit.','购买设备等长期资产的支出，不同于当期直接计入利润表的费用。'],
 ['income-statement','Income statement','利润表','Shows revenue, expenses and profit for a period. Check the start and end dates before comparing companies.','展示一个报告期间的收入、费用和利润。比较公司前先确认报告期起止日期。'],
 ['balance-sheet','Balance sheet','资产负债表','Shows assets, liabilities and shareholders’ equity at a specific date. It is a snapshot, unlike a statement covering a period.','展示某一天的资产、负债和股东权益。它是一张时点快照。'],
 ['cash-flow','Cash flow','现金流量表','Tracks cash entering and leaving through operating, investing and financing activities during a period.','追踪一个期间内经营、投资和融资活动带来的现金流入与流出。']
].map(([key,en,zh,definitionEn,definitionZh])=>({key,en,zh,definitionEn,definitionZh}));
export function glossaryEntry(text){const key=String(text||'').normalize('NFKC').replace(/[’']/g,"'").replace(/\s+/g,' ').trim().toLowerCase();return glossary.find(g=>[g.en,g.zh,g.en.replace('&','and'),g.en.replace('Total ','')].some(s=>s.replace(/[’']/g,"'").toLowerCase()===key))||null;}
export function glossaryText(entry,language){return language==='zh-Hans'?{term:entry.zh,definition:entry.definitionZh}:{term:entry.en,definition:entry.definitionEn};}
