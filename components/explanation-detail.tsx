import {getTranslator} from "@/lib/i18n/server";

import {T} from "@/components/language-provider";
import {EvidenceContext} from "./evidence-context";
import { TextSelectionHelper } from "@/components/text-selection-helper";
import { concepts } from "@/lib/market/concepts.mjs";
import { EmojiFeedback } from "@/components/emoji-feedback";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analysisColumns, easternDate, impactLabels } from "@/lib/news/data";
import { UUID } from "@/lib/news/validation.mjs";
import type { Analysis, Claim } from "@/lib/news/types";
import { FollowButton } from "@/components/learning-actions";
import { BookmarkButton } from "@/components/bookmark-button";
import { ArticleAssistant } from "@/components/article-assistant";
export async function ExplanationDetail({
  id,
  section,
  saved = false,
}: {
  id: string;
  section: "news" | "learning";
  saved?: boolean;
}) {
 const {t:ui,language}=await getTranslator();
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_versions")
    .select(analysisColumns)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const a = data as Analysis;
  if (a.kind === "material") redirect("/notebook");
  const detailPath = `/${a.kind === "news" ? "news" : "learning"}/${id}`;
  if ((a.kind === "news") !== (section === "news")) redirect(detailPath);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: company },
    { data: totals, error: totalsError },
    { data: ownVote },
    { data: following, error: followingError },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("name,summary")
      .eq("ticker", a.ticker)
      .maybeSingle(),
    supabase.rpc("learning_rating_totals", { p_ids: [id] }),
    user
      ? supabase
          .from("content_feedback")
          .select("score")
          .eq("analysis_id", id)
          .eq("user_id", user!.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user ? supabase.from("watchlist").select("ticker").eq("user_id", user.id)
      .eq("ticker", a.ticker).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const {data: bookmarks} = user ? await supabase.from("knowledge_bookmarks").select("source_key").eq("user_id",user.id).eq("analysis_id",id) : {data:[]};
  const savedKeys = new Set((bookmarks||[]).map(b=>b.source_key));
  const c = a.content;
  const count = totals?.[0] || { helpful: 0, unhelpful: 0 };
  function claimSection(title: string, claims: Claim[]) {
    return (
      claims.length > 0 && (
        <section className="analysis-section">
          <h2>{ui(title)}</h2>
          <ul className="claim-list">
            {claims.map((claim, i) => (
              <li key={i}>
                {claim.text}
                <span className="citations">
                  {claim.evidence_ids.map((ref) => (
                    <a key={ref} href={`#evidence-${ref}`}>
                      [{ref}]
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )
    );
  }
  return (
    <>
      <div className="breadcrumb">
        <Link href={a.kind === "news" ? `/stocks/${a.ticker}/news` : "/notebook"}>
          {a.kind === "news" ? ui(`${a.ticker} news`) : <T text="Notebook"/>}
        </Link>
        <span>／</span>
        {a.kind === "news" ? <T text="News explanation"/> : a.kind === "followup" ? <T text="Follow-up answer"/> : <T text="Saved explanation"/>}
      </div>
      {saved && user?.id === a.owner_id && (
        <div className="panel saved-confirmation" role="status">
          <strong><T text="Your private answer has been saved."/></strong>
          <Link className="source" href="/notebook"><T text="View your notebook →"/></Link>
        </div>
      )}
      <article className="analysis-layout" data-readable="true">
        <div>
          <header className="analysis-heading">
            <span className="eyebrow">
              {a.ticker} · {a.kind === "news" ? <T text="NEWS EXPLANATION"/> : a.kind === "followup" ? <T text="FOLLOW-UP ANSWER"/> : <T text="SAVED EXPLANATION"/>} · {a.is_public ? <T text="PUBLIC"/> : <T text="PRIVATE"/>}
            </span>
            <h1>{a.language===language?c.headline:ui("Company filing explanation")+" · "+a.ticker}</h1>
            <p className="lead">{a.language===language?c.summary:ui("This saved AI version uses another language. Explain article creates a new answer in your system language.")}</p>
            <div className="analysis-meta">
              <span className="impact-label">{ui(impactLabels[c.sentiment])}</span>
              <span className="small"><T text="Generated "/>{easternDate(a.created_at,language)}
              </span>
            </div>
          </header>
          <EvidenceContext analysisId={id} ticker={a.ticker} signedIn={Boolean(user)}/><ArticleAssistant source={{kind:"analysis",id}} title={c.headline} signedIn={Boolean(user)} returnPath={detailPath}/>
          <details className="original-ai-version" open={a.language===language}><summary>{ui("Original saved AI version")} · {a.language==='zh-Hans'?'简体中文':'English'}</summary>
          {claimSection("What the source says", c.facts)}
          {claimSection("How this connects to the business", c.impact)}
          {claimSection("Potential benefits", c.upside)}
          {claimSection("Potential pressures", c.downside)}
          <section className="analysis-section">
            <h2><T text="Limits of this analysis"/></h2>
            <p className="small"><T text="These limitations reflect the evidence available when this version was generated."/></p>
            <ul className="claim-list">
              {c.unknowns.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          {c.terms.length > 0 && (
            <section className="analysis-section" id="key-ideas">
              <h2><T text="Learn the key ideas"/></h2>
              <dl className="term-list">
                {c.terms.map((t, i) => (
                  <div key={t.term}>
                    <dt><span>{t.term}</span></dt>
                    <dd>{t.definition}</dd>
                    <BookmarkButton selection={{analysis_id:id,section:"terms",index:i}} initial={savedKeys.has(`${id}:terms:${i}`)} signedIn={Boolean(user)} returnPath={detailPath}/>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="analysis-section">
            <h2><T text="Questions worth exploring"/></h2>
            <ul className="claim-list">
              {c.next_questions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="analysis-section sources-section">
            <h2><T text="Original generation context"/></h2>
            <p className="small"><T text="Evidence cutoff: "/>{easternDate(a.data_as_of,language)}<T text=". AI interpretations are conditional explanations of business impact."/></p>
            {a.evidence.map((e) => (
              <details id={`evidence-${e.id}`} key={e.id}>
                <summary>{e.label}</summary>
                <p>{e.text}</p>
                {e.url && (
                  <a
                    href={e.url}
                    className="source"
                    target="_blank"
                    rel="noopener noreferrer"
                  ><T text="Open source ↗"/></a>
                )}
              </details>
            ))}
          </section>
          </details>
          <EmojiFeedback analysisId={id} initial={ownVote?.score??null} signedIn={Boolean(user)} returnPath={detailPath}/>
          {Number(count.helpful)+Number(count.unhelpful)>0 && <p className="small"><T text="Earlier two-choice ratings: "/>{Number(count.helpful)}<T text=" helpful · "/>{Number(count.unhelpful)}<T text=" not helpful."/>{totalsError ? <T text=" Totals are temporarily unavailable."/> : ""}</p>}
        </div>
        <aside className="analysis-sidebar">
          {user?.id === a.owner_id && (
            <Link className="button" href="/notebook"><T text="← Notebook"/></Link>
          )}
          <section className="panel">
            <span className="eyebrow"><T text="THE COMPANY CONNECTION"/></span>
            <h3>{company?.name || a.ticker}</h3>
            <p>{ui(company?.summary||"")}</p>
            <div className="company-card-actions">
              <Link className="source" href={`/stocks/${a.ticker}`}><T text="Explore "/>{a.ticker} ↗</Link>
              <FollowButton key={`${a.ticker}:${Boolean(following)}`} ticker={a.ticker}
                signedIn={Boolean(user)} initial={Boolean(following)} available={!followingError}
                variant="star" returnPath={detailPath} />
            </div>
          </section>
          {user?.id === a.owner_id && (
            <>
              <a className="source" href={`/api/analyses/${id}/prompt`}><T text="Download the generation prompt"/></a>
            </>
          )}
        </aside>
      </article>
      <TextSelectionHelper source={{kind:"analysis",id}} choices={[...c.terms.map((t,i)=>({text:t.term,definition:t.definition,provenance:"AI explanation",selection:{analysis_id:id,section:"terms",index:i},saved:savedKeys.has(`${id}:terms:${i}`)})),...concepts.map(c=>({text:c.term,definition:c.definition,provenance:"Learning library",selection:{concept:c.key}}))]} signedIn={Boolean(user)} returnPath={detailPath}/>
    </>
  );
}
