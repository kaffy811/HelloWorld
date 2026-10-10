import assert from "node:assert/strict";

// Local or the project's exact Vercel domains; no sign-in or private database writes.
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3100";
const target=new URL(origin);
assert.ok(["127.0.0.1", "localhost"].includes(target.hostname) || (target.protocol==='https:' && (target.hostname==='hello-world-gold-eight.vercel.app' || /^hello-world-[a-z0-9-]+-humor-project8\.vercel\.app$/.test(target.hostname))));
for (const path of [
  "/api/bookmarks",
  "/api/ai/explain", "/api/ai/chat", "/api/ai/daily", "/api/ai/save", "/api/ai/feedback", "/api/news/refresh",
  "/api/notes", "/api/images", "/api/ai/comments", "/api/profile",
  "/api/feedback", "/api/product-feedback",
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
  ["/assistant?chat=12345678-1234-4234-8234-123456789abc", "/assistant?chat=12345678-1234-4234-8234-123456789abc"],
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
for(const path of ["/stocks","/stocks/AAPL","/stocks/AAPL/news","/stocks/AAPL/financials","/learn","/learn/eps","/feedback","/news","/news?category=policy&period=7d","/"]){
 const response=await fetch(origin+path);assert.equal(response.status,200,path+" public page");
 const html=await response.text();assert.match(html,/<html[^>]*lang="en"/,path+" defaults to English");assert.ok(!html.includes("Create learning card"),path+" retired learning-card UI");
}
for(const path of ["/api/ai/chat", "/api/ai/chat?list=1", "/api/news/refresh", "/api/images?id=11111111-1111-4111-8111-111111111111", "/api/ai/outputs/11111111-1111-4111-8111-111111111111", "/api/ai/conversations/11111111-1111-4111-8111-111111111111"]){const r=await fetch(origin+path);assert.equal(r.status,401,path+" private AI record");}
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

for(const path of ['/auth/verified','/auth/complete']){const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,307,path+' never shows Verified without a real user');assert.equal(new URL(r.headers.get('location'),origin).pathname,'/login');}

const returnPreparation=await fetch(origin+'/auth/return',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({next:'/notebook'})});
const preparedCookie=returnPreparation.headers.get('set-cookie').split(';')[0];
const backgroundHome=await fetch(origin+'/',{headers:{Cookie:preparedCookie}});
assert.ok(!/learning_return=/i.test(backgroundHome.headers.get('set-cookie')||''),'a homepage request must not erase an in-progress OAuth return path');

for(const authorization of ['', 'Bearer invalid']){const r=await fetch(origin+'/api/news/scheduled',{method:'POST',headers:{Authorization:authorization}});assert.equal(r.status,401,'scheduled importer must reject missing or forged token');}

// Navigation consolidation and combined stock filters: read-only, no model calls.
for(const [path,destination] of [['/learn','/#today'],['/learn?view=saved','/notebook?kind=terms'],['/watchlist','/stocks?view=watchlist']]){
 const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,307,path);assert.equal(new URL(r.headers.get('location'),origin).href,origin+destination);
}
const homeHTML=await (await fetch(origin+'/')).text();
assert.match(homeHTML,/Your six words for today/);assert.ok(!homeHTML.includes('Understand company updates'));assert.ok(!homeHTML.includes('Find a stock or news topic'));
assert.ok(!homeHTML.includes('learning-search'));
const staleSearch=await (await fetch(origin+'/?q=EPS')).text();assert.match(staleSearch,/Your six words for today/);assert.ok(!staleSearch.includes('Search results'));
const lessonHTML=await (await fetch(origin+'/learn/eps')).text();assert.ok(!lessonHTML.includes('Explain article'));assert.ok(!lessonHTML.includes('Learning source'));assert.ok(!lessonHTML.includes('TRY IT IN A REAL COMPANY'));assert.match(lessonHTML,/CHECK YOUR UNDERSTANDING/);
const chatRedirect=await fetch(origin+'/assistant?view=earlier',{redirect:'manual'});assert.equal(chatRedirect.status,307);assert.match(chatRedirect.headers.get('location'),/login/);
const stockSearch=await (await fetch(origin+'/stocks?q=AAPL')).text();assert.match(stockSearch,/href="\/stocks\/AAPL"/);assert.ok(!stockSearch.includes('href="/stocks/COST"'));
const emptyStocks=await (await fetch(origin+'/stocks?q=NOTACOMPANY731')).text();assert.match(emptyStocks,/No companies match these filters/);
const signedOutWatch=await (await fetch(origin+'/stocks?view=watchlist')).text();assert.match(signedOutWatch,/Sign in to follow companies/);
const stockHTML=await (await fetch(origin+'/stocks/AAPL')).text();assert.ok(!stockHTML.includes('Visible range start'));assert.ok(!stockHTML.includes('Visible range end'));assert.ok(!stockHTML.includes("Three terms to read these figures"));
const financialHTML=await (await fetch(origin+"/stocks/AAPL/financials")).text();assert.match(financialHTML,/Select an unfamiliar term in the financial summary/);assert.match(financialHTML,/href="\/stocks\/AAPL\/filings\//);
const companyNewsHTML=await (await fetch(origin+'/stocks/AAPL/news')).text();assert.ok(!companyNewsHTML.includes('News &amp; filings'));
console.log('PASS: learning-first home, directory search, private watchlist filter, retained detail routes and retired controls.');

const techStocks=await (await fetch(origin+'/stocks?sector=Consumer%20technology')).text();assert.match(techStocks,/href="\/stocks\/AAPL"/);assert.ok(!techStocks.includes('href="/stocks/MSFT"'));
const conflictingFilters=await (await fetch(origin+'/stocks?sector=Consumer%20technology&q=MSFT')).text();assert.match(conflictingFilters,/No companies match these filters/);
const chineseTerms=await (await fetch(origin+'/?q='+encodeURIComponent('现金流'),{headers:{Cookie:'clearstock_language=zh-Hans'}})).text();assert.match(chineseTerms,/href="\/learn\/cash-flow"/);assert.ok(!chineseTerms.includes('learning-search'));assert.match(chineseTerms,/今日六个金融词汇/);

const vocab=await fetch(origin+'/api/vocabulary?term=EPS');assert.equal(vocab.status,200);assert.equal((await vocab.json()).entry.selection.glossary,'eps');
const absent=await fetch(origin+'/api/vocabulary?term=NOTAFINANCIALTERM731');assert.equal((await absent.json()).entry,null);
const forbiddenVocab=await fetch(origin+'/api/vocabulary',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({term:'liquidity'})});assert.equal(forbiddenVocab.status,401);
const badVocab=await fetch(origin+'/api/vocabulary?term='+encodeURIComponent('x'.repeat(161)));assert.equal(badVocab.status,400);
const filtersHTML=await (await fetch(origin+'/news?source=sec')).text();assert.ok(!filtersHTML.includes('name="source"'));
assert.match(homeHTML,/Explain a financial word or sentence/);assert.match(homeHTML,/Financial vocabulary only/);
console.log('PASS: financial-only lookup, anonymous glossary access, authenticated AI boundary and removed source filter.');

// Stored public source fixtures: provider original, SEC original and origin-aware back navigation.
const originalNews=await (await fetch(origin+'/articles/c811fdc5-0de9-440e-b74d-c1b6428c962e?from=%2Fstocks%2FAAPL')).text();
assert.match(originalNews,/ORIGINAL SOURCE TEXT/);assert.match(originalNews,/Counterpoint Research/);assert.match(originalNews,/OLED Gains Ground/);assert.match(originalNews.match(/<div class="breadcrumb">[\s\S]*?<\/div>/)?.[0]||'',/href="\/stocks\/AAPL"/);assert.ok(!originalNews.includes('source summary only'));
const originalFiling=await (await fetch(origin+'/stocks/AAPL/filings/0000320193-26-000020')).text();assert.match(originalFiling,/ORIGINAL SOURCE TEXT/);assert.match(originalFiling,/UNITED STATES/);assert.match(originalFiling,/href="\/stocks\/AAPL\/financials"/);assert.match(originalFiling,/\?part=2/);
const laterFiling=await (await fetch(origin+'/stocks/AAPL/filings/0000320193-26-000020?part=2')).text();assert.match(laterFiling,/ORIGINAL SOURCE TEXT/);assert.ok(laterFiling!==originalFiling);
const invalidFiling=await fetch(origin+'/stocks/AAPL/filings/0000000000-00-000001');assert.equal(invalidFiling.status,404);
const hostileReturn=await (await fetch(origin+'/articles/c811fdc5-0de9-440e-b74d-c1b6428c962e?from=https%3A%2F%2Fevil.invalid')).text();assert.ok(!hostileReturn.includes('href="https://evil.invalid"'));
console.log('PASS: provider news and paginated SEC originals are readable in-site; stock return is retained; unknown reports and unsafe return links are rejected.');

const structuredReport=await (await fetch(origin+'/stocks/AAPL/filings/0000320193-25-000079?part=9')).text();
assert.match(structuredReport,/class="original-body filing-html"/);
assert.match(structuredReport,/<h2[^>]*><strong>CONSOLIDATED STATEMENTS OF OPERATIONS/);
assert.match(structuredReport,/<table>[\s\S]*?Total net sales[\s\S]*?416,161/);
const reportMarkup=structuredReport.match(/<div class="original-body filing-html">([\s\S]*?)<\/div><nav/)[1];
assert.ok(!/<(?:script|iframe|img|style)\b|\son\w+=|\sstyle=|\shref=/i.test(reportMarkup));
const clampedReport=await (await fetch(origin+'/stocks/AAPL/filings/0000320193-25-000079?part=999')).text();assert.match(clampedReport,/Page <!-- -->14<!-- --> of <!-- -->14/);
console.log('PASS: SEC original HTML preserves financial table values, strips active source markup and clamps reading pagination.');
