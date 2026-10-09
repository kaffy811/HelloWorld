export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const reasons = [
  "jargon",
  "too_long",
  "connection",
  "unanswered",
  "factual_error",
];
export function safeReturnPath(value) {
  if (
    typeof value !== "string" ||
    value.length > 300 ||
    !/^\/(?:news|articles|learning|stocks|materials|watchlist|notebook|learn|assistant)(?:[/?]|$)/.test(value) ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  return value;
}
export function validRating(input) {
  if (
    !input ||
    !UUID.test(input.analysis_id) ||
    ![1, -1].includes(input.value) ||
    (input.reason != null &&
      (input.value !== -1 || !reasons.includes(input.reason)))
  )
    throw new Error("Choose an available rating.");
  return {
    analysis_id: input.analysis_id,
    value: input.value,
    reason: input.reason || null,
  };
}
export function requestOrigin(request) {
  const host = request.headers.get("host") || new URL(request.url).host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    new URL(request.url).protocol.slice(0, -1);
  const incomingOrigin = `${protocol}://${host}`;
  const parsed = new URL(incomingOrigin);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("origin");
  return parsed.origin;
}
export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  const incomingOrigin = requestOrigin(request);
  // Exact deployment hosts let the submission URL work without allowing arbitrary previews.
  const deploymentOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter(host => typeof host === 'string' && /^[a-z0-9.-]+\.vercel\.app$/i.test(host))
    .map(host => `https://${host}`);
  const allowed = expected ? [new URL(expected).origin, ...deploymentOrigins] : [incomingOrigin];
  if (
    !origin ||
    !allowed.includes(origin) || origin !== incomingOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new Error("origin");
}
export function publicText(value, max = 12000) {
  if (
    typeof value !== "string" ||
    value.trim().length < 10 ||
    value.length > max
  )
    throw new Error("Use between 10 and " + max + " characters.");
  if (
    /\b\d{3}-\d{2}-\d{4}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:account\s*(?:number|no\.?|#)|routing\s*number|social\s*security)\s*[:#]?\s*\d+/i.test(
      value,
    )
  )
    throw new Error(
      "Remove personal information. Only public learning materials are supported.",
    );
  return value.trim();
}
export function safeSourceUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Invalid source URL.");
  return url.href;
}
function text(value, max = 1600) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Invalid analysis text.");
  return value.trim();
}
/** @returns {import('./types').AnalysisContent} */
export function validateAnalysis(value, evidence) {
  if (!value || !Array.isArray(evidence) || !evidence.length)
    throw new Error("Missing evidence.");
  const ids = new Set(evidence.map((e) => e.id));
  const claims = (v, required = false) => {
    if (!Array.isArray(v) || v.length > 6 || (required && !v.length))
      throw new Error("Missing analysis section.");
    return v.map((c) => {
      if (
        !Array.isArray(c.evidence_ids) ||
        !c.evidence_ids.length ||
        c.evidence_ids.some((id) => !ids.has(id))
      )
        throw new Error("Unsupported citation.");
      return { text: text(c.text), evidence_ids: [...new Set(c.evidence_ids)] };
    });
  };
  const strings = (v) => {
    if (!Array.isArray(v) || !v.length || v.length > 6)
      throw new Error("Missing explanation.");
    return v.map((s) => text(s, 800));
  };
  if (!["positive", "negative", "mixed", "unknown"].includes(value.sentiment))
    throw new Error("Invalid impact label.");
  if (!Array.isArray(value.terms) || value.terms.length > 6)
    throw new Error("Invalid terms.");
  const result = {
    headline: text(value.headline, 180),
    summary: text(value.summary, 1200),
    sentiment: value.sentiment,
    facts: claims(value.facts, true),
    impact: claims(value.impact, true),
    upside: claims(value.upside),
    downside: claims(value.downside),
    unknowns: strings(value.unknowns),
    terms: value.terms.map((t) => ({
      term: text(t.term, 100),
      definition: text(t.definition, 600),
    })),
    next_questions: strings(value.next_questions),
  };
  // Numbers in factual claims must occur in their cited evidence. This is a guard,
  // not proof that a citation entails the statement; editorial QA is still needed.
  for (const c of [
    ...result.facts,
    ...result.impact,
    ...result.upside,
    ...result.downside,
  ]) {
    const cited = evidence
      .filter((e) => c.evidence_ids.includes(e.id))
      .map((e) => `${e.label || ""} ${e.text}`)
      .join(" ")
      .replace(/[,，]/g, "");
    for (const n of c.text.replace(/[,，]/g, "").match(/\d+(?:\.\d+)?/g) ||
      []) {
      if (
        !(cited.match(/\d+(?:\.\d+)?/g) || []).some(
          (source) => Number(source) === Number(n),
        )
      )
        throw new Error("Unsupported number.");
    }
  }
  const allEvidence = evidence
    .map((e) => `${e.label || ""} ${e.text}`)
    .join(" ")
    .replace(/[,，]/g, "");
  const sourceNumbers = (allEvidence.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  for (const n of `${result.headline} ${result.summary}`
    .replace(/[,，]/g, "")
    .match(/\d+(?:\.\d+)?/g) || [])
    if (!sourceNumbers.includes(Number(n)))
      throw new Error("Unsupported number.");
  return result;
}
export function selectAnnualFacts(payload, cutoff) {
  const limit = new Date(cutoff).getTime();
  const output = [];
  for (const [label, tags] of Object.entries({
    Revenue: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ],
    "Net income": ["NetIncomeLoss"],
  })) {
    for (const tag of tags) {
      const values = payload?.facts?.["us-gaap"]?.[tag]?.units?.USD || [];
      const annual = values
        .filter(
          (v) =>
            v.form === "10-K" &&
            v.fp === "FY" &&
            Number.isFinite(v.val) &&
            new Date(v.filed).getTime() <= limit &&
            new Date(v.end).getTime() <= limit &&
            v.start &&
            (new Date(v.end) - new Date(v.start)) / 86400000 >= 300 &&
            (new Date(v.end) - new Date(v.start)) / 86400000 <= 400,
        )
        .sort(
          (a, b) =>
            b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed),
        );
      if (annual[0]) {
        const v = annual[0];
        output.push({
          label,
          value: v.val,
          unit: "USD",
          start: v.start,
          end: v.end,
          filed: v.filed,
          accession: v.accn,
          tag,
        });
        break;
      }
    }
  }
  return output;
}
export function decodeSourceText(text) {
  const named={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’',ndash:'–',mdash:'—',hellip:'…',bull:'•',copy:'©',reg:'®',trade:'™',times:'×',divide:'÷',euro:'€',pound:'£',yen:'¥',minus:'−'};
  return text.replace(/&(nbsp|amp|lt|gt|quot|apos|ldquo|rdquo|lsquo|rsquo|ndash|mdash|hellip|bull|copy|reg|trade|times|divide|euro|pound|yen|minus);/g,(_,code)=>named[code]);
}
export function normalizeFilingText(html, max = 14000) {
  // Remove HTML boilerplate and inline XBRL hidden metadata. This is input text,
  // never injected as HTML into the UI.
  return decodeSourceText(html
    .replace(/<(script|style|ix:header|ix:hidden)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) => {
      const n = /^x/i.test(code) ? parseInt(code.slice(1),16) : Number(code);
      return n>0 && n<=0x10ffff && !(n>=0xd800 && n<=0xdfff) ? String.fromCodePoint(n) : " ";
    })
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
