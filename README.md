# CTR — Calling Team Records

CTR is a private team CRM workspace deployed at https://nottybuddy.github.io/CTR/.

## Workspace
- **Group Chat:** shared CRM notes, search/date filters, reactions and live updates.
- **Personal Notes:** each member's notes; CTR admin can review them for team oversight.
- **Direct Chat:** private agent-to-agent conversations; CTR admin can inspect team conversations from the Agents Dashboard.
- **Follow-ups:** shared callback queue with pending/completed status.
- **Agents Dashboard:** agent-wise activity counts and, for the CTR admin account, conversation and activity audit.
- **AI-powered CRM Assistant:** authenticated CTR members can send shorthand, Hindi, Hinglish or English call details to GPT-6.2 Sol through a server-side Vercel function; it returns a professional CRM note, group update and clarification flags.

## Backend and access
The frontend uses Supabase Auth and the Supabase project configured at the top of `app.js`. The browser must use only the project's publishable/anon key; never place a service-role key in client code.

The database schema and row-level-security policies are documented in `supabase-schema.sql`. That file is a reference/migration script; changing it in GitHub does not automatically apply SQL to the live Supabase database. Do not rerun the full schema against a live database without reviewing the statements and current schema first.

The app currently presents a sign-in form for provisioned accounts. It does not provide public self-service sign-up. Password reset uses the GitHub Pages project URL as the Supabase redirect target; ensure that URL is allowed under Supabase Authentication → URL Configuration.

## Deployment
GitHub Pages publishes the `main` branch root. The `.nojekyll` file is included so static assets are served without Jekyll processing. The Pages deployment and Playwright browser checks run through GitHub Actions.

## Browser tests
The Playwright workflow checks:
- Public page, CSS/JS assets, and sign-in form.
- Desktop and mobile horizontal overflow.
- Authenticated agent navigation and Direct Chat contact selection (requires `CTR_TEST_EMAIL` and `CTR_TEST_PASSWORD` repository Actions secrets).
- Authenticated admin agent audit and conversation drill-down (requires `CTR_ADMIN_TEST_EMAIL` and `CTR_ADMIN_TEST_PASSWORD` secrets).

Use dedicated test accounts. Do not put passwords in source files or commit them. Authenticated tests are skipped when their secrets are absent; a green run without those secrets verifies only public-page and layout checks, not real message send/receive.


## AI assistant deployment
The GPT-powered CRM assistant API is deployed on Vercel at `https://ctr-ai-assistant-notty-buddy.vercel.app/api/crm-assistant`. It verifies the caller's Supabase session before calling Vercel AI Gateway. The model is `openai/gpt-6.2-sol`; the gateway credential stays server-side and is never exposed to the browser. The AI Gateway currently advertises $5 monthly starter credits for users who have not purchased credits; usage beyond available credits is billable. The GitHub Pages frontend calls this Vercel API, so the assistant requires both deployments to be available.
