# BEA and Alpaca company news

## Result

BEA official RSS and the existing Alpaca account returned HTTP 200. The initial import refreshed 293 source records: SEC 72, Fed 30, BLS 1, BEA 40 and Benzinga via Alpaca 150. These are processed records, not 293 newly published stories. Alpaca has more pages; the importer intentionally retains only the latest 150 available records per run, revisiting the latest seven days. No AI calls are made during news ingestion.

## Data and reproduction

- BEA feed: https://apps.bea.gov/rss/rss.xml, linked by https://bea.gov/resources/for-developers. Official release title, summary, URL, publication time and collection time are stored.
- Alpaca endpoint: https://data.alpaca.markets/v1beta1/news. Read using the existing server credentials and the current US company directory. Store only provider-supplied headline/summary/link and configured stock associations. The publisher is labeled Benzinga via Alpaca. Full article bodies and images are not requested or copied. API access is confirmed; publication/reuse permissions should be reviewed before expanding commercial distribution.
- Stable provider IDs and source URLs are upserted. Invalid dates, future publication dates, unsupported publishers/hosts, unconfigured stock links, scripts and duplicates are rejected or normalized. The original publication time is retained when updated.
- Apply supabase/migrations/202610080008_news_sources.sql before import. It expands matched source/URL constraints and adds a source/date index; existing RLS stays intact. Only service_role can write imported news. Public readers can filter by source, topic, company, industry and time.
- Run npm run sync:data -- --news-only for a manual source import. This reads .env.local. No new API key is required. For future stocks, add them to the US companies directory; news symbol queries automatically follow that directory. Broader retention/backfill needs a separate cursor job rather than raising the bounded web request indefinitely.

## Scheduled updates

GitHub Actions news-refresh.yml is configured for every ten minutes, offset from the busiest hour boundary. GitHub schedules are best effort and may run late. This is periodic near-real-time aggregation, not an exchange-style instantaneous stream; provider entitlements/delivery may add delay.

The action POSTs to /api/news/scheduled using an encrypted NEWS_SYNC_TOKEN repository secret. The same token is a sensitive production Vercel environment variable. ENABLE_NEWS_SCHEDULE=true enables the repository action and the production status description. The runner has no database or Gemini keys. Missing/forged tokens return 401; the existing atomic shared reservation prevents overlapping/manual imports and enforces the ten-minute cooldown. A duplicate trigger returns a harmless skipped result. Each web import is bounded to a 45-second source budget under a 60-second function limit. Failed sources keep older rows and do not discard other successful imports.

Visitors with the News page open refresh visible results every minute; logged-in users check the last-import timestamp first. Hidden tabs do not poll. New page visits read the latest saved database records.

To disable scheduled ingestion, set the GitHub repository variable ENABLE_NEWS_SCHEDULE=false and the Vercel production variable to false, then redeploy. To rotate the trigger credential, update both secret stores together. Never commit .env.local or credentials.

## Acceptance

npm test, npm run test:db, npm run lint, npm run build, and TEST_ORIGIN=https://hello-world-gold-eight.vercel.app npm run test:http. Database scenarios verify that new source URLs match their publishers and visitors cannot insert rows. HTTP checks reject missing/forged scheduled credentials. Validate actual BEA/Alpaca imports, source filters, stock News and an AI explanation on a saved summary; inspect the workflow run and source counts.
