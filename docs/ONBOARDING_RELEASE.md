# Two-step onboarding implementation

## Delivered
- Google callback exchanges the authorization code at `/auth/callback`, then sends users to `/onboarding` for state-based routing.
- New users complete display name, first name and last name; avatar is optional.
- Persisted basics allow an interrupted user to resume at `/onboarding/preferences`.
- Two independent dropdowns contain ten language choices; experience/depth use radio tags, English uses four cumulative segments, goals use multi-select tags.
- Each question can be cleared. Save accepts partial responses. Skip all writes null/empty answers, keeps basic identity and completes onboarding.
- Completed users go to the homepage and can edit basics and preferences separately under Profile.
- Existing users with previously completed names are migrated as completed, with their first name as editable initial display name. Historical free-text preferences are retained in legacy columns.
- Server-side route guards cover homepage, profile, preferences and notebook. Supabase constraints and own-user RLS remain enabled.

## Validation
- `npm run lint` and `npm run build` pass.
- `node tests/onboarding.mjs` checks language/level validation, field allowlist, optional fields, goal deduplication and new/resumed/completed routing.
- Live database transaction test passed: defaults, basics required for completion, preference persistence, skip-all completion, level validation and cross-user isolation. Synthetic test records were rolled back.
- Local browser checked both forms and exercised language selection, segmented confidence, multi-goal selection and per-question clearing. A synthetic display-only preview was removed before commit.
- Full Google sign-in and avatar upload using a newly registered real account still need user acceptance; no real account was reset to force the flow.

## Product documentation
`docs/product/Clearstock_V1_PRD_zh.md` defines the future V1 scope and its acceptance criteria. Company reports, translated/personalized AI content, saved notes, Admin and Lab are future work, not features of this onboarding release.

## Manual acceptance
1. Use a Google account not previously registered with this Supabase project.
2. Sign in → step 1; fill display/first/last names; optionally upload an image.
3. Continue to step 2, choose some options, clear one, save; verify homepage.
4. Profile → Edit learning preferences; verify saved values and modify one.
5. Sign out and sign in; verify no repeat onboarding.
6. With a second new account, finish basics and choose Skip all; verify it reaches home and remains completed after login.
7. Interrupt after basics and sign back in; verify step 2 resumes.

The current UI is English; language preference selection does not yet translate company content. Vercel commit-specific callback URLs must be allowed in Supabase before submitting that deployment.
