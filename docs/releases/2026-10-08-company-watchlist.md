# Company-card purpose, watchlist stars and learning-source clarity

## Product meaning

Company cards introduce a business, link to its overview and source-based updates, and let a signed-in user save it to a personal watchlist. A user-generated learning card explains supplied public material and remains separate from official SEC news. The public-material acknowledgement confirms that the input is suitable to submit; sharing is a separate explicit action.

The specified Apple test card contains the text “I like Apple” and an uploaded diagram about an A-share finance chat agent. That is not evidence of an Apple news event. The old generated output correctly mentioned some limits but also filled the card with general company and accounting background, making the material's purpose unclear.

## Changes

- Company cards have a 44px star control in their bottom-right footer. Empty/filled states correspond to absent/present user-owned watchlist rows. The same control appears in watchlist cards and company-context cards in explanation detail. Company overview also reflects the saved status.
- Initial state loads from the signed-in user's watchlist. Save/remove use the existing authenticated endpoint and RLS. Pending controls prevent duplicate clicks; failed writes show an error without falsely changing the state. Read failures disable the star and label its unavailable state. Guests receive a sign-in link.
- Watchlist writes invalidate affected server paths; the active page refreshes its state.
- Home copy distinguishes official SEC updates from shared learning cards. An empty community feed explains that new cards are private until shared and links to My learning.
- The learning form states its purpose and clarifies that the public-source checkbox does not publish the card. Sharing is labelled “Share to Community learning”; sharing invalidates the relevant pages.
- Material detail shows what a learning card means. The owner can expand the original text and screenshot. The image is read through the authenticated Supabase client and an expiring signed URL; other readers never receive this original-upload panel.
- Prompt version `us-learning-v4` includes content kind and instructs the model to distinguish opinions, unreadable/unrelated images, insufficient evidence and company background. Limits should be stated in the headline/summary and unknowns, rather than invented news or business pressure. This is a prompt improvement, not a deterministic relevance classifier. Existing cards and their prompts remain unchanged.

## Verification

- Lint, onboarding/news tests, production compilation and HTTP auth/origin tests pass.
- 16 isolated PostgreSQL/RLS scenarios pass, including watchlist ownership and private upload access; these tests did not touch the production database.
- Live browser saved AAPL with the home star, verified filled state after reload and AAPL in Watchlist, then removed it and restored the original empty-watchlist state.
- Owner source panel displayed the actual saved text; the registered screenshot loaded successfully (natural width 1536px).
- No new AI generation or publication was triggered to test this change. The revised prompt's effect on a newly generated answer remains to be tested with real materials.
- Local preview runs in the background on 127.0.0.1:3100. Changes are synced to the canonical project and workspace mirror; not yet deployed to Vercel.
