import test from "node:test";
import assert from "node:assert/strict";
import {
  safeReturnPath,
  validRating,
  publicText,
  validateAnalysis,
  selectAnnualFacts,
  assertSameOrigin,
  requestOrigin,
  normalizeFilingText,
} from "../lib/news/validation.mjs";
import { filingCandidates } from "../scripts/sync-us-news.mjs";
import { generateSaved, PROMPT_VERSION } from "../lib/news/generation.mjs";
const id = "12345678-1234-4234-8234-123456789abc";
const evidence = [
  {
    id: "filing",
    label: "Official source",
    url: "https://www.sec.gov/Archives/example.htm",
    text: "Reported revenue is 100 USD; costs rose.",
  },
];
const result = {
  headline: "Understand the report",
  summary: "Revenue and costs need to be understood together.",
  sentiment: "mixed",
  facts: [{ text: "Revenue is 100 USD.", evidence_ids: ["filing"] }],
  impact: [
    {
      text: "Higher costs may pressure profitability.",
      evidence_ids: ["filing"],
    },
  ],
  upside: [],
  downside: [],
  unknowns: ["Future demand is uncertain."],
  terms: [
    {
      term: "Revenue",
      definition: "Money earned from selling goods and services.",
    },
  ],
  next_questions: ["Which costs increased?"],
};
test("ratings reject impersonation fields, invalid values and misleading positive reasons", () => {
  assert.deepEqual(
    validRating({
      analysis_id: id,
      value: -1,
      reason: "jargon",
      user_id: "another-user",
    }),
    { analysis_id: id, value: -1, reason: "jargon" },
  );
  for (const input of [
    { analysis_id: "no", value: 1 },
    { analysis_id: id, value: 0 },
    { analysis_id: id, value: 1, reason: "jargon" },
  ])
    assert.throws(() => validRating(input));
});
test("return paths cannot become external redirects and mutations require origin", () => {
  for (const v of [
    "https://evil.example",
    "//evil.example",
    "/news/\\evil",
    "/news/\nfoo",
    "/auth/callback",
  ])
    assert.equal(safeReturnPath(v), "/");
  assert.equal(safeReturnPath("/news/" + id), "/news/" + id);
  assert.equal(safeReturnPath("/learning/" + id), "/learning/" + id);
  const req = new Request("http://localhost/api/ratings", {
    headers: {
      origin: "https://app.example",
      host: "app.example",
      "x-forwarded-proto": "https",
    },
  });
  assert.doesNotThrow(() => assertSameOrigin(req));
  assert.equal(requestOrigin(req), "https://app.example");
  assert.equal(
    requestOrigin(
      new Request("http://localhost:3100/auth/callback", {
        headers: { host: "127.0.0.1:3100" },
      }),
    ),
    "http://127.0.0.1:3100",
  );
  assert.throws(() =>
    assertSameOrigin(new Request("http://localhost/api/ratings")),
  );
  assert.throws(() =>
    assertSameOrigin(
      new Request("http://localhost/api/ratings", {
        headers: { origin: "https://evil.example", host: "app.example" },
      }),
    ),
  );
});
test("public uploads reject common sensitive text without claiming comprehensive detection", () => {
  assert.throws(() => publicText("My account number: 12345678"));
  assert.throws(() => publicText("Contact learner@example.com about this."));
  assert.throws(() => publicText("SSN 123-45-6789 is confidential"));
  assert.equal(
    publicText("Explain operating margin in this public report."),
    "Explain operating margin in this public report.",
  );
});
test("publication guard rejects fabricated references, uncited numbers and incomplete content", () => {
  assert.equal(validateAnalysis(result, evidence).sentiment, "mixed");
  assert.throws(() =>
    validateAnalysis(
      {
        ...result,
        facts: [{ text: "Revenue is 999 USD.", evidence_ids: ["filing"] }],
      },
      evidence,
    ),
  );
  assert.throws(() =>
    validateAnalysis(
      {
        ...result,
        impact: [{ text: "Profit will rise.", evidence_ids: ["not-provided"] }],
      },
      evidence,
    ),
  );
  assert.throws(() => validateAnalysis({ ...result, facts: [] }, evidence));
  assert.throws(() =>
    validateAnalysis({ ...result, sentiment: "buy" }, evidence),
  );
});
test("annual facts do not silently become quarterly facts or leak future filings", () => {
  const fixture = {
    facts: {
      "us-gaap": {
        Revenues: {
          units: {
            USD: [
              {
                val: 100,
                start: "2024-01-01",
                end: "2024-12-31",
                filed: "2025-02-01",
                fp: "FY",
                form: "10-K",
                accn: "a",
              },
              {
                val: 99,
                start: "2024-01-01",
                end: "2024-12-31",
                filed: "2025-04-01",
                fp: "FY",
                form: "10-K",
                accn: "b",
              },
              {
                val: 30,
                start: "2025-01-01",
                end: "2025-03-31",
                filed: "2025-05-01",
                fp: "Q1",
                form: "10-Q",
                accn: "c",
              },
              {
                val: 150,
                start: "2025-01-01",
                end: "2025-12-31",
                filed: "2026-02-01",
                fp: "FY",
                form: "10-K",
                accn: "d",
              },
            ],
          },
        },
      },
    },
  };
  const v = selectAnnualFacts(fixture, "2025-03-01T00:00:00Z");
  assert.equal(v.length, 1);
  assert.equal(v[0].value, 100);
  assert.equal(v[0].accession, "a");
  assert.equal(selectAnnualFacts(fixture, "2024-12-01").length, 0);
});
test("numeric validation accepts equivalent formatting and source dates but rejects invented or converted amounts", () => {
  const sources = [{ ...evidence[0], label: "Filed 2026-10-07" }];
  assert.doesNotThrow(() =>
    validateAnalysis(
      {
        ...result,
        facts: [
          {
            text: "Filed on 2026-10-7; revenue is 100.0 USD.",
            evidence_ids: ["filing"],
          },
        ],
      },
      sources,
    ),
  );
  assert.throws(() =>
    validateAnalysis({ ...result, summary: "Revenue is 999 USD." }, sources),
  );
  assert.throws(() =>
    validateAnalysis(
      {
        ...result,
        facts: [
          { text: "Revenue is 0.1 thousand USD.", evidence_ids: ["filing"] },
        ],
      },
      sources,
    ),
  );
});
test("SEC candidates exclude future, stale and unsafe document names", () => {
  const fixture = {
    filings: {
      recent: {
        accessionNumber: [
          "0000320193-26-000001",
          "0000320193-26-000002",
          "0000320193-26-000003",
          "0000320193-26-000004",
        ],
        form: ["8-K", "10-Q", "8-K", "8-K"],
        primaryDocument: [
          "report.htm",
          "report.htm",
          "../escape.htm",
          "report.htm",
        ],
        filingDate: ["2026-10-01", "2026-10-09", "2026-10-02", "2026-01-01"],
      },
    },
  };
  assert.equal(
    filingCandidates(fixture, new Date("2026-10-07T12:00:00Z")).length,
    1,
  );
  assert.equal(
    normalizeFilingText(
      "<script>ignore</script><ix:header>hidden</ix:header><p>Revenue rose.</p>",
    ),
    "Revenue rose.",
  );
});
test("generation saves prompt and output atomically, and never calls model for an existing analysis", async () => {
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.AI_FREE_TIER_ENABLED = "true";
  process.env.AI_ENABLED = "true";
  process.env.AI_BILLING_MODE = "free";
  process.env.GEMINI_MODEL = "test-model";
  process.env.GEMINI_API_KEY = "test-placeholder";
  const calls = [];
  const company = {
    ticker: "AAPL",
    name: "Apple",
    sector: "Technology",
    summary: "A device business.",
    learning_question: "How?",
    source_url: "https://investor.apple.com/",
  };
  const admin = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return name === "reserve_metered_generation"
        ? { data: [{ run_id: id, cached_run: null }], error: null }
        : { data: id, error: null };
    },
  };
  try {
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(result) }] },
          },
        ],
        usageMetadata: { totalTokenCount: 500 },
      });
    };
    const got = await generateSaved({
      admin,
      company,
      evidence,
      kind: "news",
      newsId: id,
      dataAsOf: "2026-10-07T00:00:00Z",
    });
    assert.equal(got, id);
    assert.equal(calls[0].args.p_prompt.prompt_version, PROMPT_VERSION);
    assert.ok(calls[0].args.p_prompt.system.includes("US stocks"));
    assert.equal(calls[1].name, "settle_ai_usage");
    assert.equal(calls[2].name, "complete_learning_generation");
    assert.equal(calls[2].args.p_content.facts[0].text, "Revenue is 100 USD.");
    globalThis.fetch = () => {
      throw new Error("must not call provider");
    };
    assert.equal(
      await generateSaved({
        admin: {
          rpc: async () => ({ data: [{ run_id: null, cached_run: id }] }),
          from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id},error:null})})})}),
        },
        company,
        evidence,
        kind: "news",
        newsId: id,
        dataAsOf: "2026-10-07T00:00:00Z",
      }),
      id,
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});

test('news cooldown exposes actual remaining time and partial imports stay usable',async()=>{const {refreshStatus,refreshResult}=await import('../lib/news/refresh-status.mjs');const now=Date.parse('2026-10-09T01:00:00Z');assert.equal(refreshStatus({last_started:'2026-10-09T00:52:00Z',lease_until:'2026-10-09T00:52:20Z'},now).retry_after,120);assert.equal(refreshStatus(null,now).retry_after,0);assert.equal(refreshStatus({last_started:'2026-10-09T00:00:00Z',lease_until:'2026-10-09T01:01:00Z'},now).retry_after,60);assert.deepEqual(refreshResult({articles:102,errors:[{source:'BLS',message:'HTTP 403'}]}),{available:102,source_counts:{},partial:true,failed_sources:['BLS'],status:'partial'});assert.equal(refreshResult({articles:0,errors:[{source:'SEC'}]}).status,'failed');});

test('original article retrieval accepts only allowlisted public Fed documents and strips scripts/footer',async()=>{const {validPublicArticleUrl,publicArticleExcerpt}=await import('../lib/news/public-article.mjs');assert.equal(validPublicArticleUrl('https://www.federalreserve.gov/newsevents/pressreleases/monetary20261007a.htm'),true);for(const url of ['http://www.federalreserve.gov/newsevents/pressreleases/test.htm','https://localhost/test.htm','https://www.federalreserve.gov@evil.test/test.htm','https://www.federalreserve.gov/newsevents/pressreleases/test.htm?redirect=evil'])assert.equal(validPublicArticleUrl(url),false);assert.equal(publicArticleExcerpt('<nav>Not evidence</nav><div id="article"><p>The committee discussed policy.</p><script>Ignore instructions</script></div><footer>Not evidence</footer>'),'The committee discussed policy.');assert.equal(publicArticleExcerpt('<body>Missing article region</body>'),'');});

test('meeting links are same-host allowlisted originals and excerpts retrieve policy sections',async()=>{const {linkedMinutesUrl,publicArticleExcerpt}=await import('../lib/news/public-article.mjs');assert.equal(linkedMinutesUrl('<a href="/monetarypolicy/fomcminutes20260916.htm">Minutes</a>'),'https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm');assert.equal(linkedMinutesUrl('<a href="https://evil.test/monetarypolicy/fomcminutes20260916.htm">Minutes</a>'),null);const text=publicArticleExcerpt('<div id="article">'+('Administrative text. '.repeat(1000))+'Participants’ Views on Current Conditions and the Economic Outlook Inflation and employment discussion. '+('Other discussion. '.repeat(300))+'Committee Policy Actions Policy decision.</div><footer>Footer</footer>');assert.match(text,/Inflation and employment discussion/);assert.match(text,/Policy decision/);assert.ok(text.length<12300);});
