# Auth assignment audit and learning preferences

## Requirement mapping
| Requirement | Implementation / evidence | Status |
|---|---|---|
| Same repository, Vercel, Supabase | kaffy811/HelloWorld; humor-project8/hello-world; original Supabase project | Done |
| profiles table linked to auth.users | UUID primary/foreign key, initial SQL migration | Done |
| Automatic row on first registration | AFTER INSERT trigger on auth.users; nullable-name trigger test passed | Done |
| Nullable first and last names | first_name / last_name allow NULL; form requests completion | Done |
| Own Google OAuth client | User configured credentials; public Auth settings confirms Google enabled; user reports successful login | Configured |
| Prompt for missing names | OAuth callback opens Profile; notebook checks trimmed first/last names | Done |
| Editable profile / uploaded photo | Form persists names, Storage file path, signed private image URL; real profile row has an avatar path | Implemented; user should confirm image reload visually |
| Gated route | /notebook and /profile verify user server-side; notebook also checks names | Done |
| /auth/callback | redirectTo is origin + /auth/callback, with no custom parameters; callback exchanges provider-added code | Done |
| Supabase packages | @supabase/ssr and @supabase/supabase-js | Done |
| RLS may be off | Permission to disable, not a requirement. We keep own-user RLS on | Compliant |
| No binary images in relational tables | Private avatars bucket; profiles.avatar_path contains only a path | Done |
| Unauthenticated deployment access | Previous commit-specific site returned 200 without cookies and showed six cards; verify latest deployment as well | Verified for prior deployment |
| Required video | Viewing cannot be inferred from software | User must complete |
| Course submission | No submission performed by the assistant | User must submit/confirm |

An OAuth authorization code appearing on the callback is part of OAuth itself. The app does not add a next/returnTo parameter. Navigating to Profile AFTER the callback exchanges the code is intentional and compatible with the callback requirement.

## Added optional fields
- first_language: free text (up to 80 characters, supports multiple first languages).
- reading_language: desired reading language, independent of first language.
- investing_experience: never / under 1 year / 1–3 / 3–5 / over 5 years.
- financial_english: beginner / basic / comfortable.
- explanation_depth: brief / guided / detailed.
- learning_goal: business / financial statements / news / risks.
- reading_minutes: 5 / 10 / 20.

All are nullable, can be skipped, edited or cleared, and inherit profile ownership policies. The update grant names the new columns explicitly. The initial first/last name requirement remains unchanged. No existing answers are inferred or populated automatically.

## What personalization means next
Use declared language for explanation language, experience together with comprehension checks for teaching depth, and reading time for progressive disclosure. Keep source facts, numerical definitions and risks consistent across users. Experience is not an ability or risk-tolerance score. Learning-goal selection can prioritize which section to introduce first.

Current release only collects and persists preferences. It does not translate cards, call an AI model, assess financial suitability, recommend stocks, or change company facts. No income, account balance, identity documents or brokerage credentials are collected.

## Verification for this change
- ESLint and production build passed.
- Parser checks: skipped/cleared fields become NULL; Unicode language accepted; reading time converts to number; invalid choice and excessive length rejected.
- Live SQL transaction tests: own-user update/readback, clearing answers, invalid reading time rejected by DB CHECK, cross-user update blocked. Test users and rows rolled back.
- Existing Google provider enabled; existing user profile and stored avatar path observed.
- End-to-end browser save/reload of new preferences still requires an authenticated user session.
