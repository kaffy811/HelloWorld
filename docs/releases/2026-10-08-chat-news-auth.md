# Clearstock — chat history, news refresh and verified sign-in

## Behavior

- Google OAuth exchanges the code once and writes every session cookie on the callback redirect. `/auth/verified` checks the stored user with Supabase before showing Verified. Its Sign in link performs a fresh server navigation through `/auth/complete`, which checks the user and onboarding state. A query flag cannot fake verification. No additional OAuth request is made.
- `/assistant` is a standalone workspace. Its private sidebar lists all conversations with completed replies, including chats not starred in Notebook, with pagination. New chat starts a distinct context. General chat titles use the first question. Existing Notebook chat URLs redirect into this workspace. Ratings remain linked to the exact generated output; stars still control Notebook inclusion.
- Article drawers support drag/keyboard width adjustment, expand/shrink and minimize/close. Closing preserves the stored conversation. The composer uses a + attachment menu; images retain existing ownership, type/size and upload quotas.
- News refresh remains shared and limited to once every ten minutes. The UI exposes remaining time and last check; a partial import lists unreachable sources while preserving successful imports and earlier articles. Counts describe refreshed source records, not newly published articles. News updates do not invoke AI.
- Reader prompt version is `us-reader-v10`. Complete meeting dates and date ranges are checked before numeric claims; list ordinals do not count as financial figures. Unsupported financial amounts still fail validation. At most one separately metered repair is permitted, with its own prompt, usage and source validation. No rejected answer is promoted to evidence.
- Allowlisted Federal Reserve press releases supply bounded original excerpts, with a one-hour fetch cache, six-second timeout and 1.5 MB response limit. The exact evidence remains in the conversation/output snapshot for replay. This does not claim access to the full linked FOMC minutes or every section of a document.

## Reproduction

Run `npm test`, `npm run test:db`, `npm run lint`, `npm run build`. For deployed origin guards, run `TEST_ORIGIN=https://hello-world-gold-eight.vercel.app npm run test:http`.

Browser acceptance: article explanation and follow-up; emoji rating; history reload and separate new chat; + image menu; drawer resizing; Update news including cooldown; sign out → Google → Verified → Sign in → private Notebook. No new database migration or production secret changes are required.

## Limits

The BLS RSS source may return HTTP 403 from the hosting network. Its saved feed stays visible; the interface reports it separately. Scheduled ingestion is not enabled. Provider outages and configured budgets still apply to AI generation; stored history remains readable.
