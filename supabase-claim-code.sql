alter table public.startellever_teams
add column if not exists claim_code text;

create index if not exists startellever_teams_claim_code_idx
on public.startellever_teams (claim_code);
