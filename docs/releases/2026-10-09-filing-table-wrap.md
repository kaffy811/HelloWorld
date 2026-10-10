# Financial table line wrapping — 2026-10-09

The original reader allowed wrapping at any character, which made financial table columns shrink until dates, page headings and amounts broke inside words or numbers. Tables now use normal word wrapping. Right-aligned financial values stay on one line with tabular digits, while date headers retain their original explicit line break between date and year. Narrow screens scroll the table within the page.

This is a CSS-only correction in `app/globals.css`. It needs no database migration, cache rebuild, parser-version change or AI calls. Reproduce with locked dependencies, `npm run lint`, `npm run build`, then open `/stocks/AAPL/filings/0000320193-25-000079?part=9`.

Verified the actual cached Apple 2025 10-K on desktop and at 390 px width: “Page” and “September” remain complete, date headers use the original two lines, and values including 35,934, 29,943 and 359,241 remain unbroken. Verified keyboard horizontal scrolling on mobile; the document width stays 390 px while the table scrolls inside its container. Lint and production build passed.

Deploy through the repository's existing Vercel integration and verify the production alias after Ready.
