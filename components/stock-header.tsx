import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from "next/link";
import {LiveQuote} from "./live-market";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { marketData, priceFor } from "@/lib/market/data";
import { FollowButton } from "./learning-actions";
import type { Company } from "@/lib/news/types";
export async function stockContext(ticker: string) {
  const s = await createClient();
  const { data: company, error } = await s
    .from("companies")
    .select("ticker,name,sector,summary,learning_question,source_url,cik")
    .eq("ticker", ticker)
    .maybeSingle();
  if (error) throw new Error("Company directory is temporarily unavailable.");
  if (!company) notFound();
  const {
    data: { user },
  } = await s.auth.getUser();
  const following = user
    ? await s
        .from("watchlist")
        .select("ticker")
        .eq("user_id", user.id)
        .eq("ticker", ticker)
        .maybeSingle()
    : { data: null, error: null };
  return {
    company: company as Company,
    user,
    following,
    data: await marketData(),
  };
}
export async function StockHeader({
  context,
  tab,
}: {
  context: Awaited<ReturnType<typeof stockContext>>;
  tab: "overview" | "news" | "financials";
}) {
 const {t:ui}=await getTranslator();
  const { company: c, user, following, data } = context,
    p = priceFor(data.data, c.ticker);
  return (
    <>
      <div className="breadcrumb">
        <Link href="/#companies"><T text="US stocks"/></Link>
        <span>／</span>
        {c.ticker}
      </div>
      <section className="stock-heading">
        <div>
          <span className="eyebrow"><T text="US EQUITY · "/>{ui(c.sector)}</span>
          <h1>
            {c.name}
            <span className="stock-symbol">{c.ticker}</span>
          </h1>
          <LiveQuote ticker={c.ticker} initial={p}/>
        </div>
        <FollowButton
          key={`${c.ticker}:${Boolean(following.data)}`}
          ticker={c.ticker}
          available={!following.error}
          signedIn={Boolean(user)}
          initial={Boolean(following.data)}
          variant="star"
        />
      </section>
      <nav className="tabs" aria-label={ui("Company sections")}>
        {[
          ["overview", "Overview", ""],
          ["news", "News", "/news"],
          ["financials", "Financials", "/financials"],
        ].map(([key, label, path]) => (
          <Link
            key={key}
            className={tab === key ? "active" : ""}
            href={`/stocks/${c.ticker}${path}`}
          >
            {ui(label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
