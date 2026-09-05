-- Learning profile: what the person declared when they signed up.
-- The observed side is not stored here: it is recomputed from submissions so it never goes stale.
create table if not exists profiles (
  person_id  uuid primary key references people(id) on delete cascade,
  declared   jsonb not null default '{}',   -- pole -> 0..1
  answers  jsonb not null default '{}',   -- exactly what they picked, so the computation can be redone
  created_at      timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
