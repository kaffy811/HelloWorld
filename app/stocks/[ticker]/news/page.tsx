import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from "next/link";
import { stockContext, StockHeader } from "@/components/stock-header";
import { articles } from "@/lib/market/data";
import { ArticleList } from "@/components/market-display";
import { analyses } from "@/lib/news/data";
import { NewsCard } from "@/components/news-card";
export default async function CompanyNews({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
 const {t:ui}=await getTranslator();
  const ticker = (await params).ticker.toUpperCase(),
    context = await stockContext(ticker),
    current = Math.max(
      1,
      Math.min(100, Number.parseInt((await searchParams).page || "1") || 1),
    ),
    [feed, ai] = await Promise.all([
      articles(ticker, undefined, current),
      analyses(ticker, "news"),
    ]);
  return (
    <>
      <StockHeader context={context} tab="news" />
      {ai.data.length > 0 && (
        <section className="content-section">
          <h2><T text="Company filings · AI explained"/></h2>
          <p className="section-description"><T text="AI explanations of this company’s official SEC filings. Open one to explore the source, ask questions and rate the explanation."/></p>
          <div className="news-grid">
            {ai.data.slice(0,2).map((a) => (
              <NewsCard key={a.id} analysis={a} returnPath={"/stocks/"+ticker+"/news"} />
            ))}
          </div>
        </section>
      )}

      <section className="content-section">
        <div className="section-title">
          <h2><T text="Company updates"/></h2>
        </div>
        <p className="section-description"><T text="Company news summaries and SEC filings, with publication dates and source links."/></p>
        {feed.data.length ? (
          <ArticleList items={feed.data} returnPath={"/stocks/"+ticker+"/news"} />
        ) : (
          <div className="panel">
            {feed.error
              ? <T text="Company updates are temporarily unavailable."/>
              : <T text="No updates available yet."/>}
          </div>
        )}
        <nav className="history-pagination" aria-label={ui("Company news pages")}>
          {current > 1 && (
            <Link href={`/stocks/${ticker}/news?page=${current - 1}`}><T text="← Previous"/></Link>
          )}
          {current * 30 < feed.count && (
            <Link href={`/stocks/${ticker}/news?page=${current + 1}`}><T text="Next →"/></Link>
          )}
        </nav>
      </section>
    </>
  );
}
