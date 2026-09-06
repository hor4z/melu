alter table people drop constraint if exists people_avatar_style_check;
alter table people drop column if exists avatar_style;
alter table people drop column if exists avatar_seed;
alter table people drop column if exists avatar_options;
