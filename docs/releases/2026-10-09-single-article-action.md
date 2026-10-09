# One article AI entry point

Article reading now offers one primary action, **Explain article**, rather than asking beginners to choose between explanation and translation. The assistant uses the language selected in Profile. Users can request translation as a follow-up in the same conversation.

The shared ArticleAssistant change applies to every page embedding it. Stored conversations, ratings, and generation records remain available; backend translation support and selected-text tools are retained.

Validation: focused ESLint and production build passed. Verify on a signed-in news or article detail page: one Explain article button, no Translate article button, and the existing conversation drawer and follow-up composer.
