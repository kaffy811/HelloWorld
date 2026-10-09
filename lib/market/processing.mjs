// Pure transformations. No fetching, AI calls or database writes here.
export const METRICS = [
  [
    "revenue",
    "Revenue",
    "USD",
    "duration",
    [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
    ],
  ],
  ["net_income", "Net income", "USD", "duration", ["NetIncomeLoss"]],
  [
    "operating_income",
    "Operating income",
    "USD",
    "duration",
    ["OperatingIncomeLoss"],
  ],
  ["eps", "Diluted EPS", "USD/shares", "duration", ["EarningsPerShareDiluted"]],
  ["assets", "Total assets", "USD", "instant", ["Assets"]],
  ["liabilities", "Total liabilities", "USD", "instant", ["Liabilities"]],
  [
    "equity",
    "Shareholders’ equity",
    "USD",
    "instant",
    [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
  ],
  [
    "cash",
    "Cash & cash equivalents",
    "USD",
    "instant",
    ["CashAndCashEquivalentsAtCarryingValue"],
  ],
  [
    "operating_cash",
    "Operating cash flow",
    "USD",
    "duration",
    ["NetCashProvidedByUsedInOperatingActivities"],
  ],
  [
    "capex",
    "Capital expenditure",
    "USD",
    "duration",
    ["PaymentsToAcquirePropertyPlantAndEquipment"],
  ],
];
export function financialPeriods(raw, cik, now = new Date()) {
  const gaap = raw?.facts?.["us-gaap"] || {};
  const valid = (f) =>
    Number.isFinite(f.val) &&
    ["10-K", "10-Q", "10-K/A", "10-Q/A"].includes(f.form) &&
    /^\d{10}-\d{2}-\d{6}$/.test(f.accn || "") &&
    f.end &&
    f.filed &&
    new Date(f.filed) <= now &&
    new Date(f.end) <= now;
  const periods = new Map();
  for (const [key, label, unit, type, tags] of METRICS) {
    // Use one taxonomy tag per metric; do not merge overlapping revenue definitions.
    const tag = tags.find((t) => gaap[t]?.units?.[unit]?.some(valid));
    if (!tag) continue;
    const facts = gaap[tag].units[unit]
      .filter(valid)
      .sort((a, b) => b.filed.localeCompare(a.filed));
    for (const f of facts) {
      const days = f.start
        ? (new Date(f.end) - new Date(f.start)) / 86400000 + 1
        : null;
      const frequency =
        type === "instant"
          ? "instant"
          : days >= 330 && days <= 380
            ? "annual"
            : days >= 70 && days <= 110
              ? "quarter"
              : days >= 150 && days <= 310
                ? "year-to-date"
                : null;
      if (!frequency) continue;
      const pkey = [frequency, f.start || "", f.end].join(":");
      if (!periods.has(pkey))
        periods.set(pkey, {
          frequency,
          start: f.start || null,
          end: f.end,
          metrics: {},
        });
      const period = periods.get(pkey);
      if (period.metrics[key]) continue; // newest filed version, with its actual accession
      period.metrics[key] = {
        label,
        value: f.val,
        unit,
        tag,
        filed: f.filed,
        form: f.form,
        accession: f.accn,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accn.replaceAll("-", "")}/`,
      };
    }
  }
  return [...periods.values()]
    .sort((a, b) => b.end.localeCompare(a.end))
    .filter((p) => new Date(p.end) >= new Date(now.getFullYear() - 4, 0, 1));
}
export function filingsFrom(raw, cik, name, now = new Date()) {
  const r = raw?.filings?.recent;
  if (!r) return [];
  return (r.accessionNumber || [])
    .map((accn, i) => ({
      accession: accn,
      form: r.form[i],
      date: r.filingDate[i],
      accepted: r.acceptanceDateTime?.[i],
      period: r.reportDate?.[i],
      document: r.primaryDocument[i],
    }))
    .filter(
      (f) =>
        ["8-K", "10-Q", "10-K", "10-Q/A", "10-K/A"].includes(f.form) &&
        /^\d{10}-\d{2}-\d{6}$/.test(f.accession) &&
        /^[\w.-]+\.html?$/i.test(f.document) &&
        new Date(f.date) <= now,
    )
    .slice(0, 50)
    .map((f) => ({
      ...f,
      title: `${name} · ${f.form}${f.period ? (f.form === "8-K" ? " · event date " : " · period ended ") + f.period : ""}`,
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${f.accession.replaceAll("-", "")}/${f.document}`,
    }));
}
export function cleanBars(raw, now = new Date()) {
  const byDay = new Map();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (key) => parts.find((p) => p.type === key)?.value;
  const today = [part("year"), part("month"), part("day")].join("-");
  const completeToday =
    Number(part("hour")) * 60 + Number(part("minute")) >= 16 * 60 + 20;
  for (const b of raw || []) {
    if (b?.t?.slice(0, 10) === today && !completeToday) continue; // current daily bar is still incomplete

    if (
      !b?.t ||
      !Number.isFinite(Date.parse(b.t)) ||
      new Date(b.t) > now ||
      ![b.o, b.h, b.l, b.c, b.v].every(Number.isFinite) ||
      Math.min(b.o, b.h, b.l, b.c) <= 0 ||
      b.v < 0 ||
      b.h < Math.max(b.o, b.c, b.l) ||
      b.l > Math.min(b.o, b.c, b.h)
    )
      continue;
    byDay.set(b.t.slice(0, 10), {
      time: b.t,
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v,
    });
  }
  return [...byDay.values()].sort((a, b) => a.time.localeCompare(b.time));
}
export function priceFeatures(bars) {
  const n = bars.length,
    latest = bars[n - 1];
  const pct = (a, b) => (a && b ? (a / b - 1) * 100 : null);
  return {
    return_5d: n >= 6 ? pct(latest.close, bars[n - 6].close) : null,
    return_20d: n >= 21 ? pct(latest.close, bars[n - 21].close) : null,
    ma20:
      n >= 20 ? bars.slice(-20).reduce((a, b) => a + b.close, 0) / 20 : null,
    volume_ratio20:
      n >= 21 && bars.slice(-21, -1).reduce((a, b) => a + b.volume, 0) > 0
        ? latest.volume /
          (bars.slice(-21, -1).reduce((a, b) => a + b.volume, 0) / 20)
        : null,
  };
}
export function normalizeSnapshot(snapshot, rawBars, now = new Date()) {
  const bars = cleanBars(rawBars, now);
  const trade = snapshot?.latestTrade,
    day = snapshot?.dailyBar,
    prev = snapshot?.prevDailyBar;
  const price = trade?.p,
    previous = prev?.c;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !trade.t ||
    !Number.isFinite(Date.parse(trade.t)) ||
    new Date(trade.t) > now
  )
    throw new Error("Invalid price snapshot");
  const features = priceFeatures(bars);
  return {
    price,
    previous_close: Number.isFinite(previous) && previous > 0 ? previous : null,
    change: Number.isFinite(previous) && previous > 0 ? price - previous : null,
    change_percent:
      Number.isFinite(previous) && previous > 0
        ? (price / previous - 1) * 100
        : null,
    open: Number.isFinite(day?.o) ? day.o : null,
    high: Number.isFinite(day?.h) ? day.h : null,
    low: Number.isFinite(day?.l) ? day.l : null,
    volume: Number.isFinite(day?.v) ? day.v : null,
    as_of: trade.t,
    history_period_end: bars.at(-1)?.time.slice(0, 10) || null,
    currency: "USD",
    feed: "iex",
    adjustment: "all",
    bars,
    features,
  };
}
export function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const v = Number(n);
      return v > 0 && v <= 0x10ffff ? String.fromCodePoint(v) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      const v = parseInt(n, 16);
      return v > 0 && v <= 0x10ffff ? String.fromCodePoint(v) : "";
    })
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, e) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[e],
    )
    .replace(/\s+/g, " ")
    .trim();
}
export function parseFeed(xml, source, now = new Date()) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Unsupported feed declarations");
  const hosts = {
    "Federal Reserve": ["www.federalreserve.gov"],
    BLS: ["www.bls.gov"],
    BEA: ["www.bea.gov", "apps.bea.gov"],
  }[source];
  if (!hosts) throw new Error("Unsupported feed source");
  const rows = [];
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)) {
    const field = (k) =>
      decode(
        match[1].match(
          new RegExp(`<${k}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${k}>`, "i"),
        )?.[1] || "",
      );
    const url = field("link"),
      title = field("title"),
      date = new Date(field("pubDate"));
    let u;
    try {
      u = new URL(url);
    } catch {
      continue;
    }
    if (
      !hosts.includes(u.hostname) ||
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      !title ||
      title.length > 500 ||
      !Number.isFinite(+date) ||
      date > now
    )
      continue;
    rows.push({
      source_key: `${source}:${u.href}`,
      title,
      excerpt: field("description").slice(0, 3000),
      source,
      source_url: u.href,
      category: "market",
      tickers: [],
      published_at: date.toISOString(),
      collected_at: now.toISOString(),
    });
  }
  return rows.slice(0, 40);
}
