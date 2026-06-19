-- Run this after the Vercel /api/submit-score function is deployed
-- and SUPABASE_SERVICE_ROLE_KEY is configured in Vercel.
--
-- It keeps public read access to approved highscores, but prevents browser users
-- with the anon key from inserting rows directly into startellever_teams.

revoke insert on public.startellever_teams from anon;
revoke insert on public.startellever_teams from authenticated;

grant select on public.startellever_teams to anon;
grant select on public.startellever_teams to authenticated;

drop policy if exists "Players can submit teams" on public.startellever_teams;

drop policy if exists "Approved teams are visible" on public.startellever_teams;
create policy "Approved teams are visible"
on public.startellever_teams
for select
to anon, authenticated
using (approved = true);
