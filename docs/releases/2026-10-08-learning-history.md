# Learning card history fix — 2026-10-08

The user-created Apple card was saved successfully as a private material analysis. The signed-in history contains four explanations: two material cards and two private follow-up answers. A previously open history page showed only the earlier two answers, while a fresh request showed all four. The old page placed history below the full creation form and routed every explanation through `/news/[id]`.

## Result

- `/materials` opens the saved collection first, newest first, with the user's total count and pagination (12 records per page).
- Creation has a separate `Create a card` view at `/materials?view=create`.
- A successful material generation invalidates the history page and navigates to a fresh `/materials?saved=<id>` request. A success message links to the new card and highlights its record. The message only appears for a card returned by the current user's own-history query.
- User cards and follow-ups use `/learning/[id]`; SEC explanations retain `/news/[id]`. Both use one shared detail renderer.
- Legacy news links redirect to learning detail only after the normal user-scoped RLS read succeeds.
- Details identify Learning card / Follow-up answer and provide an explicit return to My learning. Follow-ups navigate to their saved answer with a link back to the collection.
- The new route participates in cookie refresh and safe login-return handling. Database policies and existing data were not changed.

## Validation

- Lint, existing onboarding/news tests and production build pass.
- Local HTTP auth/origin/return-cookie regressions pass, including login return to `/learning/[id]`.
- Live signed-in browser verified all four records, creation view, the specified card's new detail path, the old URL redirect and return link.
- Save-result view verified with the existing, genuinely saved card; no additional Gemini request or database insertion was made during this fix.
- Anonymous requests to that private card return 404 on both old/new paths and do not contain its title. A public filing requested through `/learning` redirects to its news path.
- Changes applied to `/Users/kaffy/IdeaProjects/hello-world` and the workspace mirror. Existing environment configuration was retained. No production deployment was performed for this fix.
