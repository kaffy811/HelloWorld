import assert from "node:assert/strict";

// Local or the project's exact Vercel domains; no sign-in or private database writes.
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3100";
const target=new URL(origin);
assert.ok(["127.0.0.1", "localhost"].includes(target.hostname) || (target.protocol==='https:' && (target.hostname==='hello-world-gold-eight.vercel.app' || /^hello-world-[a-z0-9-]+-humor-project8\.vercel\.app$/.test(target.hostname))));
for (const path of [
  "/api/bookmarks",
  "/api/ai/explain", "/api/ai/chat", "/api/ai/daily", "/api/ai/save", "/api/ai/feedback", "/api/news/refresh",
  "/api/notes", "/api/images", "/api/ai/comments",
  "/api/feedback",
  "/api/ratings",
  "/api/watchlist",
  "/api/learning",
  "/api/publish",
]) {
  for (const [source, status] of [
    [origin, 401],
    ["https://example.invalid", 403],
  ]) {
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { Origin: source, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, status, `${path} origin/auth guard`);
  }
}
const crossOrigin = await fetch(`${origin}/auth/return`, {
  method: "POST",
  headers: {
    Origin: "https://example.invalid",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ next: "/stocks/AAPL" }),
});
assert.equal(crossOrigin.status, 403);
for (const [next, expected] of [
  ["/stocks/AAPL", "/stocks/AAPL"],
  ["/learning/12345678-1234-4234-8234-123456789abc", "/learning/12345678-1234-4234-8234-123456789abc"],
  ["https://example.invalid", "/"],
]) {
  const response = await fetch(`${origin}/auth/return`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ next }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.ok(
    cookie?.includes(`learning_return=${encodeURIComponent(expected)}`),
  );
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
}
for(const path of ["/stocks/AAPL","/stocks/AAPL/news","/stocks/AAPL/financials","/learn","/learn/eps","/news","/news?category=policy&period=7d","/"]){
 const response=await fetch(origin+path);assert.equal(response.status,200,path+" public page");
 const html=await response.text();assert.match(html,/<html[^>]*lang="en"/,path+" defaults to English");assert.ok(!html.includes("Create learning card"),path+" retired learning-card UI");
}
for(const path of ["/api/ai/chat", "/api/images?id=11111111-1111-4111-8111-111111111111", "/api/ai/outputs/11111111-1111-4111-8111-111111111111", "/api/ai/conversations/11111111-1111-4111-8111-111111111111"]){const r=await fetch(origin+path);assert.equal(r.status,401,path+" private AI record");}
const unsupportedChart=await fetch(origin+"/api/stocks/UNKNOWN/chart?range=live");assert.equal(unsupportedChart.status,400);
const privateNote=await fetch(origin+"/api/notes?id=11111111-1111-4111-8111-111111111111");assert.equal(privateNote.status,401);
const privateConversation=await fetch(origin+"/api/analyses/11111111-1111-4111-8111-111111111111/export");assert.equal(privateConversation.status,401);
const context=await fetch(origin+"/api/stocks/AAPL/context");assert.equal(context.status,200);const packet=await context.json();assert.equal(packet.ticker,"AAPL");assert.ok(packet.financials.annual?.metrics);assert.match(packet.evidence_hash,/^[a-f0-9]{64}$/);
const prompt = await fetch(
  `${origin}/api/analyses/00000000-0000-4000-8000-000000000001/prompt`,
);
assert.equal(prompt.status, 401);
const callback = await fetch(`${origin}/auth/callback`, { redirect: "manual" });
assert.match(callback.headers.get('cache-control'), /no-store/);
const fallback = await fetch(`${origin}/?code=oauth-routing-test`, { redirect: "manual" });
assert.equal(fallback.status, 307);
assert.equal(new URL(fallback.headers.get('location'), origin).href, `${origin}/auth/callback?code=oauth-routing-test`);
assert.equal(callback.status, 307);
assert.equal(
  callback.headers.get("location"),
  `${origin}/login?error=callback`,
);
console.log(
  "PASS: HTTP public pages, authentication, origin and safe OAuth-return guards. No private database writes or Gemini calls.",
);
