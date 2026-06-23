create table if not exists public.startellever_friend_rooms (
  code text primary key check (char_length(code) between 4 and 6),
  status text not null default 'lobby' check (status in ('lobby', 'drafting', 'complete')),
  host_player_id uuid,
  current_round integer not null default 1 check (current_round between 1 and 11),
  current_pick_index integer not null default 0 check (current_pick_index >= 0),
  current_season text,
  season_draw_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.startellever_friend_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.startellever_friend_rooms(code) on delete cascade,
  team_name text not null check (char_length(team_name) between 1 and 18),
  formation text not null check (formation in ('4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '4-4-2')),
  order_index integer not null check (order_index between 0 and 7),
  lineup jsonb not null,
  created_at timestamptz not null default now(),
  unique (room_code, order_index)
);

create table if not exists public.startellever_friend_picks (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.startellever_friend_rooms(code) on delete cascade,
  friend_player_id uuid not null references public.startellever_friend_players(id) on delete cascade,
  round_no integer not null check (round_no between 1 and 11),
  pick_index integer not null check (pick_index >= 0),
  season text not null,
  player_id text not null,
  player_key text not null,
  player_name text not null,
  slot_id text not null,
  role text not null,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (room_code, player_key),
  unique (room_code, round_no, pick_index)
);

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.startellever_friend_players'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%order_index%';

  if constraint_name is not null then
    execute format('alter table public.startellever_friend_players drop constraint %I', constraint_name);
  end if;

  alter table public.startellever_friend_players
    add constraint startellever_friend_players_order_index_check
    check (order_index between 0 and 7);
end $$;

alter table public.startellever_friend_rooms enable row level security;
alter table public.startellever_friend_players enable row level security;
alter table public.startellever_friend_picks enable row level security;

drop policy if exists "friend rooms are public read" on public.startellever_friend_rooms;
drop policy if exists "friend rooms are public insert" on public.startellever_friend_rooms;
drop policy if exists "friend rooms are public update" on public.startellever_friend_rooms;
drop policy if exists "friend players are public read" on public.startellever_friend_players;
drop policy if exists "friend players are public insert" on public.startellever_friend_players;
drop policy if exists "friend players are public update" on public.startellever_friend_players;
drop policy if exists "friend picks are public read" on public.startellever_friend_picks;
drop policy if exists "friend picks are public insert" on public.startellever_friend_picks;

create policy "friend rooms are public read"
on public.startellever_friend_rooms for select
using (true);

create policy "friend rooms are public insert"
on public.startellever_friend_rooms for insert
with check (true);

create policy "friend rooms are public update"
on public.startellever_friend_rooms for update
using (true)
with check (true);

create policy "friend players are public read"
on public.startellever_friend_players for select
using (true);

create policy "friend players are public insert"
on public.startellever_friend_players for insert
with check (true);

create policy "friend players are public update"
on public.startellever_friend_players for update
using (true)
with check (true);

create policy "friend picks are public read"
on public.startellever_friend_picks for select
using (true);

create policy "friend picks are public insert"
on public.startellever_friend_picks for insert
with check (true);
