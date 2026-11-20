# CTR — Calling Team Records

A two-space CRM notes workspace:
- **Group Notes:** shared timeline, persisted in Supabase and synced live across signed-in users.
- **Personal Notes:** private open-call, callback and follow-up notes. RLS ensures each user can access only their own notes.
- **Fixed chat colour:** each user chooses one colour once. Database uniqueness prevents two users taking the same colour; no update policy allows changing it later.

## Configure Supabase
1. Create a Supabase project.
2. Run `supabase-schema.sql` in **SQL Editor**.
3. Copy the Project URL and publishable key (or legacy anon key) from **Project Settings → API**.
4. Replace the two placeholders at the top of `app.js`. Never use a service-role key in frontend code.
5. In **Authentication → URL Configuration**, add your GitHub Pages URL to allowed redirect URLs.
6. Enable Realtime for `ctr_group_notes` and `ctr_personal_notes` in Database → Replication if the SQL publication commands were not applied.
7. Deploy `main` from `/(root)` in GitHub Pages.

## Access
Create accounts using CTR's sign-up screen. For a controlled team, disable public sign-ups after the required accounts are created or use an invite-only process. Configure email confirmation and SMTP as required.

## Important
The frontend is not connected until valid Supabase URL and publishable/anon key are configured and the SQL is run. Personal note privacy and the one-time unique colour rule are enforced by database Row Level Security and constraints, not merely by the UI.