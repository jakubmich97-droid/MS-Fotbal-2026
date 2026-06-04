create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  match_date timestamptz not null,
  group_name text not null,
  home_team text not null,
  away_team text not null,
  home_flag text not null,
  away_flag text not null,
  result_home integer,
  result_away integer,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_name text not null,
  tip_home integer not null,
  tip_away integer not null,
  created_at timestamptz not null default now(),
  unique (match_id, player_name)
);
