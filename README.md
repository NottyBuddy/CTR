# CTR — Calling Team Records

CTR is a private team CRM workspace deployed at https://nottybuddy.github.io/CTR/.

## Workspace
- **Group Chat:** shared CRM notes, search/date filters, reactions and live updates.
- **Personal Notes:** each member's notes; CTR admin can review them for team oversight.
- **Direct Chat:** private agent-to-agent conversations; CTR admin can inspect team conversations from the Agents Dashboard.
- **Follow-ups:** shared callback queue with pending/completed status.
- **Agents Dashboard:** agent-wise activity counts and, for the CTR admin account, conversation and activity audit.
- **CRM Note Generator:** prepares a group-share note and a CRM-ready copy locally in the browser.

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
