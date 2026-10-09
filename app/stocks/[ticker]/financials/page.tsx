import Link from 'next/link';
import {filingPath} from '@/lib/news/reading.mjs';
import {TextSelectionHelper} from '@/components/text-selection-helper';
import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import { stockContext, StockHeader } from "@/components/stock-header";
import { money } from "@/lib/market/data";
import { easternDate } from "@/lib/news/data";
import { FinancialFilters } from "@/components/financial-filters";
import type { Period } from "@/lib/market/types";
export default async function Financials({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ period?: string; end?: string }>;
}) {
 const {t:ui,language}=await getTranslator();
  const ticker = (await params).ticker.toUpperCase(),
    context = await stockContext(ticker),
    query = await searchParams;
  const stored = context.data.data.find(
      (d) => d.ticker === ticker && d.kind === "financials",
    ),
    periods = stored?.payload.periods || [];
  const frequency = ["annual", "quarter", "year-to-date"].includes(
    query.period || "",
  )
    ? query.period!
    : "annual";
  const available = periods.filter((p) => p.frequency === frequency);
  const period = available.find((p) => p.end === query.end) || available[0];
  const balance = periods.find(
    (p) => p.frequency === "instant" && p.end === period?.end,
  );
  function statement(title: string, keys: string[], p: Period | undefined) {
    return (
      <section className="panel financial-statement">
        <h2>{ui(title)}</h2>
        <table className="financial-table">
          <thead>
            <tr>
              <th><T text="Reported metric"/></th>
              <th><T text="Value"/></th>
              <th><T text="Source filing"/></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const m = p?.metrics[key];
              return (
                <tr key={key}>
                  <td>
                    {(m?.label?ui(m.label):null) ||
                      {
                        revenue: <T text="Revenue"/>,
                        operating_income: <T text="Operating income"/>,
                        net_income: <T text="Net income"/>,
                        eps: <T text="Diluted EPS"/>,
                        assets: <T text="Total assets"/>,
                        liabilities: <T text="Total liabilities"/>,
                        equity: <T text="Shareholders’ equity"/>,
                        cash: <T text="Cash & cash equivalents"/>,
                        operating_cash: <T text="Operating cash flow"/>,
                        capex: <T text="Capital expenditure"/>,
                      }[key]}
                  </td>
                  <td>{money(m?.value, m?.unit)}</td>
                  <td>
                    {m ? (
                      <Link className="source" href={filingPath(ticker,m.accession)} prefetch={false}>
                        {m.form} · {m.filed} →
                      </Link>
                    ) : (
                      <span className="small"><T text="Not reported for this period"/></span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    );
  }
  return (
    <>
      <StockHeader context={context} tab="financials" />
      <section className="content-section" data-readable="true">
        <p className="reading-tip"><T text="Select an unfamiliar term in the financial summary to ask for an explanation."/></p>
        <div className="section-title">
          <h2><T text="Reported financials"/></h2>
          <span className="pill"><T text="SEC · US GAAP"/></span>
        </div>
        <FinancialFilters
          key={`${frequency}:${period?.end || ""}`}
          ticker={ticker}
          periods={periods}
          frequency={frequency}
          end={period?.end || ""}
        />
        <p className="small">
          {period
            ? ui('{frequency} duration: {start} to {end}. Balance sheet values are as of {end}.',{frequency:ui(frequency==='annual'?'Annual':frequency==='quarter'?'Quarterly':'Year to date'),start:period.start||'—',end:period.end})
            : <T text="No facts available for the selected period."/>}{" "}
          {stored ? ui('Retrieved {date}.',{date:easternDate(stored.updated_at,language)}) : ""}
        </p>
        <p className="small"><T text="Missing values are left blank; quarterly cash flow may appear only under Year to date. Figures can include later restatements."/></p>
        {!stored && (
          <div className="panel notice"><T text="Financial data is temporarily unavailable. Original filings are linked below when available."/></div>
        )}
        {statement(
          "Income statement",
          ["revenue", "operating_income", "net_income", "eps"],
          period,
        )}
        {statement(
          "Balance sheet",
          ["assets", "liabilities", "equity", "cash"],
          balance,
        )}
        {statement("Cash flow", ["operating_cash", "capex"], period)}
      </section>
      <section className="content-section" data-readable="true">
        <h2><T text="Original financial reports"/></h2>
        <div className="filing-list">
          {(
            context.data.data.find(
              (d) => d.ticker === ticker && d.kind === "filings",
            )?.payload.filings || []
          )
            .filter((f) => f.form.startsWith("10-"))
            .slice(0, 10)
            .map((f) => (
              <Link key={f.accession} href={filingPath(ticker,f.accession)} prefetch={false}>
                <strong>{f.form}</strong>
                <span><T text="Period ended "/>{f.period || "not specified"}</span>
                <span className="small"><T text="Filed "/>{f.date} →</span>
              </Link>
            ))}
        </div>
      </section>
      <TextSelectionHelper source={{kind:"stock",id:ticker}} signedIn={!!context.user&&!context.user.is_anonymous} returnPath={"/stocks/"+ticker+"/financials"}/>
    </>
  );
}
