'use client';
import {T} from "@/components/language-provider";

import Link from "next/link";
import {useMarketPrice,LiveMarketStatus} from "./live-market";
import {useLanguage} from "./language-provider";
import { FollowButton } from "./learning-actions";
import { money, change } from "@/lib/market/format";
function priceFor(data:StockData[],ticker:string){return data.find(d=>d.ticker===ticker&&d.kind==="price")?.payload as import("@/lib/market/types").Price|undefined;}
import { easternDate } from "@/lib/date";
import type { Company } from "@/lib/news/types";
import type { StockData, Article, Bar } from "@/lib/market/types";
export function Sparkline({
  bars,
  large = false,
}: {
  bars: Bar[];
  large?: boolean;
}) {

  const points = bars.slice(large ? -250 : -30);
  if (points.length < 2) return <span className="small"><T text="No price history"/></span>;
  const w = large ? 800 : 120,
    h = large ? 220 : 36,
    min = Math.min(...points.map((b) => b.close)),
    max = Math.max(...points.map((b) => b.close)),
    range = max - min || 1;
  const coordinates = points
    .map(
      (b, i) =>
        `${((i / (points.length - 1)) * (w - 8) + 4).toFixed(2)},${(h - 4 - ((b.close - min) / range) * (h - 8)).toFixed(2)}`,
    )
    .join(" ");
  const positive = points.at(-1)!.close >= points[0].close;
  return (
    <svg
      className={large ? "price-chart" : "sparkline"}
      role="img"
      aria-label={`${points.length} daily closing prices; ${positive ? "up" : "down"} over this period`}
      viewBox={`0 0 ${w} ${h}`}
    >
      <polyline
        points={coordinates}
        fill="none"
        stroke={positive ? "#19715a" : "#ae5146"}
        strokeWidth={large ? 2 : 1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
function MarketTile({ticker,label,initial}:{ticker:string;label:string;initial?:import('@/lib/market/types').Price}){
const p=useMarketPrice(ticker,initial),{t,language}=useLanguage();return <div className="market-tile"><span className="eyebrow">{t(label)}</span><div><strong>{ticker}</strong><b>{money(p?.price)}</b><span className={(p?.change_percent??0)<0?'negative':'positive'}>{change(p?.change_percent)}{p?.change_percent!=null?'%':''}</span></div><span className="small"><T text="IEX · "/>{p?easternDate(p.as_of,language):'—'}</span></div>;}
export function MarketStrip({data}:{data:StockData[]}){const {t:ui}=useLanguage();
return <><section className="market-strip" aria-label={ui("US market ETF proxies")}>{[['SPY','S&P 500 ETF'],['QQQ','Nasdaq-100 ETF'],['DIA','Dow Jones ETF']].map(([ticker,label])=><MarketTile key={ticker} ticker={ticker} label={label} initial={priceFor(data,ticker)}/>)}<p className="market-footnote"><T text="ETF proxies for market context · IEX prices, not index values or consolidated US volume."/></p></section><LiveMarketStatus/></>;}
function StockRow({c,initial,watched,signedIn,available}:{c:Company;initial?:import('@/lib/market/types').Price;watched:boolean;signedIn:boolean;available:boolean}){
const p=useMarketPrice(c.ticker,initial);return <tr><td><Link href={'/stocks/'+c.ticker}><strong>{c.ticker}</strong><span className="small">{c.name}</span></Link></td><td>{p?<Sparkline bars={p.bars}/>:<span className="small">—</span>}</td><td>{money(p?.price)}</td><td className={(p?.change??0)<0?'negative':'positive'}>{change(p?.change)}</td><td className={(p?.change_percent??0)<0?'negative':'positive'}>{change(p?.change_percent)}{p?.change_percent!=null?'%':''}</td><td><FollowButton ticker={c.ticker} initial={watched} signedIn={signedIn} available={available} variant="star" returnPath={'/stocks/'+c.ticker}/></td></tr>;}
export function StockTable({
  companies,
  data,
  watched,
  signedIn,
  available = true,
}: {
  companies: Company[];
  data: StockData[];
  watched: Set<string>;
  signedIn: boolean;
  available?: boolean;
}) {

  return (
    <div className="stock-table-scroll">
      <table className="stock-table">
        <thead>
          <tr>
            <th><T text="Symbol"/></th>
            <th><T text="30-session trend"/></th>
            <th><T text="Price"/></th>
            <th><T text="Change"/></th>
            <th><T text="% Change"/></th>
            <th>
              <span className="sr-only"><T text="Watchlist"/></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c=><StockRow key={c.ticker} c={c} initial={priceFor(data,c.ticker)} watched={watched.has(c.ticker)} signedIn={signedIn} available={available}/>)}
        </tbody>
      </table>
      <p className="small table-caption"><T text="USD · price change against the previous IEX daily close. Open a stock to see its price timestamp and data source."/></p>
    </div>
  );
}
export function ArticleList({ items }: { items: Article[] }) {
 const {t:ui,language}=useLanguage();

  return (
    <div className="headline-list">
      {items.map((a) => (
        <article className="headline-row" key={a.id}>
          <div className="headline-meta">
            <span className="eyebrow">
              {a.source} · {ui(a.category)}
            </span>
            <time className="small">{easternDate(a.published_at,language)}</time>
          </div>
          <h3>
            <Link
              href={
                a.analysis_id ? `/news/${a.analysis_id}` : `/articles/${a.id}`
              }
            >
              {a.title}
            </Link>
          </h3>
          <p>{a.excerpt}</p>
          <div className="headline-bottom">
            <div>
              {a.tickers.map((t) => (
                <Link className="ticker" href={`/stocks/${t}`} key={t}>
                  {t}
                </Link>
              ))}
            </div>
            <Link
              className="source"
              href={
                a.analysis_id ? `/news/${a.analysis_id}` : `/articles/${a.id}`
              }
            >
              {a.analysis_id ? <T text="Read with AI context →"/> : <T text="Read update →"/>}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
