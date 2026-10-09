# Unified collections, product feedback and image follow-ups

Saved knowledge now has one destination: `/notebook`, with an All saved overview and filters for terms, learning articles, conversations and personal notes. The overview shows the latest five per section; individual sections retain pagination. Stocks remain in Watchlist. Save actions explicitly say Save to Notebook and link to the matching collection. The old `/learn?view=saved` link redirects to Notebook; existing saved content is preserved.

Today search describes its scope as Clearstock stocks/news, not web search. It currently filters the content loaded for that view. The six-stock table caption names the supported symbols and no longer contains the verbose broken-wrapping source explanation; quote timestamps/source labels remain on market/detail views.

Learning details keep emoji Rate and no longer contain the second lesson suggestion form. Existing lesson comments remain stored. Every page has a footer link to `/feedback`; the floating assistant does not cover the link. Feedback is submitted with `/api/product-feedback`, stored in `product_feedback`, then acknowledged with a thank-you view and home link. Signed-out users can read the page and sign in to submit.

## Data and permissions

Apply `supabase/migrations/202610090009_product_feedback.sql` after the previous migrations. It was applied to the existing production project through Supabase SQL Editor on October 9. Product suggestions are private, owner-readable and append-only. Anonymous/guest accounts and forged owners are rejected. Clients cannot set creation times, update or delete submissions. The database enforces five suggestions per rolling 24 hours. A client UUID prevents duplicate rows on retry. API requires verified authentication and same origin. Developer access uses the existing server/admin access; no email or message is sent automatically.

Only allowlisted learning preference labels are read from these suggestions for the next daily set; raw product-suggestion text is not sent to Gemini. Existing ratings continue to guide topic selection.

## Image behavior and evidence

The configured Gemini model was tested through the actual production `/api/images` and `/api/ai/chat` endpoints, not only a stub. It read a synthetic image's unique phrase and correctly identified three red circles. An actual follow-up also read the image correctly. Prompts, image hashes and generation outputs remain saved and the existing token/cost ledger meters these calls.

Image questions are available in the general AI assistant. Article chat removes its image picker and links there because its financial source validator is not appropriate for unverified image figures. Notebook and avatar image support are unchanged. In general chat, the current attachment stays visible in the composer for follow-ups and is restored from the last saved reply when reopening. Removing it sends an explicit empty image list and stops resending image bytes. The API restores previous image metadata only when the caller omits the image list; every retained image is rechecked for ownership and integrity. A revision retry matches the image IDs as well as the question, avoiding accidental reuse for another image.

## Reproduce

1. Apply the migrations, configure the existing Supabase/Gemini server variables and existing quota/pricing settings.
2. Run `npm run lint`, `npm test`, `npm run test:db`, `npm run build`.
3. Sign in to a test account. Save a term, star an AI lesson and a chat, and create a personal note. Confirm all four appear in Notebook and individual article search excludes unmatched titles.
4. Open the robot assistant. Attach a clear PNG/JPEG/WebP within the stated size limit, ask about its contents, then ask a follow-up. Reopen the chat and verify the attachment is still visible; remove it to stop image reuse.
5. Open Feedback from the footer, submit a suggestion, verify the thank-you view and return-home button. Verify one owned database row and no duplicate when retrying its UUID.
6. Run `TEST_ORIGIN=https://hello-world-gold-eight.vercel.app npm run test:http` after deployment. Check the production home caption, search scope and Feedback page in a signed-out browser.

Validation: lint, 75 unit tests plus onboarding checks, 36 migration/RLS scenarios and production build. Live synthetic-account tests verified actual image reading/follow-up, five generated lessons, stored ratings, all saved types, article filtering, successful feedback storage and idempotent submission. Test data uses a disposable synthetic account, never real user notes or photos.

Limits: image reading depends on visual clarity and provider availability. Attached financial figures are user-provided, not independently verified market data. Existing AI quota/budget limits still apply. New generation is not needed to read previously saved content.
