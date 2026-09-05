-- How each block went: attempts, whether they got it right, and how long it took.
-- We used to store only the final answer, the poorest signal an activity produces.
alter table submissions add column if not exists steps jsonb not null default '{}';
