// Compact deterministic evidence packet for the next AI phase. No model calls.
import { createHash } from "node:crypto";
export function analysisContext(company, rows, articles, now = new Date()) {
  const byKind = Object.fromEntries(
    rows.filter((r) => r.ticker === company.ticker).map((r) => [r.kind, r]),
  );
  const financials = byKind.financials?.payload?.periods || [];
  const latest = (frequency) =>
    financials.find((p) => p.frequency === frequency) || null;
  const price = byKind.price;
  const packet = {
    schema_version: 1,
    ticker: company.ticker,
    company: {
      name: company.name,
      sector: company.sector,
      business: company.summary,
    },
    prepared_at: now.toISOString(),
    market: price
      ? {
          source: price.source,
          as_of: price.as_of,
          retrieved_at: price.updated_at,
          feed: "IEX only",
          price: price.payload.price,
          previous_close: price.payload.previous_close,
          change_percent: price.payload.change_percent,
          features: price.payload.features,
          features_period_end:
            price.payload.history_period_end ||
            price.payload.bars?.at(-1)?.time.slice(0, 10) ||
            null,
        }
      : null,
    financials: {
      source: "SEC companyfacts",
      retrieved_at: byKind.financials?.updated_at || null,
      annual: latest("annual"),
      quarter: latest("quarter"),
      year_to_date: latest("year-to-date"),
      balance: latest("instant"),
    },
    news: articles
      .filter((a) => a.tickers?.includes(company.ticker))
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        published_at: a.published_at,
        source: a.source,
        url: a.source_url,
      })),
    limitations: [
      "Company news currently covers SEC filings.",
      "Financial facts may contain subsequent restatements.",
      "Annual, quarter and cumulative periods must not be compared as interchangeable.",
      "No price reaction or sentiment has been inferred.",
      "Point-in-time backtesting requires archived snapshots, not this latest-state cache.",
      price
        ? "Market prices and volume cover IEX only, and may be stale; use the quote timestamp."
        : "Market data is unavailable; no price/volume inference is supported.",
    ],
  };
  const semantic = {
    ...packet,
    prepared_at: undefined,
    market: packet.market
      ? { ...packet.market, retrieved_at: undefined }
      : null,
    financials: { ...packet.financials, retrieved_at: undefined },
  };
  return {
    ...packet,
    evidence_hash: createHash("sha256")
      .update(JSON.stringify(semantic))
      .digest("hex"),
  };
}
