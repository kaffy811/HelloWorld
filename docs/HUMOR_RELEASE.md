# Laugh Lab assignment release

Continues kaffy811/HelloWorld (Next.js 16, Supabase SSR and Google OAuth) in an isolated checkout. Existing profile routes remain available. Home and login now focus on the humor assignment.

## Implemented and applied
- Migration 202610020001_humor.sql applied to gwzswxjscsksymvvhlfv on October 2, 2026.
- humor_images owns private objects; humor_captions references images; humor_votes references caption and auth user. Each vote is a new row. UNIQUE(user_id,caption_id) makes the first vote final; clients cannot edit/delete votes.
- Signed-in members see ready images and captions. Votes are private to their voter. Drafts remain private to their owner. No anonymous access to humor tables or storage.
- Upload validates size, MIME and file signature; accepts JPEG/PNG/WebP up to 3 MB. DB reservation enforces one attempt/minute and ten/day across instances.
- OpenAI vision produces a scene description, then a separate text-only call generates four funny captions. Both calls use gpt-4o-mini by default, overridable with OPENAI_CAPTION_MODEL. No API keys enter the browser.
- Atomic database function publishes image and four captions together. Failures mark reservation failed and attempt object cleanup; failed attempts count toward limits. Hard process termination can leave an unpublished private reservation/object; scheduled cleanup is a future operational improvement.
- Same-origin POST enforcement plus verified Supabase auth on both endpoints. Signed image URLs expire after one hour; reload refreshes them.
- All public tables have RLS enabled. Existing profile/avatar/company policies preserved; technology table writes revoked. Supabase-managed system schemas are left under Supabase's own access model.

## Required external settings
In Vercel hello-world Production environment add OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY as server-only secrets, then redeploy. Never prefix these with NEXT_PUBLIC. They were absent during verification. An OpenAI key with funded access to the selected vision model is needed. Service-role key must come from this Supabase project.
Google OAuth already exists. Supabase Redirect URLs must include the exact deployed origin plus /auth/callback for commit-specific login. Preserve the existing production callback.
Vercel Authentication, Password Protection and Trusted IP protection observed off on October 2, 2026.

## Verification
PASS: ESLint; production Webpack build including TypeScript; tests/humor-validation.mjs tests signatures and malformed model output.
PASS on live database, rollback-only two-user fixtures: anonymous vote/reservation denied; own vote succeeds; duplicate denied; impersonation denied; vote edit denied; client caption insert denied; other user's votes and unfinished images hidden; published captions visible; second user can rate same caption; all public tables have RLS.
Pending: real Google sign-in callback on new deployment; real Storage upload/download/cleanup, both OpenAI calls, persisted generation and browser voting, due to missing server-only secrets. Do not claim those passed.

Policy references: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/storage/security/access-control
