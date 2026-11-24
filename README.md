# CTR — Calling Team Records

CTR is a private team CRM workspace deployed at https://nottybuddy.github.io/CTR/.

## Workspace
- **Group Chat:** shared CRM notes, search/date filters, reactions and live updates.
- **Personal Notes:** each member's notes; CTR admin can review them for team oversight.
- **Direct Chat:** private agent-to-agent conversations; CTR admin can inspect team conversations from the Agents Dashboard.
- **Follow-ups:** shared callback queue with pending/completed status.
- **Agents Dashboard:** agent-wise activity counts, date filters, activity chart and, for the CTR admin account, conversation audit and CSV export.

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



## CRM drafting (zero-cost mode)
The Group Notes page includes a browser-side shorthand organizer for preparing a group update and CRM entry. It does not call a paid AI API or require an API key. It is a deterministic helper, not a hosted ChatGPT model; ambiguous shorthand is flagged for human confirmation. The CRM drafting panel is shown only in Group Notes.



## CRM note privacy
The Group Notes CRM Assistant runs its small language model in the browser/device. Customer prompts are not sent to Gemini, OpenAI, an AI gateway, or another inference provider. First use downloads model files from the configured public model host; this is not fully offline on first use. Do not add third-party AI API keys or remote inference fallbacks. The small model can make mistakes, so review generated notes and confirm ambiguous details before sharing.


## Chat history and pagination
- Group Notes, Personal Notes and Direct Chat load the newest 50 records first. Use the in-chat **Load older** control to retrieve earlier records in additional 50-row pages.
- Unread badges use exact database counts rather than only the records currently loaded in the browser.
- Direct-message and note edits remain subject to the existing row-level-security policies. Agents cannot clear or delete shared chat history; message deletion remains Admin-only.

## Notifications
- The notification centre stores only the recipient, actor, notification type, record reference, generic title/body and timestamps. It deliberately does not copy customer note text, phone numbers or private message contents into notifications.
- Apply `supabase-notifications-centre.sql` once in Supabase SQL Editor to create the notification table, recipient-only RLS policies, insert triggers and Realtime publication. GitHub deployment alone cannot apply database SQL.
- Each signed-in user can read, mark read and delete only their own notification rows. New group notes, direct messages and follow-ups generate recipient-specific notifications.

## Admin export
- The Agents Dashboard shows **Export CRM data (Admin)** only for the CTR Admin account.
- The export is generated in the browser as a CSV after authenticated Supabase queries. RLS remains the data-access boundary; no service-role key or third-party export service is used.
- The file contains group notes, personal notes, direct messages and follow-ups. It may include customer contact details and must be stored and shared as confidential data.

## Theme
- The header theme control switches between dark and light workspace surfaces. The existing CTR logo and ambient page background remain unchanged.
- The selected theme is stored locally per signed-in account and browser.
