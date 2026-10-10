import test from "node:test";
import assert from "node:assert/strict";
import {
  financialPeriods,
  reportFinancialPeriods,
  filingsFrom,
  cleanBars,
  priceFeatures,
  normalizeSnapshot,
  parseFeed,
} from "../lib/market/processing.mjs";
import { resolveBookmark } from "../lib/market/concepts.mjs";
import {selectFinancialReport} from '../lib/market/report-selection.mjs';
const accn = "0000320193-26-000001",
  now = new Date("2026-10-08T17:00:00Z");
const fact = (x = {}) => ({
  val: 100,
  start: "2025-10-01",
  end: "2026-09-30",
  filed: "2026-10-05",
  form: "10-K",
  accn,
  ...x,
});
test('selected report retains its original balance instead of later quarterly comparative facts',()=>{
 const quarterAccn='0000320193-26-000002';
 const raw={facts:{'us-gaap':{
  Revenues:{units:{USD:[fact()]}},
  Assets:{units:{USD:[fact({start:undefined,val:200}),fact({start:undefined,val:250,form:'10-Q',accn:quarterAccn,filed:'2026-10-07'}),fact({start:undefined,end:'2026-12-31',val:300,form:'10-Q',accn:quarterAccn,filed:'2027-02-01'})]}}
 }}};
 const filings=[{accession:accn,form:'10-K',period:'2026-09-30'},{accession:quarterAccn,form:'10-Q',period:'2026-12-31'}];
 const reports=reportFinancialPeriods(raw,'0000320193',filings,now),selected=selectFinancialReport(reports,'annual','2026-09-30');
 assert.equal(selected.period.metrics.revenue.value,100);
 assert.equal(selected.balance.metrics.assets.value,200);
 assert.equal(selected.balance.metrics.assets.accession,selected.period.accession);
 assert.ok(!reports.some(p=>p.accession===quarterAccn));
 const old=selectFinancialReport(financialPeriods(raw,'0000320193',now),'annual','2026-09-30');
 assert.equal(old.balance.metrics.assets,undefined);
});
test('report selection never fills missing metrics from a different amendment or filing',()=>{
 const a=accn,b='0000320193-26-000003',metric=(accession,form,filed,value)=>({accession,form,filed,value});
 const periods=[
  {frequency:'annual',end:'2026-09-30',accession:a,form:'10-K',filed:'2026-10-01',metrics:{revenue:metric(a,'10-K','2026-10-01',100)}},
  {frequency:'annual',end:'2026-09-30',accession:b,form:'10-K/A',filed:'2026-10-07',metrics:{revenue:metric(b,'10-K/A','2026-10-07',105),eps:metric(a,'10-K','2026-10-01',2)}},
  {frequency:'instant',end:'2026-09-30',accession:a,metrics:{assets:metric(a,'10-K','2026-10-01',200)}}
 ];
 const selected=selectFinancialReport(periods,'annual','2026-09-30');
 assert.equal(selected.available.length,1);assert.equal(selected.period.accession,b);
 assert.equal(selected.period.metrics.eps,undefined);assert.equal(selected.balance,null);
});
test('quarterly report selection keeps quarter and year-to-date cash flow separate',()=>{
 const q='0000320193-26-000004',metric={accession:q,form:'10-Q',filed:'2026-08-01',value:75};
 const periods=['quarter','year-to-date','instant'].map(frequency=>({frequency,end:'2026-06-30',accession:q,form:'10-Q',filed:metric.filed,metrics:frequency==='year-to-date'?{operating_cash:metric}:frequency==='instant'?{assets:metric}:{revenue:metric}}));
 assert.equal(selectFinancialReport(periods,'quarter').period.metrics.operating_cash,undefined);
 assert.equal(selectFinancialReport(periods,'year-to-date').period.metrics.operating_cash.value,75);
 assert.equal(selectFinancialReport(periods,'quarter').balance.metrics.assets.accession,q);
 assert.deepEqual(selectFinancialReport([]),{available:[],period:null,balance:null});
});
test("SEC normalization keeps annual, quarterly and cumulative durations separate; latest filing wins", () => {
  const raw = {
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              fact(),
              fact({ val: 105, filed: "2026-10-07", form: "10-K/A" }),
              fact({ start: "2026-07-01", val: 30, form: "10-Q" }),
              fact({ start: "2026-01-01", val: 75, form: "10-Q" }),
              fact({ val: 999, filed: "2026-11-01" }),
            ],
          },
        },
        Assets: { units: { USD: [fact({ start: undefined, val: 200 })] } },
      },
    },
  };
  const p = financialPeriods(raw, "0000320193", now);
  assert.equal(
    p.find((v) => v.frequency === "annual").metrics.revenue.value,
    105,
  );
  assert.equal(
    p.find((v) => v.frequency === "quarter").metrics.revenue.value,
    30,
  );
  assert.equal(
    p.find((v) => v.frequency === "year-to-date").metrics.revenue.value,
    75,
  );
  assert.equal(
    p.find((v) => v.frequency === "instant").metrics.assets.value,
    200,
  );
  assert.equal(
    p.find((v) => v.frequency === "annual").metrics.revenue.form,
    "10-K/A",
  );
});
test("bar normalization rejects future/invalid OHLC and keeps sessions sorted", () => {
  const bars = cleanBars(
    [
      { t: "2026-10-02T04:00:00Z", o: 10, h: 12, l: 9, c: 11, v: 50 },
      { t: "2026-10-01T04:00:00Z", o: 10, h: 12, l: 9, c: 10, v: 20 },
      { t: "2026-10-03T04:00:00Z", o: 10, h: 8, l: 9, c: 11, v: 50 },
      { t: "2026-11-02T04:00:00Z", o: 10, h: 12, l: 9, c: 11, v: 50 },
    ],
    now,
  );
  assert.equal(bars.length, 2);
  assert.equal(bars[0].close, 10);
  assert.equal(priceFeatures(bars).ma20, null);
});
test("features require sufficient complete sessions and zero previous-close stays missing", () => {
  const bars = Array.from({ length: 21 }, (_, i) => ({
    close: i + 1,
    volume: 100,
  }));
  assert.equal(priceFeatures(bars).ma20, 11.5);
  assert.equal(priceFeatures(bars).volume_ratio20, 1);
  const p = normalizeSnapshot(
    {
      latestTrade: { p: 10, t: "2026-10-08T16:00:00Z" },
      prevDailyBar: { c: 0 },
    },
    [],
    now,
  );
  assert.equal(p.change_percent, null);
  assert.throws(() =>
    normalizeSnapshot(
      { latestTrade: { p: Infinity, t: "2026-10-08T16:00:00Z" } },
      [],
      now,
    ),
  );
});
test("RSS strips markup and rejects off-source URLs, future dates and XML entity declarations", () => {
  const xml = `<rss><channel><item><title><![CDATA[CPI &amp; employment]]></title><link>https://www.bls.gov/news.release/cpi.htm</link><pubDate>Wed, 07 Oct 2026 08:30:00 -0400</pubDate><description><![CDATA[<p>Official <b>data</b></p>]]></description></item><item><title>Forged</title><link>https://evil.test/</link><pubDate>Wed, 07 Oct 2026 08:30:00 -0400</pubDate></item></channel></rss>`;
  const rows = parseFeed(xml, "BLS", now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "CPI & employment");
  assert.equal(rows[0].excerpt, "Official data");
  assert.throws(() => parseFeed("<!DOCTYPE rss>" + xml, "BLS", now));
});
test("filing URLs reject path traversal and future filing dates", () => {
  const raw = {
    filings: {
      recent: {
        accessionNumber: [accn, accn, accn],
        form: ["10-K", "10-K", "10-K"],
        filingDate: ["2026-10-05", "2026-10-05", "2027-01-01"],
        reportDate: ["2026-09-30", "", ""],
        primaryDocument: ["report.htm", "../secret.htm", "report.htm"],
      },
    },
  };
  assert.equal(filingsFrom(raw, "0000320193", "Apple", now).length, 1);
});
test("bookmarks use canonical explanations, ignore forged text, and reject unsupported material", () => {
  const c = resolveBookmark({
    concept: "eps",
    text: "forged",
    explanation: "forged",
  });
  assert.equal(c.text, "Diluted EPS");
  assert.notEqual(c.explanation, "forged");
  const a = {
    id: "fixture",
    kind: "news",
    ticker: "AAPL",
    content: {
      summary: "Source-based summary",
      terms: [{ term: "Revenue", definition: "Earned sales" }],
      facts: [{ text: "Canonical sentence", evidence_ids: ["source"] }],
    },
    evidence: [{ id: "source", label: "SEC filing" }],
  };
  assert.equal(
    resolveBookmark({ section: "terms", index: 0, text: "forged" }, a)
      .explanation,
    "Earned sales",
  );
  assert.equal(
    resolveBookmark({ section: "facts", index: 0 }, a).text,
    "Canonical sentence",
  );
  assert.throws(() =>
    resolveBookmark({ section: "terms", index: 0 }, { ...a, kind: "material" }),
  );
  assert.throws(() => resolveBookmark({ section: "terms", index: 4 }, a));
});

test("AI evidence packets are deterministic across reads and carry explicit missing-price limits", async () => {
  const { analysisContext } = await import("../lib/market/context.mjs");
  const company = {
    ticker: "AAPL",
    name: "Apple",
    sector: "Technology",
    summary: "Business",
  };
  const a = analysisContext(company, [], [], new Date("2026-10-08T17:00:00Z")),
    b = analysisContext(company, [], [], new Date("2026-10-08T18:00:00Z"));
  assert.equal(a.evidence_hash, b.evidence_hash);
  assert.equal(a.market, null);
  assert.ok(a.limitations.some((s) => s.includes("no price/volume inference")));
});

test("daily features exclude an in-progress trading day until the history delay window passes", () => {
  const bar = { t: "2026-10-08T04:00:00Z", o: 10, h: 12, l: 9, c: 11, v: 50 };
  assert.equal(cleanBars([bar], new Date("2026-10-08T17:00:00Z")).length, 0);
  assert.equal(cleanBars([bar], new Date("2026-10-08T20:30:00Z")).length, 1);
});

test("re-fetching unchanged facts does not invalidate the AI evidence hash", async () => {
  const { analysisContext } = await import("../lib/market/context.mjs");
  const c = {
      ticker: "AAPL",
      name: "Apple",
      sector: "Technology",
      summary: "Business",
    },
    rows = [
      {
        ticker: "AAPL",
        kind: "financials",
        updated_at: "2026-10-07T17:00:00Z",
        payload: { periods: [] },
      },
    ];
  const a = analysisContext(c, rows, [], now),
    b = analysisContext(
      c,
      [{ ...rows[0], updated_at: "2026-10-08T17:00:00Z" }],
      [],
      now,
    );
  assert.equal(a.evidence_hash, b.evidence_hash);
});


test("BEA RSS accepts only official links, decodes entities and preserves release time", () => {
 const xml=`<rss><channel><item><title>GDP &amp; Income</title><link>https://www.bea.gov/news/2026/gdp</link><pubDate>Tue, 06 Oct 2026 08:30:00 EDT</pubDate><description><![CDATA[<p>Growth &#x2014; summary.</p>&lt;!-- Full Text --&gt;&lt;a href="https://www.bea.gov/news"&gt;Full Text&lt;/a&gt;]]></description></item><item><title>Bad host</title><link>https://www.bea.gov.evil.test/news</link><pubDate>Tue, 06 Oct 2026 08:30:00 EDT</pubDate></item></channel></rss>`;
 const rows=parseFeed(xml,'BEA',now);assert.equal(rows.length,1);assert.equal(rows[0].published_at,'2026-10-06T12:30:00.000Z');assert.equal(rows[0].excerpt,'Growth — summary. Full Text');assert.equal(rows[0].collected_at,now.toISOString());assert.throws(()=>parseFeed(xml,'unknown',now));
});
test("Alpaca news preserves plain-text provider originals, matches configured symbols and deduplicates IDs", async () => {
 const {normalizeAlpacaNews,alpacaNewsUrl}=await import('../lib/market/news-sources.mjs');
 const n={id:42,source:'benzinga',headline:'Apple &amp; Microsoft earnings',url:'https://www.benzinga.com/news/42?utm_source=api',created_at:'2026-10-08T15:00:00Z',symbols:['AAPL','MSFT','TSLA','AAPL'],summary:'<p>Public summary.</p>',content:'<p>Original body.</p><script>never_execute()</script><p>Second paragraph.</p>'};
 const rows=normalizeAlpacaNews({news:[n,{...n,summary:'Updated summary.'},{...n,id:43,url:'https://benzinga.com.evil.test/'},{...n,id:44,created_at:'2027-01-01T00:00:00Z'},{...n,id:45,symbols:['TSLA']},{...n,id:46,source:'unknown'}]},[{ticker:'AAPL'},{ticker:'MSFT'}],now);
 assert.equal(rows.length,1);assert.equal(rows[0].source_key,'alpaca:42');assert.deepEqual(rows[0].tickers,['AAPL','MSFT']);assert.equal(rows[0].excerpt,'Updated summary.');assert.equal(rows[0].source_url,'https://www.benzinga.com/news/42');assert.equal(rows[0].body_text,'Original body.\n\nSecond paragraph.');assert.equal(rows[0].content,undefined);assert.equal(rows[0].published_at,n.created_at.replace('Z','.000Z'));
 const u=new URL(alpacaNewsUrl(['AAPL','COST'],now,'next'));assert.equal(u.searchParams.get('include_content'),'true');assert.equal(u.searchParams.get('page_token'),'next');assert.equal(u.searchParams.get('symbols'),'AAPL,COST');assert.throws(()=>normalizeAlpacaNews({},[],now));
});
test("scheduled news requires a configured exact bearer token",async()=>{
 const {scheduledAuthorized}=await import('../lib/news/scheduled.mjs');const secret='a'.repeat(64);
 assert.equal(scheduledAuthorized('Bearer '+secret,secret),true);for(const input of [null,'','Bearer wrong','bearer '+secret,'Bearer '+secret+'a'])assert.equal(scheduledAuthorized(input,secret),false);assert.equal(scheduledAuthorized('Bearer a','a'),false);
});
