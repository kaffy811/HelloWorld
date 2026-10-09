import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import Link from "next/link";
import type { Analysis } from "@/lib/news/types";
import { easternDate, impactLabels } from "@/lib/news/data";
export async function NewsCard({ analysis, saved = false,returnPath }: { analysis: Analysis; saved?: boolean;returnPath?:string }) {
  const {language,t}=await getTranslator();
  if (analysis.kind === "material") return null;
  const href = `/${analysis.kind === "news" ? "news" : "learning"}/${analysis.id}`+(returnPath?"?from="+encodeURIComponent(returnPath):"");
  return (
    <article className={`panel news-card ${saved ? "newly-saved" : ""}`}>
      {saved && <span className="saved-label"><T text="Just saved"/></span>}
      <div className="card-top">
        <Link href={`/stocks/${analysis.ticker}`} className="ticker">
          {analysis.ticker}
        </Link>
        <span className="small">
          {analysis.kind === "news" ? <T text="Official filing · AI explained"/> : <T text="Private follow-up answer · AI explained"/>}
        </span>
      </div>
      <Link href={href}>
        <h3>{analysis.language===language?analysis.content.headline:t("Company filing explanation")+" · "+analysis.ticker}</h3>
      </Link>
      <p>{analysis.language===language?analysis.content.summary:t("This saved AI version uses another language. Explain article creates a new answer in your system language.")}</p>
      <div className="impact-label">
        {t(impactLabels[analysis.content.sentiment])}
      </div>
      <div className="news-card-bottom">
        <time dateTime={analysis.created_at}><T text="Generated "/>{easternDate(analysis.created_at,language)}
        </time>
        <Link className="source" href={href}><T text="Read explanation ↗"/></Link>
      </div>
    </article>
  );
}
export function NewsEmpty({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <div className="panel empty-state">
      <span className="empty-mark" aria-hidden="true">
        ↗
      </span>
      <h3>
        {unavailable
          ? <T text="News explanations are temporarily unavailable"/>
          : <T text="Your next clear explanation starts here"/>}
      </h3>
      <p>
        {unavailable
          ? <T text="Please try again later. Company introductions and the learning library are still available."/>
          : <T text="Source-grounded explanations will appear here after analysis is complete. Explore a US company or learn a stock-market concept while you wait."/>}
      </p>
      <Link className="text-link" href="/#today"><T text="Explore the learning library →"/></Link>
    </div>
  );
}
