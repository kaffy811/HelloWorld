import {officialFeeds,alpacaNewsUrl,normalizeAlpacaNews} from "./news-sources.mjs";
import { classifyArticle } from "./exploration.mjs";
import { createHash } from "node:crypto";
import { adminClient } from "../news/admin.mjs";
import {
  financialPeriods,
  reportFinancialPeriods,
  filingsFrom,
  normalizeSnapshot,
  parseFeed,
} from "./processing.mjs";
const allowed = new Set([
  "data.sec.gov",
  "www.federalreserve.gov",
  "www.bls.gov",
  "apps.bea.gov",
  "data.alpaca.markets",
]);
async function readSource(url, headers = {}, timeout = 25000) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !allowed.has(u.hostname))
    throw new Error("Unsupported data host");
  const res = await fetch(url, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`Data source returned HTTP ${res.status}`);
  const chunks = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16000000) {
      await reader.cancel();
      throw new Error("Source exceeds size limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function syncData({ pricesOnly = false, feedsOnly = false, newsOnly = false, web = false } = {}) {
  const deadline=Date.now()+45000;
  const source=async (url,headers={})=>{if(web&&Date.now()>deadline-1000)throw new Error("News refresh timed out; try later");return readSource(url,headers,web?Math.min(8000,Math.max(1000,deadline-Date.now())):25000);};
  const json=async (url,headers)=>JSON.parse(await source(url,headers));
  const admin = adminClient(),
    now = new Date(),
    report = {
      financials: 0,
      filings: 0,
      articles: 0,
      source_counts: {},
      news_status: "not_configured",
      news_truncated: false,
      prices: 0,
      price_status: newsOnly ? "skipped" : "not_configured",
      errors: [],
    };
  const { data: run, error: runError } = await admin
    .from("data_sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runError)
    throw new Error(
      "Apply 202610080001_market_foundation.sql before data sync.",
    );
  async function save(table, rows, onConflict) {
    if (!rows.length) return;
    if(table==="market_articles") rows=rows.map(row=>({...row,...classifyArticle(row)}));
    const { error } = await admin.from(table).upsert(rows, { onConflict });
    if (error)
      throw new Error(`Cannot save ${table}; check database migration`);
  }
  try {
    const { data: companies, error } = await admin
      .from("companies")
      .select("ticker,name,cik")
      .eq("market", "US")
      .order("ticker");
    if (error) throw new Error("Company directory is unavailable");
    if (!pricesOnly) {
      if (!process.env.SEC_USER_AGENT?.includes("@"))
        throw new Error("Set SEC_USER_AGENT with a contact email");
      const headers = {
        "User-Agent": process.env.SEC_USER_AGENT,
        "Accept-Encoding": "gzip, deflate",
      };
      for (const c of feedsOnly ? [] : companies || []) {
        try {
          const submissions = await json(
            `https://data.sec.gov/submissions/CIK${c.cik}.json`,
            headers,
          );
          await new Promise((r) => setTimeout(r, 600));
          const raw = newsOnly ? null : await json(
            `https://data.sec.gov/api/xbrl/companyfacts/CIK${c.cik}.json`,
            headers,
          );
          await new Promise((r) => setTimeout(r, 600));
          const periods = raw ? financialPeriods(raw, c.cik, now) : [],
            filings = filingsFrom(submissions, c.cik, c.name, now);
          if (raw && !periods.length)
            throw new Error("No normalized financial facts available");
          await save(
            "stock_data",
            [
              ...(raw ? [{
                ticker: c.ticker,
                kind: "financials",
                source: "SEC",
                as_of: now.toISOString(),
                updated_at: now.toISOString(),
                payload: {
                  periods,
                  report_periods:reportFinancialPeriods(raw,c.cik,filings,now),
                  evidence_hash: hash(periods),
                  schema_version: 1,
                  quality: { missing_values: "null", quarter_derived: false },
                },
              }] : []),
              {
                ticker: c.ticker,
                kind: "filings",
                source: "SEC",
                as_of: now.toISOString(),
                updated_at: now.toISOString(),
                payload: {
                  filings,
                  entity_name: submissions.name,
                  sic_description: submissions.sicDescription,
                  evidence_hash: hash(filings),
                  schema_version: 1,
                },
              },
            ],
            "ticker,kind",
          );
          if(raw) report.financials++;
          report.filings += filings.length;
          const { data: existing } = await admin
            .from("news_items")
            .select("id,source_key")
            .eq("ticker", c.ticker);
          const linked = new Map(
            (existing || []).map((n) => [n.source_key, n.id]),
          );
          const rows = filings
            .slice(0, 12)
            .map((f) => ({
              source_key: `sec:${c.cik}:${f.accession}`,
              title: f.title,
              excerpt: `Official ${f.form} filing. ${f.period ? (f.form === "8-K" ? "Event date " : "Reporting period ended ") + f.period + ". " : ""}Filed ${f.date}. Open the primary document for the company’s complete report.`,
              source: "SEC",
              source_url: f.url,
              category: "company",
              tickers: [c.ticker],
              published_at: f.accepted
                ? new Date(f.accepted).toISOString()
                : new Date(f.date + "T00:00:00Z").toISOString(),
              collected_at: now.toISOString(),
              sec_news_id: linked.get(`sec:${c.cik}:${f.accession}`) || null,
            }));
          await save("market_articles", rows, "source_key");
          report.articles += rows.length;
          report.source_counts["SEC"]=(report.source_counts["SEC"]||0)+rows.length;
        } catch (e) {
          report.errors.push({
            source: "SEC",
            ticker: c.ticker,
            message: e.message,
          });
        }
      }
      for (const [name, url, category] of officialFeeds) {
        try {
          const rows = parseFeed(await source(url), name, now).map((row) => ({
            ...row,
            category,
          }));
          if (!rows.length) throw new Error("No valid RSS entries");
          await save("market_articles", rows, "source_key");
          report.articles += rows.length;
          report.source_counts[name]=(report.source_counts[name]||0)+rows.length;
        } catch (e) {
          report.errors.push({ source: name, message: e.message });
        }
      }
    }
    if (!pricesOnly && process.env.ALPACA_API_KEY_ID && process.env.ALPACA_API_SECRET_KEY) {
      const headers={"APCA-API-KEY-ID":process.env.ALPACA_API_KEY_ID,"APCA-API-SECRET-KEY":process.env.ALPACA_API_SECRET_KEY};
      const symbols=(companies||[]).map(c=>c.ticker);
      report.news_status="available";
      if(symbols.length)try {
        let token=null;
        // Bound each batch to 150 records. Descending updates revisit a seven-day window.
        for(let page=0;page<3;page++){
          const raw=await json(alpacaNewsUrl(symbols,now,token),headers);
          const rows=normalizeAlpacaNews(raw,companies,now);
          await save("market_articles",rows,"source_key");
          report.articles+=rows.length;
          report.source_counts["Benzinga via Alpaca"]=(report.source_counts["Benzinga via Alpaca"]||0)+rows.length;
          token=raw.next_page_token||null;
          if(!token)break;
        }
        report.news_truncated=Boolean(token);
      }catch(e){report.news_status="failed";report.errors.push({source:"Benzinga via Alpaca",message:e.message});}
    }
    if (!newsOnly && process.env.ALPACA_API_KEY_ID && process.env.ALPACA_API_SECRET_KEY) {
      report.price_status = "configured";
      const symbols = [
        ...(companies || []).map((c) => c.ticker),
        "SPY",
        "QQQ",
        "DIA",
      ];
      const h = {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY_ID,
        "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET_KEY,
      };
      try {
        const snapshots = await json(
          `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols.join(",")}&feed=iex`,
          h,
        );
        for (const ticker of symbols) {
          try {
            const bars = [];
            let token = null;
            let truncated = false;
            for (let page = 0; page < 3; page++) {
              const q = new URLSearchParams({
                timeframe: "1Day",
                start: new Date(+now - 370 * 86400000).toISOString(),
                end: new Date(+now - 20 * 60000).toISOString(),
                limit: "1000",
                feed: "iex",
                adjustment: "all",
                sort: "asc",
              });
              if (token) q.set("page_token", token);
              const out = await json(
                `https://data.alpaca.markets/v2/stocks/${ticker}/bars?${q}`,
                h,
              );
              bars.push(...(out.bars || []));
              token = out.next_page_token;
              if (!token) break;
              truncated = true;
            }
            const receivedAt = new Date();
            const payload = normalizeSnapshot(
              snapshots[ticker],
              bars,
              receivedAt,
            );
            payload.schema_version = 1;
            payload.quality = {
              history_truncated: Boolean(token && truncated),
              coverage: "IEX only; not consolidated US volume",
            };
            payload.evidence_hash = hash(payload);
            await save(
              "stock_data",
              [
                {
                  ticker,
                  kind: "price",
                  source: "Alpaca IEX",
                  as_of: payload.as_of,
                  updated_at: receivedAt.toISOString(),
                  payload,
                },
              ],
              "ticker,kind",
            );
            report.prices++;
          } catch (e) {
            report.errors.push({
              source: "Alpaca IEX",
              ticker,
              message: e.message,
            });
          }
        }
      } catch (e) {
        report.errors.push({ source: "Alpaca IEX", message: e.message });
        report.price_status = "failed";
      }
    }
    const status = report.errors.length
      ? report.articles || report.financials || report.prices
        ? "partial"
        : "failed"
      : "completed";
    const { error: finishError } = await admin
      .from("data_sync_runs")
      .update({ status, finished_at: new Date().toISOString(), report })
      .eq("id", run.id);
    if (finishError) throw new Error("Cannot complete sync audit");
    if (!web) {console.log(JSON.stringify(report));if (status === "failed" || status === "partial") process.exitCode = 1;}
    return report;
  } catch (e) {
    await admin
      .from("data_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        report: { ...report, error: e.message },
      })
      .eq("id", run.id);
    throw e;
  }
}
