# Clearstock: learning through US companies

## Product decision

The daily return reason is learning five small concepts and understanding them in a real company. Homepage news streams and shared company-filing explanations were competing with this purpose. Keep those sources accessible in their relevant context rather than repeat them on the home page.

Primary navigation: Today, Stocks, News, Notebook, plus the existing profile avatar and assistant.

- Today: five personal AI learning ideas, followed by followed companies. Anonymous visitors see five clearly labeled editorial previews. The vocabulary library is collapsed below the primary content.
- Stocks: the six existing companies; company/ticker search, industry and All stocks/My watchlist filters combine. Stars remain the same database-backed watchlist. Following a company brings it to Today.
- Company detail: overview, news and financials remain. Overview highlights three vocabulary entry points. The News tab starts with up to two relevant saved SEC filing explanations, followed by original-source updates. Overview news is limited to two updates.
- News: an optional separate research page with existing source, topic, company and time filters. No duplicated news feed on Today.
- Notebook: one destination for saved terms, learning articles, starred chats and personal notes. Conversations remain automatically retained in the assistant, and starring puts one in Notebook.

## Learning loop

Read a daily idea → open its company exercise → inspect a financial figure and its reporting period → select an unfamiliar term for an explanation → save knowledge to Notebook → rate helpfulness. Stored ratings and saved topics inform the next day's choices.

Daily articles and editorial vocabulary pages now include company practice links, prioritising followed companies. The exercise is qualitative and uses existing live/company financial pages; it does not assert that a selected period contains every possible metric. Definitions are learning content, not buying/selling prompts.

## Search contract

Home search covers the site's editorial vocabulary library (English and the reviewed Chinese translations), and the available company's ticker/name/industry. It does not search the web, news, private Notebook writing, or arbitrary model-generated text. Empty results explain the supported search and suggest concrete words.

Stocks search covers company names and tickers. Industry labels are the existing directory categories, not a claim of GICS classification. My watchlist requires authentication. Filter state is in the URL, and reset/back navigation remounts the form using the current query.

## Compatibility and cost

- Existing `/learn` links redirect to `/#today`; `/learn?view=saved` redirects to saved articles in Notebook. Article and vocabulary detail routes remain valid.
- `/watchlist` redirects to `/stocks?view=watchlist`.
- Existing stored concept bookmarks resolve to their vocabulary detail pages instead of the retired library page.
- Daily generation uses the existing private, metered `/api/ai/daily` flow. It generates on first authenticated visit for a New York day and language and reuses the stored set. No additional background or per-page model generation has been introduced.
- Existing prompts, generated text, scores, collection ownership and RLS remain. This release requires no database migration.
- Remove From/To chart sliders; preserve range presets, wheel/button zoom, drag/keyboard pan and reset. Remove redundant News & filings badge.

## Next iteration

Keep the next feature small: one comprehension question after a lesson, with an explanation of the answer and a short review of previously saved words. Evaluate return visits, reading completion, successful term explanations and revisits to saved knowledge before adding more sections. These progress measures and quiz are future work, not part of this release.
