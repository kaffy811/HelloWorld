import { adminClient, generationConfigured } from "../lib/news/admin.mjs";
import { generateSaved } from "../lib/news/generation.mjs";
import {
  selectAnnualFacts,
} from "../lib/news/validation.mjs";
import {filingDocument,documentPassages} from "../lib/news/documents.mjs";
import {currentMarket,quoteEvidence} from "../lib/market/live.mjs";
const forms = new Set(["8-K", "10-Q", "10-K"]);
export function filingCandidates(submissions, now = new Date()) {
  const r = submissions?.filings?.recent;
  if (!r) return [];
  return (r.accessionNumber || [])
    .map((accession, i) => ({
      accession,
      form: r.form[i],
      document: r.primaryDocument[i],
      date: r.filingDate[i],
      accepted: r.acceptanceDateTime?.[i],
    }))
    .filter(
      (f) =>
        forms.has(f.form) &&
        /^\d{10}-\d{2}-\d{6}$/.test(f.accession) &&
        /^[\w.-]+\.html?$/i.test(f.document) &&
        new Date(f.date) <= now &&
        now - new Date(f.date) < 30 * 86400000,
    )
    .slice(0, 2);
}
async function officialJson(url) {
  return JSON.parse(await officialText(url, 8000000));
}
async function officialText(url, limit) {
  const u = new URL(url);
  if (
    !["www.sec.gov", "data.sec.gov"].includes(u.hostname) ||
    u.protocol !== "https:"
  )
    throw new Error("Invalid official source.");
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.SEC_USER_AGENT,
      "Accept-Encoding": "gzip, deflate",
    },
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error("SEC request failed with status " + res.status);
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new Error("SEC document exceeds the processing limit.");
    }
    chunks.push(value);
  }
  // Sequential access deliberately stays well below SEC's fair-access ceiling.
  await new Promise((resolve) => setTimeout(resolve, 500));
  return Buffer.concat(chunks).toString("utf8");
}
export async function sync({ ticker = null, limit = 12 } = {}) {
  if (
    (ticker && !/^[A-Z.]{1,12}$/.test(ticker)) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 12
  )
    throw new Error("Use --ticker=AAPL and --limit=1 (limit must be 1–12).");
  if (!generationConfigured())
    throw new Error(
      "Configure the free AI model and server database access before syncing.",
    );
  if (!process.env.SEC_USER_AGENT || !process.env.SEC_USER_AGENT.includes("@"))
    throw new Error(
      "SEC_USER_AGENT must identify the application and a contact email.",
    );
  const admin = adminClient();
  const { data: companies, error } = await admin
    .from("companies")
    .select("ticker,name,sector,summary,learning_question,source_url,cik")
    .eq("market", "US")
    .not("cik", "is", null)
    .order("ticker");
  if (error) throw new Error("US news database migration is required.");
  await admin
    .from("generation_runs")
    .update({ status: "failed", error_code: "interrupted" })
    .eq("status", "reserved")
    .lt("created_at", new Date(Date.now() - 15 * 60000).toISOString());
  let liveQuotes={};try{liveQuotes=(await currentMarket(admin)).quotes||{};}catch{/* Explicitly report a missing snapshot. */}
  const report = { companies: 0, attempted: 0, saved: 0, failed: 0 };
  const selected = (companies || []).filter(
    (company) => !ticker || company.ticker === ticker,
  );
  if (ticker && !selected.length)
    throw new Error("This US ticker is not configured for SEC sync.");
  for (const company of selected) {
    if (report.attempted >= limit) break;
    report.companies++;
    try {
      const submissions = await officialJson(
        `https://data.sec.gov/submissions/CIK${company.cik}.json`,
      );
      const candidates = filingCandidates(submissions);
      let facts = {};
      try {
        facts = await officialJson(
          `https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`,
        );
      } catch {
        /* Evidence explicitly reports missing financial context. */
      }
      for (const filing of candidates) {
        if (report.attempted >= limit) break;
        try {
          const key = `sec:${company.cik}:${filing.accession}`;
          // Previously published source versions are shared by all visitors.
          const { data: existing } = await admin
            .from("news_items")
            .select("id")
            .eq("source_key", key)
            .maybeSingle();
          if (existing) {
            const { data: done } = await admin
              .from("analysis_versions")
              .select("id")
              .eq("news_id", existing.id)
              .eq("is_public", true)
              .limit(1);
            if (done?.length) continue;
          }
          report.attempted++;
          const source = `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${filing.accession.replaceAll("-", "")}/${filing.document}`;
          const doc = await filingDocument(admin,source,{fetchMissing:true});
          if(!doc)throw new Error("Official document unavailable.");
          const excerpt = doc.full_text.slice(0,14000);
          if (excerpt.length < 200)
            throw new Error("Insufficient source text.");
          const asOf = filing.accepted || `${filing.date}T23:59:59Z`;
          const annual = selectAnnualFacts(facts, asOf);
          const evidence = [
            ...documentPassages(doc,company.name+" "+filing.form,12000),
            {
              id: "company",
              label: "Company business introduction",
              url: company.source_url,
              text: company.summary,
            },
          ];
          for (const [i, f] of annual.entries())
            evidence.push({
              id: `financial-${i}`,
              label: `${f.label} · annual reported period`,
              url: `https://www.sec.gov/Archives/edgar/data/${Number(company.cik)}/${f.accession.replaceAll("-", "")}/`,
              text: `${f.label}: ${f.value} ${f.unit}. Annual period ${f.start} to ${f.end}; filed ${f.filed}. This is annual data, not quarterly data. Source tag ${f.tag}.`,
            });
          const quote=quoteEvidence(company.ticker,liveQuotes[company.ticker]);if(quote)evidence.push(quote);
          evidence.push({
            id: "limitations",
            label: "Data availability",
            url: null,
            text:
              (quote?"Timestamped current IEX price and volume are included; not consolidated US data or historical event-time reaction. No causal price attribution is supported. ":"Market snapshot unavailable; no observed price inference is supported. ")+"The full original is cached with its hash; AI reads bounded retrieved passages, not every line. " +
              (!annual.length
                ? "No comparable annual financial facts were available at the evidence cutoff."
                : ""),
          });
          const { data: item, error: saveError } = await admin
            .from("news_items")
            .upsert(
              {
                ticker: company.ticker,
                source_key: key,
                title: `${company.name}: ${filing.form} filing`,
                event_type: filing.form,
                source_url: source,
                published_at: asOf,
                evidence,
              },
              { onConflict: "source_key" },
            )
            .select("id")
            .single();
          if (saveError) throw new Error("Unable to save source.");
          await generateSaved({
            admin,
            company,
            evidence,
            kind: "news",
            newsId: item.id,
            dataAsOf: asOf,
            language: "en",
          });
          report.saved++;
        } catch (e) {
          report.failed++;
          console.error(
            company.ticker +
              ": " +
              (e instanceof Error ? e.message : "processing failed"),
          );
        }
      }
    } catch (e) {
      report.failed++;
      console.error(
        company.ticker +
          ": " +
          (e instanceof Error ? e.message : "source unavailable"),
      );
    }
  }
  console.log(JSON.stringify(report));
  if (report.failed) process.exitCode = 1;
  return report;
}
if (process.argv[1]?.endsWith("sync-us-news.mjs"))
  sync({
    ticker:
      process.argv.find((arg) => arg.startsWith("--ticker="))?.slice(9) || null,
    limit: Number(
      process.argv.find((arg) => arg.startsWith("--limit="))?.slice(8) || 12,
    ),
  }).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
