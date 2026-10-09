import {TextSelectionHelper} from '@/components/text-selection-helper';
import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import {LiveStockMetrics} from "@/components/live-market";
import { StockChart } from "@/components/stock-chart";
import Link from "next/link";
import { stockContext, StockHeader } from "@/components/stock-header";
import { ArticleList } from "@/components/market-display";
import { priceFor, money, articles } from "@/lib/market/data";
export default async function Stock({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
 const {t:ui}=await getTranslator();
  const ticker = (await params).ticker.toUpperCase(),
    context = await stockContext(ticker),
    { company: c, data } = context,
    p = priceFor(data.data, ticker),
    feed = await articles(ticker);
  const periods =
    data.data.find((d) => d.ticker === ticker && d.kind === "financials")
      ?.payload.periods || [];
  const annual = periods.find((v) => v.frequency === "annual");
  return (
    <>
      <StockHeader context={context} tab="overview" />
      <div className="stock-overview">
        <section className="panel">
          <h2>{ticker}<T text=" stock chart"/></h2>
          <StockChart ticker={ticker} price={p}/>
          <p className="small"><T text="Overview metrics below use the cached snapshot timestamp in the company header."/></p>
          <LiveStockMetrics ticker={ticker} initial={p}/>
        </section>
        <aside className="panel">
          <span className="eyebrow"><T text="ABOUT THE BUSINESS"/></span>
          <h2>{c.name}</h2>
          <p>{ui(c.summary)}</p>
          <div className="question">
            <span className="eyebrow"><T text="A QUESTION TO EXPLORE"/></span>
            <p>{ui(c.learning_question)}</p>
          </div>
          <a
            className="source"
            href={c.source_url}
            target="_blank"
            rel="noopener noreferrer"
          ><T text="Investor relations ↗"/></a>
        </aside>
      </div>
      <section className="content-section" data-readable="true">
        <div className="section-title">
          <h2><T text="Financial snapshot"/></h2>
          <Link className="source" href={`/stocks/${ticker}/financials`}><T text="Open financials →"/></Link>
        </div>
        <div className="panel">
          <p className="small">
            {annual
              ? ui('Annual reported period: {start} to {end} · SEC US GAAP',{start:annual.start||'—',end:annual.end})
              : <T text="SEC financial facts are not available yet."/>}
          </p>
          <dl className="metric-grid">
            {["revenue", "net_income", "eps", "operating_cash"].map((key) => (
              <div key={key}>
                <dt>
                  {(annual?.metrics[key]?.label?ui(annual.metrics[key].label):null) ||
                    {
                      revenue: <T text="Revenue"/>,
                      net_income: <T text="Net income"/>,
                      eps: <T text="Diluted EPS"/>,
                      operating_cash: <T text="Operating cash flow"/>,
                    }[key]}
                </dt>
                <dd>
                  {money(
                    annual?.metrics[key]?.value,
                    annual?.metrics[key]?.unit,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="content-section">
        <div className="section-title">
          <h2><T text="Latest company news"/></h2>
          <Link className="source" href={`/stocks/${ticker}/news`}><T text="View all →"/></Link>
        </div>
        {feed.data.length ? (
          <ArticleList items={feed.data.slice(0, 2)} returnPath={"/stocks/"+ticker} />
        ) : (
          <div className="panel">
            {feed.error
              ? <T text="Company news is temporarily unavailable."/>
              : <T text="No company updates available yet."/>}
          </div>
        )}
      </section>
      <TextSelectionHelper source={{kind:"stock",id:ticker}} signedIn={!!context.user&&!context.user.is_anonymous} returnPath={"/stocks/"+ticker}/>
    </>
  );
}
