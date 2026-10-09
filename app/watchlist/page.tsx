
import {T} from "@/components/language-provider";
import Link from "next/link";
import { loadProfile } from "@/lib/profile";
import { onboardingDestination } from "@/lib/onboarding";
import { redirect } from "next/navigation";
import { companies } from "@/lib/news/data";
import { marketData, articles } from "@/lib/market/data";
import { StockTable, ArticleList } from "@/components/market-display";
export default async function Watchlist() {
  const { supabase: s, user, profile } = await loadProfile("/watchlist");
  const destination = onboardingDestination(profile);
  if (destination !== "/") redirect(destination);
  const [watch, directory, data, feed] = await Promise.all([
    s.from("watchlist").select("ticker").eq("user_id", user.id),
    companies(),
    marketData(),
    articles(),
  ]);
  const watched = new Set((watch.data || []).map((w) => w.ticker));
  return (
    <>
      <section className="page-heading">
        <span className="eyebrow"><T text="YOUR US STOCKS"/></span>
        <h1><T text="Your watchlist."/></h1>
        <p><T text="Prices, company reports and news for the businesses you follow."/></p>
      </section>
      {watch.error ? (
        <div className="panel notice"><T text="Your watchlist is temporarily unavailable."/></div>
      ) : !watched.size ? (
        <div className="panel empty-state">
          <h2><T text="Start with one company."/></h2>
          <p><T text="Tap the star beside a stock to save it here."/></p>
          <Link className="button" href="/#companies"><T text="Explore US stocks →"/></Link>
        </div>
      ) : (
        <>
          <StockTable
            companies={directory.data.filter((c) => watched.has(c.ticker))}
            data={data.data}
            watched={watched}
            signedIn
            available={!watch.error}
          />
          <section className="content-section">
            <h2><T text="News for your stocks"/></h2>
            {feed.data.some((a) => a.tickers.some((t) => watched.has(t))) ? (
              <ArticleList
                items={feed.data.filter((a) =>
                  a.tickers.some((t) => watched.has(t)),
                )}
              />
            ) : (
              <div className="panel">
                {feed.error
                  ? <T text="News is temporarily unavailable."/>
                  : <T text="No company updates available yet."/>}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
