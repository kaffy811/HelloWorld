# Formatted SEC originals — 2026-10-09

SEC original reading previously flattened the announcement into large text blocks. The reader now processes the official HTML into headings, paragraphs, lists and complete tables, with smaller typography and table scrolling on narrow screens. Source figures and wording remain original. Selected-text tools now offer explanation and term saving without a translation toggle.

## Reproduce and update

1. Install locked dependencies with `npm ci` (HTML parser: parse5 8.0.1).
2. Apply `supabase/migrations/202610090012_formatted_filing_reading.sql` once, after existing migrations. It adds bounded JSON reading pages and a parser version to the existing service-only cache; permissions remain unchanged.
3. Configure the existing Supabase server credentials and SEC contact user agent. Run `npm run sync:originals` to warm current reports for all companies, or append `-- --ticker=AAPL` for one company.
4. Run `npm run test`, `npm run test:db`, `npm run lint`, `npm run build`. Start the app and set `TEST_ORIGIN` for `npm run test:http`.
5. Parser changes that alter cached output must increment `FILING_READING_VERSION` and rerun the warmer. New official reports are processed on first reading and cached. Formatting uses no AI calls.

## Implementation and boundaries

`lib/news/filing-format.mjs` parses official markup and emits an HTML allowlist. Hidden XBRL metadata, scripts, images, links, embeds, event handlers and source styles are removed. Only bounded table spans and fixed display classes are retained. Inline visible XBRL values are preserved. Pagination keeps tables intact and is versioned with the cache. Unavailable upgrades can fall back to the existing readable plain original.

The HTML page and selected-text evidence are derived together. The selected page is sent to the explanation endpoint; the chosen phrase and surrounding passage remain bounded. Whole-report conversations can still retrieve broader original passages. Ratings, authentication, budget metering and historical translations remain compatible.

## Verification

- 90 unit tests passed, including malformed HTML safety, table values/spans, hidden metadata and pagination evidence.
- 39 PostgreSQL migration/RLS scenarios passed in the isolated test database, including cache bounds and service-only access.
- Lint and production build passed.
- Public HTTP checks passed for financial table HTML, safe markup and clamped pagination, alongside existing reader/auth/navigation tests.
- 120 existing official reports were successfully warmed with zero failures.
- Real Apple 2025 10-K verified on desktop and a 390 px mobile viewport: tables scroll inside the page without widening the document.
- Isolated authenticated test verified Gemini explanation of “Total net sales” from the financial table, matching original figures in the source snapshot, saving into Notebook Terms and rejecting a selection absent from the requested page. Synthetic account and its data were removed after testing; actual user content was untouched.

Deployment is released from the repository commit after these checks; the production alias is verified after Vercel reports Ready.
