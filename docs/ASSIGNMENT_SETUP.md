# Clearstock: assignment setup and acceptance

Continue the existing repository `kaffy811/HelloWorld`, Supabase project `gwzswxjscsksymvvhlfv`, and Vercel project `humor-project8/hello-world`.

## Implemented
- Public `/` queries the Supabase `companies` table, showing six company cards, empty and error states.
- `/login` starts Google OAuth with exactly `${window.location.origin}/auth/callback` (no custom query parameters).
- `/auth/callback` exchanges the returned code for a cookie-backed session and opens `/profile`.
- `profiles` has nullable first_name and last_name; an auth.users INSERT trigger creates the row. Existing users are backfilled.
- `/profile` validates the user on the server, prompts for missing names and supports name changes and private photo upload.
- `/notebook` requires a verified user and both names. It is a gated learning checklist, not yet a saved-notes feature.
- Avatars are files in a private Storage bucket, limited to JPEG/PNG/WebP, 2 MB. The relational table stores only the path. Own-user RLS protects profiles and photos.
- Existing `tech_stack` and `/test` remain intact.

## Environment variables
Keep the existing values in `.env.local` and Vercel. Never commit secrets:
```
NEXT_PUBLIC_SUPABASE_URL=<existing project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<existing publishable key>
```
The new auth clients also accept `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback. A publishable key is the current equivalent of the legacy anon key; neither is a server/admin secret. Do not use a service-role key in the frontend.

## Google OAuth: user configuration required
1. Open Google Cloud Console under your own account. Select/create the Google Cloud project for this coursework. This does not create another Supabase or Vercel project.
2. Open Google Auth Platform. Configure Branding (app name Clearstock, support email), Audience and contact details. If the app is External and in Testing, add the accounts that will test login, including the grader if appropriate. Test-user restrictions can block other accounts.
3. In Clients, create an OAuth client of type Web application. Credential creation and any consent/terms must be completed by the account owner.
4. Authorized JavaScript origins: `http://localhost:3000` and `https://hello-world-gold-eight.vercel.app`. Add the exact commit-deployment origin when testing that URL.
5. Authorized redirect URI in Google: `https://gwzswxjscsksymvvhlfv.supabase.co/auth/v1/callback`. This is Google's callback to Supabase, NOT your app callback.
6. In Supabase Authentication > Sign In / Providers > Google, enable Google and enter the Client ID and Client Secret from Google. Keep the Secret out of chat, Git and NEXT_PUBLIC variables.
7. Supabase Authentication > URL Configuration: Site URL `https://hello-world-gold-eight.vercel.app`; Redirect URLs `http://localhost:3000/auth/callback` and `https://hello-world-gold-eight.vercel.app/auth/callback`. Add the exact commit-deployment URL followed by `/auth/callback` after deployment. Avoid broad wildcards.
8. App redirectTo is already `/auth/callback`. Google/Supabase will add the authorization code themselves; do not manually append a next/returnTo parameter.

## Database
The initial migration in `supabase/migrations/202609290001_learning_profiles.sql` was applied to the existing project through SQL Editor. Do not rerun the initial migration blindly: policies and trigger are intentionally created once. Subsequent changes should use a new migration. No existing tech_stack data was removed.

## Acceptance checks
- Incognito: homepage shows six rows from Supabase; `/profile` and `/notebook` redirect to login.
- Start Google login; cancel/reject and confirm a readable error, then retry.
- First successful sign-in: a profiles row is present; names can be NULL initially, and Profile prompts for both names.
- Save names and reload; values persist. `/notebook` becomes accessible.
- Upload a small JPEG/PNG/WebP; reload and see the avatar. Oversized/unsupported files are rejected.
- A second user must not be able to read or edit the first user's profile or private images.
- Sign out, then revisit a protected URL: redirected to login.
- Verify the final commit-specific `*.vercel.app` URL in an unauthenticated browser. The Vercel dashboard URL is not a submission URL.

## Current scope
Plain-English company introductions are editorial learning examples, not current financial analysis. Multilingual content, AI research, company detail reports and saved research notes are future product work.

## References
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/social-login/auth-google
- Required class video: https://www.youtube.com/watch?v=996OiexHze0
