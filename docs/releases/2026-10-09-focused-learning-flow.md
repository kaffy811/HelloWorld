# Focused learning release

- Removed the ambiguous homepage search, redundant lesson assistant action, learning source panels and generic company-link exercise.
- Consolidated conversation history in Chat, including older single-answer follow-ups and old Notebook-link redirects. No chat records are deleted.
- Notebook now contains terms, learning articles and personal notes. The floating robot has a visible Chat label.
- News source scope is a compact note alongside the existing original-report link.
- Stored prompts, outputs, rating APIs and row-level security remain intact; no database migration is required.

Validation: lint, production build, unit tests, read-only public HTTP checks and authenticated browser checks. Quiz/review placement is a product recommendation, not a newly implemented feature.
