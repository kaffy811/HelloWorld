# Clearstock — Understand US stocks

A beginner-friendly US-stock learning workspace built with Next.js, Supabase and Gemini. Production domain: https://hello-world-gold-eight.vercel.app/.

- Six stock pages with Overview, News and Financials; company watchlists and zoomable charts.
- Shared Alpaca IEX quotes refreshed every 15 seconds on visible pages; single-exchange observations, not consolidated US-market streaming. SPY/QQQ/DIA are ETF proxies.
- SEC originals cached with hashes; AI explanations use retrieved passages and timestamped evidence.
- Selection explanations/translation, financial glossary and article/general chat with image input.
- Private Notebook for saved terms, saved conversations and user-authored notes with images.
- Five personalized Learn articles in one cached daily batch; stars, five-level Emoji ratings and private comments.
- Profile controls interface and new-answer language; English is the default.
- Immutable prompts and output versions; authenticated mutations and RLS on all application tables.
- Configurable global/personal quotas, atomic budget reservations and a private AI cost ledger.

Learning Card creation and community publishing are retired. Historical records remain available. News → Update news performs a shared manual official-source refresh; scheduled jobs stay disabled until Actions secrets and their enable flags are configured.

## Setup and deployment

Use Node 22. Copy `.env.example` to `.env.local` and fill the same existing Supabase project, Gemini, SEC contact and optional Alpaca fields. Never commit real keys. Configure Vercel Production variables separately; local environment files are excluded from uploads.

Apply the SQL migrations in filename order to a fresh database. For an existing installation, apply only unapplied migrations. The metering migration is `202610080007_ai_metering.sql` and requires the previous migrations.

```bash
npm ci
npm run check:setup
npm run sync:data
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

Avoid starting a second server on an occupied port. For development use `npm run dev`.

Detailed quota configuration, USD estimates, schema and update instructions: [Vercel and AI metering guide](docs/releases/2026-10-08-vercel-ai-metering.md).

## Checks

```bash
npm run lint
npm test
npm run test:db
npm run build
# Run against the local preview, or set TEST_BASE_URL to a public deployment:
npm run test:http
```

Database tests use isolated PGlite; they do not alter production. HTTP checks test public routes and unauthorized writes without generating AI content.

## Data, usage and reproducibility

- `npm run sync:data`: SEC filings/companyfacts, official Fed/BLS news and optional IEX snapshots/history. No Gemini calls. `-- --news-only` updates news; `-- --prices-only` updates prices.
- `node --env-file=.env.local scripts/sync-us-news.mjs --limit=1`: optional bounded SEC-to-AI generation. Shared metering applies to this worker and website generation.
- `npm run report:ai`: read-only daily/cumulative cost estimates and unresolved reservations, with no prompts, user identities, images or keys in the report.
- `npm run replay:ai -- /absolute/path/to/downloaded-generation.json`: reproduce the saved validator check without calling Google.
- Every request retains its prompt/model/schema version, evidence, input hashes and output. Usage estimates include thinking tokens and failures that consumed tokens; uncertain requests retain a conservative budget hold.
- Estimates are not a provider invoice. The cumulative application budget begins when metering is installed and does not include prior requests or other Google projects.

Earlier product decisions and verification reports are preserved under `docs/product` and `docs/releases`. See [images, chat and course audit](docs/releases/2026-10-08-images-chat-course-audit.md) and [market data expansion plan](docs/releases/2026-10-08-live-data-and-language.md).
