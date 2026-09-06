alter table people add column if not exists first_name text;
alter table people add column if not exists last_name text;
alter table people add column if not exists nickname text;

update people
   set first_name = coalesce(first_name, split_part(name, ' ', 1)),
       last_name  = coalesce(last_name, nullif(substr(name, length(split_part(name, ' ', 1)) + 2), ''))
 where first_name is null;
