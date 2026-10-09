import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/news/validation.mjs";
import { createClient } from "@/lib/supabase/server";
import { onboardingDestination } from "@/lib/onboarding";
import { companies, analyses } from "@/lib/news/data";
import { articles, marketData } from "@/lib/market/data";
import {
  MarketStrip,
  StockTable,
  ArticleList,
} from "@/components/market-display";
import { NewsCard } from "@/components/news-card";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
 const {t:ui}=await getTranslator();
  const { q = "", category = "all" } = await searchParams,
    s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (user) {
    const { data: profile } = await s
      .from("profiles")
      .select("display_name,first_name,last_name,onboarding_completed_at")
      .eq("id", user.id)
      .single();
    if (!profile) throw new Error("Profile unavailable");
    const destination = onboardingDestination(profile);
    if (destination !== "/") redirect(destination);
    const next = safeReturnPath(
      (await cookies()).get("learning_return")?.value,
    );
    if (next !== "/") redirect(next);
  }
  const [directory, feed, market, ai, watch] = await Promise.all([
    companies(),
    articles(undefined, category),
    marketData(),
    analyses(undefined, "news"),
    user
      ? s.from("watchlist").select("ticker").eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const watched = new Set((watch.data || []).map((r) => r.ticker));
  const search = q.toLowerCase().trim();
  const matches = directory.data.filter((c) =>
    (c.ticker + " " + c.name + " " + c.sector).toLowerCase().includes(search),
  );
  const visible = feed.data.filter((a) =>
    (a.title + " " + a.excerpt + " " + a.tickers.join(" "))
      .toLowerCase()
      .includes(search),
  );
  return (
    <>
      <MarketStrip data={market.data} />
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow"><T text="YOUR DAILY US MARKET BRIEF"/></span>
          <h1><T text="Stay informed."/><span><T text=" Understand more."/></span>
          </h1>
          <p><T text="Market updates, company news and the ideas behind them."/></p>
        </div>
        <Link className="text-link" href="/learn"><T text="Build your stock vocabulary ↗"/></Link>
      </section>
      <form className="search-bar" action="/">
        <label htmlFor="company-search"><T text="Find a stock or news topic"/></label>
        <div>
          <input
            id="company-search"
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder={ui("Apple, MSFT, inflation…")}
          />
          <button className="button secondary"><T text="Search"/></button>
        </div>
      </form>
      <div className="dashboard-columns">
        <section id="today" className="content-section">
          <div className="section-title">
            <h2><T text="News"/></h2>
            <Link className="source" href="/news"><T text="All news →"/></Link>
          </div>
          <nav className="tabs" aria-label={ui("News categories")}>
            {[
              ["all", "All"],
              ["market", "Markets"],
              ["industry", "Industry"],
              ["company", "Companies"],
            ].map(([key, label]) => (
              <Link
                key={key}
                className={
                  category === key ||
                  (key === "all" &&
                    !["market", "industry", "company"].includes(category))
                    ? "active"
                    : ""
                }
                href={`/?category=${key}${q ? "&q=" + encodeURIComponent(q) : ""}#today`}
              >
                {ui(label)}
              </Link>
            ))}
          </nav>
          {visible.length ? (
            <ArticleList items={visible.slice(0, 8)} />
          ) : (
            <div className="panel empty-state">
              <h3>
                {feed.error
                  ? <T text="News is temporarily unavailable"/>
                  : category === "industry"
                    ? <T text="Industry coverage is being added"/>
                    : q
                      ? <T text="No matching news"/>
                      : <T text="No updates available yet"/>}
              </h3>
              <p>
                {category === "industry"
                  ? <T text="Current industry coverage focuses on official banking and consumer regulatory updates. Other sectors will be added after source validation."/>
                  : <T text="Browse the company explanations below or try another topic."/>}
              </p>
            </div>
          )}
        </section>
        <aside className="dashboard-sidebar content-section">
          <div className="section-title">
            <h2><T text="Your watchlist"/></h2>
            <Link className="source" href="/watchlist"><T text="View all →"/></Link>
          </div>
          {watch.error ? (
            <p><T text="Your watchlist is temporarily unavailable."/></p>
          ) : watched.size ? (
            <StockTable
              companies={directory.data.filter((c) => watched.has(c.ticker))}
              data={market.data}
              watched={watched}
              signedIn={Boolean(user)}
              available={!watch.error}
            />
          ) : (
            <div className="panel">
              <span className="eyebrow"><T text="KEEP COMPANIES CLOSE"/></span>
              <h3><T text="Start with one stock."/></h3>
              <p><T text="Tap a star in the stock list below to follow a company here."/></p>
              {!user && (
                <Link className="source" href="/login?next=/watchlist"><T text="Sign in to save your watchlist →"/></Link>
              )}
            </div>
          )}
          <div className="panel notebook-promo">
            <span className="eyebrow"><T text="YOUR KNOWLEDGE NOTEBOOK"/></span>
            <h3><T text="Keep the ideas that click."/></h3>
            <p><T text="Save terms and sentences with their explanations. Return to the original story whenever you need context."/></p>
            <Link className="source" href="/notebook"><T text="Open notebook →"/></Link>
          </div>
        </aside>
      </div>
      {ai.data.length > 0 && (
        <section className="content-section">
          <div className="section-title">
            <div>
              <span className="eyebrow"><T text="AI EXPLANATIONS · RATE WHAT HELPS"/></span>
              <h2><T text="Understand company updates"/></h2>
            </div>
          </div>
          <div className="news-grid">
            {ai.data
              .filter((a) =>
                (a.ticker + " " + a.content.headline)
                  .toLowerCase()
                  .includes(search),
              )
              .slice(0, 4)
              .map((a) => (
                <NewsCard key={a.id} analysis={a} />
              ))}
          </div>
        </section>
      )}
      <section id="companies" className="content-section">
        <div className="section-title">
          <h2><T text="Explore US stocks"/></h2>
          <span className="pill">{matches.length}<T text=" companies"/></span>
        </div>
        {directory.error ? (
          <p><T text="Company directory is temporarily unavailable."/></p>
        ) : matches.length ? (
          <StockTable
            companies={matches}
            data={market.data}
            watched={watched}
            signedIn={Boolean(user)}
            available={!watch.error}
          />
        ) : (
          <p><T text="No matching companies. Try a ticker or company name."/></p>
        )}
      </section>
    </>
  );
}
