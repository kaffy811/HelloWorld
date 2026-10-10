# Financial report currency and percentage spacing

SEC accounting tables often put a currency symbol or percent sign in a separate cell. The responsive reader distributed width across those cells, leaving the symbols far from their values.

The reader now combines adjacent currency/number and number/percent cells, preserving their combined column span. Blank currency cells use the same column mapping; existing headings, years, values and negative-number parentheses remain intact. Complex tables with row spans retain their source grid. Formatting runs on already sanitized cached HTML, so existing reports receive the correction without refetching, database changes or AI generation.

Validation:

- Five financial HTML tests pass, including cached-table column alignment, blank symbol rows, negative percentages, unchanged AI selection evidence, idempotence and complex-grid preservation.
- Lint and production build pass.
- Read-only comparison of all 120 cached reports (467 pages) confirms unchanged whitespace-normalized text and row column totals.
- Browser checks cover Apple's segment performance table and balance sheet. Currency symbols and percentages stay beside their values. At 390px, tables scroll horizontally within the page and the page itself does not overflow.
