# Learning-first home and stock directory

Today now puts the existing daily five AI lessons and followed companies together. The repeated company-news/filing feed and market overview are removed from home; the matching SEC explanations remain on each stock's News tab. Stocks consolidates browsing and watchlist with combined industry, company/ticker and saved-only filters. Learn and Watchlist entry routes redirect to the new destinations, preserving detailed articles and private saved content.

Learning details include contextual company exercises, using followed companies where available. Overview adds revenue/EPS/cash-flow learning links and selected-text explanations for the financial snapshot. Chart sliders and the News & filings badge are removed; chart presets and zoom remain.

Validation: ESLint and production build, all 75 existing unit checks and onboarding checks. New read-only HTTP checks cover home vocabulary and company search, filter combinations and empty results, Chinese vocabulary search, anonymous watchlist access, legacy redirects and retired controls. Browser checks cover industry filtering, filter reset, 253→203→253 observation zoom/reset, and contextual lesson links.

No schema migration or new AI generation mode is needed. Stored daily batches, prompts, scores and collections use the existing authenticated flow. Quotas/provider availability still govern first daily generation; saved content remains readable.
