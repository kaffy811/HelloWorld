// Versioned USD estimates, not a provider invoice. Never infer prices for an unknown model.
export const PRICE_VERSION = 'gemini-3.5-flash-lite-standard-2026-10-08';
export function aiEnabled(env = process.env) {
  return (env.AI_ENABLED ?? env.AI_FREE_TIER_ENABLED) === 'true';
}
function number(env, key, fallback, min, max, integer = false) {
  const n = Number(env[key] ?? fallback);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
    throw new Error(`Invalid ${key} configuration.`);
  return n;
}
export function aiLimits(env = process.env) {
  return {
    daily: number(env, 'AI_DAILY_LIMIT', 20, 1, 10000, true),
    userDaily: number(env, 'AI_USER_DAILY_LIMIT', 20, 1, 10000, true),
    minute: number(env, 'AI_REQUESTS_PER_MINUTE', 5, 1, 100, true),
    dailyBudget: number(env, 'AI_DAILY_BUDGET_USD', 0.25, 0, 100),
    totalBudget: number(env, 'AI_TOTAL_BUDGET_USD', 4.5, 0, 1000),
  };
}
export function aiPrices(model, env = process.env) {
  const mode = env.AI_BILLING_MODE ?? 'paid';
  if (!['paid', 'free'].includes(mode)) throw new Error('Invalid AI_BILLING_MODE configuration.');
  if (mode === 'free') return {billing_mode: mode, price_version: 'explicit-free-tier', input_per_million: 0, cached_per_million: 0, output_per_million: 0};
  const builtIn = model === 'gemini-3.5-flash-lite';
  if (!builtIn && (env.AI_PRICE_MODEL !== model || !env.AI_PRICE_VERSION))
    throw new Error('Configure a matching AI_PRICE_MODEL and AI_PRICE_VERSION before changing the paid model.');
  return {
    billing_mode: mode,
    price_version: builtIn ? PRICE_VERSION : env.AI_PRICE_VERSION,
    input_per_million: number(env, 'AI_INPUT_USD_PER_MILLION', builtIn ? 0.30 : NaN, 0, 1000),
    cached_per_million: number(env, 'AI_CACHED_USD_PER_MILLION', builtIn ? 0.03 : NaN, 0, 1000),
    output_per_million: number(env, 'AI_OUTPUT_USD_PER_MILLION', builtIn ? 2.50 : NaN, 0, 1000),
  };
}
const usd = n => Math.ceil(n * 1e9) / 1e9;
export function reservationCost(prompt, prices, imageCount = 0) {
  // Conservative byte estimate for text/schema plus an allowance for image tokenization.
  // This is an application safeguard, not a guaranteed provider billing ceiling.
  const input = Buffer.byteLength(JSON.stringify(prompt), 'utf8') + imageCount * 16384;
  const output = prompt.generation_config?.maxOutputTokens ?? prompt.max_output_tokens;
  if (!Number.isInteger(output) || output < 1 || output > 10000) throw new Error('Missing bounded AI output limit.');
  return usd((input * prices.input_per_million + output * prices.output_per_million) / 1e6);
}
export function usageCost(usage, prices) {
  const valid = n => Number.isSafeInteger(n) && n >= 0;
  if (!valid(usage.promptTokenCount) || !valid(usage.candidatesTokenCount)) return null;
  const input = usage.promptTokenCount, cached = usage.cachedContentTokenCount ?? 0;
  const output = usage.candidatesTokenCount, thinking = usage.thoughtsTokenCount ?? 0;
  if (![cached, thinking].every(valid) || cached > input) return null;
  // Some model versions omit the separate thought count; use total-token residual conservatively.
  const billedOutput = valid(usage.totalTokenCount)
    ? Math.max(output + thinking, usage.totalTokenCount - input)
    : output + thinking;
  return {input_tokens: input, cached_tokens: cached, output_tokens: output,
    thinking_tokens: Math.max(thinking, billedOutput - output),
    estimated_cost_usd: usd(((input - cached) * prices.input_per_million + cached * prices.cached_per_million + billedOutput * prices.output_per_million) / 1e6)};
}
export async function reserveMetered(admin, {ownerId, kind, key, prompt, imageCount = 0}) {
  const limits = aiLimits(), prices = aiPrices(prompt.model);
  const {data, error} = await admin.rpc('reserve_metered_generation', {
    p_owner: ownerId, p_kind: kind, p_key: key, p_prompt: prompt,
    p_limit: limits.daily, p_user_limit: limits.userDaily, p_minute_limit: limits.minute,
    p_daily_budget: limits.dailyBudget, p_total_budget: limits.totalBudget,
    p_reserve_cost: reservationCost(prompt, prices, imageCount), p_prices: prices,
  });
  if (error) throw new Error('AI quota storage is unavailable. Apply the AI metering migration.');
  return data?.[0];
}
export async function settleUsage(admin, runId, usage, {dispatched = true, httpStatus = null} = {}) {
  const {error} = await admin.rpc('settle_ai_usage', {
    p_run: runId, p_usage: usage, p_dispatched: dispatched, p_http_status: httpStatus,
  });
  if (error) throw new Error('AI usage could not be recorded; its budget reservation remains held.');
}
