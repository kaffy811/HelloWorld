# Financial summary scoped to one filing

Previously, companyfacts were grouped by reporting dates and each metric used its latest filed version. A later 10-Q could supply comparative balance-sheet figures for the same date as a selected annual 10-K. The resulting page mixed filing sources even when the dates matched.

Financial sync now additionally stores report-specific periods keyed by accession. The financial summary chooses one filing for the selected frequency and report end, and restricts all income, balance and cash-flow metrics to that accession. Historical comparative periods from later filings are excluded. Missing metrics remain blank; cumulative cash flow is never substituted for quarterly cash flow. The chosen report is identified above the tables. An old-cache fallback also filters all metrics to one accession instead of filling missing values from another filing.

The six companies' public SEC financial caches were refreshed successfully using `npm run sync:financials`. Regular data sync maintains the new report-specific payload. No database schema or authorization changes are needed.

Validation:

- All 15 market tests pass, including comparative quarterly facts, amendment isolation, missing data and quarter/year-to-date separation.
- Production build and lint pass.
- Read-only checks cover 125 report views across six companies: every displayed metric matches the selected accession.
- Browser checks cover Apple 2025 annual, 2024 annual, 2026 quarterly and 2026 year-to-date selections. Annual 2025 metrics all link to 0000320193-25-000079; quarterly missing cash-flow values remain blank and cumulative values appear only in the year-to-date view.
