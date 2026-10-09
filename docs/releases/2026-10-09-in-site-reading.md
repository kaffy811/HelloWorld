# In-site source reading and simpler controls

News details display text supplied by Alpaca/Benzinga, alongside original Federal Reserve, BEA and BLS HTML extracted from allowlisted sources. SEC news and financial tables link to an in-site SEC original reader. Provider HTML is converted to plain text; it never executes in the browser. Long originals use pagination, and a selected phrase on a later page is included in bounded model evidence. The full report is available to the reader; AI receives only relevant passages, rather than claiming to read the complete report.

Alpaca ingestion now requests `include_content=true` and saves available bodies. Older articles can load their body from Alpaca using their verified provider ID, source URL and publication time. Requests have size/time limits and do not accept arbitrary source URLs. If a provider cannot return the original, the page explicitly distinguishes an unavailable original from its summary and offers retry.

Stock-origin links retain a validated `from` path, including original pagination. Article breadcrumbs return to the initiating stock view. Financial report routes resolve only stored server-written filing descriptors, rejecting arbitrary accessions and URLs. Financials shows a small highlighted selected-text instruction above the figures; the former three-term panel is removed.

Home vocabulary results have a reset/back button. Daily card language badges are removed. Chat no longer has image uploads or sends images to Gemini; the server rejects new image IDs. Stored historical chats and images remain readable. Notebook image uploads and avatars are unchanged. Notebook archive controls are removed; previously archived notes are included in the normal notes list.

## Reproduce and update

Apply `supabase/migrations/202610090011_news_original_body.sql` once. It adds bounded public provider text; existing public-read/server-write RLS remains unchanged.

- `npm run sync:data -- --feeds-only --news-only` refreshes provider news, including available full bodies.
- `npm run sync:originals` warms SEC documents for the same stored reports linked by the UI. `-- --ticker=AAPL` limits it to Apple. The cache lets Vercel serve originals when SEC rejects requests from a hosting network. No private user data is imported.
- `npm test`, `npm run test:db`, `npm run lint`, `npm run build` and `TEST_ORIGIN=http://127.0.0.1:3207 npm run test:http` reproduce the checks. Use a separately started server at that test origin.

## Validation

87 unit scenarios and 38 local PostgreSQL/RLS scenarios pass, with lint and production build passing. Public HTTP regression checks cover provider originals, SEC pagination, safe stock return and unknown report rejection. An isolated disposable account exercised real Gemini explanations from both a provider original and a SEC original, saving each selection to Terms. The same isolated workflow verifies image rejection and visibility of historically archived notes.

The production backfill saved 150 Alpaca news bodies, including the reported OLED MacBook story. SEC prewarming completed 120 documents with no failures, covering all 72 existing SEC news originals as well as current financial table reports. Provider outages and missing content remain possible; no unavailable source is presented as a complete original.
