alter table people add column if not exists first_name text;
alter table people add column if not exists last_name text;
alter table people add column if not exists nickname text;

update people
   set first_name = coalesce(first_name, split_part(name, ' ', 1)),
       last_name  = coalesce(last_name, nullif(substr(name, length(split_part(name, ' ', 1)) + 2), ''))
 where first_name is null;

alter table people drop constraint if exists people_avatar_style_check;
alter table people drop column if exists avatar_style;
alter table people drop column if exists avatar_seed;
alter table people drop column if exists avatar_options;
