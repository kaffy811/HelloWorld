# New-user avatar upload

The previous form rejected original files over 2 MB and uploaded directly through the browser Supabase session. The new form accepts JPEG/PNG/WebP originals up to 10 MB, decodes and resizes them in the browser to at most 512 px, then submits the prepared image and names together to POST /api/profile. This keeps the request below Vercel and the existing private Storage limits; no bucket limits, grants or RLS policies are widened.

The server checks same-origin and authenticated user identity, trims/allowlists the three name fields, validates actual image bytes, corrects orientation, strips metadata and stores WebP in the authenticated user's private avatars folder. Profile updates use the same authenticated Supabase client and existing RLS. If saving the profile fails, only the newly uploaded file is rolled back. No existing user's avatar or onboarding state is reset.

Selection shows a preview, a preparing state, a cancel-selected-photo action and an explicit reminder to select Next/Save profile. The photo and names are saved together; the next screen loads the saved avatar. Invalid images show a message beside the photo. Photos are optional, and continuing without a selected photo retains any saved avatar. HEIC, SVG, GIF and unreadable formats are not accepted.

## Reproduction

1. Use a newly registered account and open onboarding (existing incomplete users can return to /onboarding?edit=1).
2. Choose a valid PNG/JPEG/WebP larger than 2 MB and smaller than 10 MB. It should preview without a size error and show the save reminder.
3. Fill all names and select Next. It should enter learning preferences; return to the profile step or refresh to confirm the saved image persists.
4. Cancel a selected photo and continue, confirming the optional flow works. Try an invalid image and confirm a clear error without changing the saved profile.
5. Run npm test, npm run test:db, npm run lint, npm run build and TEST_ORIGIN=<the project deployment> npm run test:http.

## Acceptance

A synthetic new auth account began with an empty profile. An actual browser uploaded a 5,891,895-byte PNG through the new form; the saved image was 118,488-byte WebP at 512×512. Next navigated to learning preferences, the profile step loaded the saved photo afterward, and the private signed image returned HTTP 200. The browser test used an isolated localhost hostname without changing the owner's real account/session. Chrome's automation file upload permission was unavailable, so the in-app browser completed the upload instead; this tooling restriction does not apply to ordinary site users.

73 unit tests and 35 PostgreSQL migration/RLS scenarios passed. The additional database scenario verifies new users can modify only their own avatar/profile and that anonymous/other users cannot read, forge or delete another user's private photo. Production verification is performed with the same temporary test account, then only that fixture account and its photos are removed.
