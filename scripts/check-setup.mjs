import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import {aiEnabled,aiLimits,aiPrices} from '../lib/ai/billing.mjs';

// Read configuration locally, but never print values or provider response bodies.
try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error("Cannot read local configuration.");
}
let failures = 0;
function check(label, ready, help = "") {
  console.log(
    `${ready ? "PASS" : "MISSING"}: ${label}${ready || !help ? "" : ` — ${help}`}`,
  );
  if (!ready) failures++;
  return ready;
}
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "SEC_USER_AGENT",
];
for (const name of names)
  check(
    name,
    Boolean(process.env[name]?.trim()),
    "Fill this field in .env.local; do not send its value to chat.",
  );
check(
  "AI generation explicitly enabled",
  aiEnabled(),
  "Set AI_ENABLED=true after reviewing the API project's billing status.",
);
check(
  "SEC contact header",
  /.+@.+/.test(process.env.SEC_USER_AGENT || ""),
  "Use Clearstock followed by a real contact email.",
);
const model = process.env.GEMINI_MODEL || "";
check(
  "Model ID format",
  /^[A-Za-z0-9._-]+$/.test(model),
  "Use the model ID only, without a models/ prefix.",
);
try{const limits=aiLimits();aiPrices(model);check('AI quotas, USD budgets and versioned prices',true);console.log('CONFIG: global/day='+limits.daily+'; user/day='+limits.userDaily+'; daily USD='+limits.dailyBudget+'; cumulative USD='+limits.totalBudget);}catch(e){check('AI quotas, USD budgets and versioned prices',false,e.message);}
let url;
try {
  url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch {
  /* already reported */
}
const safeUrl =
  url?.protocol === "https:" &&
  /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) &&
  !url.username &&
  !url.password;
check(
  "Hosted Supabase URL",
  safeUrl,
  "Use the project's HTTPS API URL, not the dashboard URL.",
);
if (safeUrl && process.env.SUPABASE_SECRET_KEY) {
  const key = process.env.SUPABASE_SECRET_KEY;
  let serverKey = key.startsWith("sb_secret_");
  if (!serverKey) {
    try {
      serverKey =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "service_role";
    } catch {
      /* invalid key */
    }
  }
  if (
    check(
      "Server key type",
      serverKey,
      "Use an existing secret key or legacy service_role key, never the publishable key.",
    )
  ) {
    const client = createClient(url.origin, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    });
    for (const [table, columns] of [
      ["companies", "ticker,market,cik"],
      ["profiles", "id,onboarding_completed_at"],
      ["news_items", "id"],
      ["learning_uploads", "id"],
      ["generation_runs", "id"],
      ["analysis_versions", "id"],
      ["ratings", "analysis_id"],
      ["watchlist", "ticker"],
      ["stock_data", "ticker,kind"],
      ["market_articles", "id"],
      ["knowledge_bookmarks", "id"],
      ["data_sync_runs", "id"],
      ["personal_notes", "id"],
      ["content_feedback", "id"],
      ["stock_chart_cache", "ticker,range"],
      ["ai_outputs", "id"], ["ai_conversations", "id"], ["ai_daily_sets", "owner_id"], ["ai_lesson_saves", "output_id"], ["ai_feedback", "output_id"], ["news_refresh_gate", "id"], ["market_refresh_state", "id"], ["filing_documents", "source_url"],
    ["user_images", "id"], ["ai_lesson_comments", "output_id"],
    ["ai_usage_ledger", "run_id,estimated_cost_usd,state"],
    ]) {
      const { error } = await client.from(table).select(columns).limit(0);
      check(
        `Database schema: ${table}`,
        !error,
        "Check the project/key and apply the US news migration once.",
      );
    }
    const publicClient = createClient(
      url.origin,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || key,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
        },
      },
    );
    const { error: rpcError } = await publicClient.rpc(
      "learning_rating_totals",
      {
        p_ids: [],
      },
    );
    check(
      "Rating totals function",
      !rpcError,
      "Check the migration and database access.",
    );
    const { data: bucket, error: bucketError } =
      await client.storage.getBucket("learning-materials");
    check(
      "Private learning storage",
      !bucketError &&
        bucket?.public === false &&
        Number(bucket?.file_size_limit) === 2097152,
      "Check the learning-materials bucket created by the migration.",
    );
  }
}
if (process.env.GEMINI_API_KEY && /^[A-Za-z0-9._-]+$/.test(model)) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`,
      {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(15000),
      },
    );
    const metadata = response.ok ? await response.json() : null;
    check(
      "Gemini key/model metadata access",
      response.ok &&
        metadata?.supportedGenerationMethods?.includes("generateContent"),
      "Check the key, model ID and API restrictions in AI Studio.",
    );
  } catch {
    check(
      "Gemini key/model metadata access",
      false,
      "Check network access and model configuration.",
    );
  }
}
console.log(
  "Read-only checks only: no AI content generated, no database rows changed. Model availability does not prove free quota or billing status.",
);
if (failures) process.exitCode = 1;

console.log("OPTIONAL: Alpaca IEX market data — " + (process.env.ALPACA_API_KEY_ID && process.env.ALPACA_API_SECRET_KEY ? "keys configured" : "not configured; SEC and official news work independently"));
