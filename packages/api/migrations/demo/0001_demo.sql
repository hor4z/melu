-- Demo data (only with MELU_DEMO=1). One space, two groups, twelve learners.
--
-- The submissions are built so the dashboard has something real to say: the answers point at the
-- blocks that actually exist in each activity, and the spread of hits and times makes every signal
-- rule fire at least once — shines, misses, slow and dropout.
do $$
declare
  guide uuid; space uuid; g1 uuid; g2 uuid; a1 uuid; a2 uuid; a3 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid;
  learner uuid; opened timestamptz; submitted timestamptz;
  who jsonb; blocks jsonb; b jsonb; i int; idx int; hits int; minutes int; sub_status text;
  sub_answers jsonb; sub_steps jsonb; right_one boolean; assignment uuid; activity uuid; grp uuid;

  -- The self-grading blocks of each activity, with a right and a wrong answer for each.
  -- The shapes are the ones the runner stores: an index for choice, an array for multi,
  -- fill_in and order, and for match an array where position i holds the item matched to i.
  escape_blocks jsonb := '[
    {"id":"e3","right":1,           "wrong":0},
    {"id":"e4","right":11,          "wrong":9},
    {"id":"e5","right":["12","6"],  "wrong":["10","5"]},
    {"id":"e6","right":["Escribo lo que sé: triple + 5 = 26","Le saco el 5 a los dos lados: triple = 21","Divido por 3: el número es 7","Verifico: 7 × 3 + 5 = 26"],
               "wrong":["Divido por 3: el número es 7","Verifico: 7 × 3 + 5 = 26","Escribo lo que sé: triple + 5 = 26","Le saco el 5 a los dos lados: triple = 21"]},
    {"id":"e7","right":[0,1,2,3],   "wrong":[1,0,3,2]}]';
  challenge_blocks jsonb := '[
    {"id":"r3","right":3,     "wrong":0},
    {"id":"r4","right":7,     "wrong":5},
    {"id":"r5","right":3,     "wrong":5},
    {"id":"r6","right":[0,1], "wrong":[2,3]}]';
  robot_blocks jsonb := '[
    {"id":"b2","right":[0,2,3],"wrong":[0,1]},
    {"id":"b3","right":18,     "wrong":15},
    {"id":"b8","right":1,      "wrong":0}]';

  -- What happened to each learner. `escape`, `challenge` and `robot` are how many of that
  -- activity's self-grading blocks they got right; -1 means they opened it and never handed it in.
  roster jsonb := '[
    {"name":"Sofía",    "group":1,"escape":5,"challenge":4,"minutes":9},
    {"name":"Nico",     "group":1,"escape":4,"challenge":4,"minutes":22},
    {"name":"Valentina","group":1,"escape":-1,                        "minutes":31},
    {"name":"Mateo",    "group":1,"escape":1,"challenge":1,"minutes":58},
    {"name":"Lucía",    "group":1,"escape":5,               "minutes":19},
    {"name":"Benjamín", "group":1,"escape":2,"challenge":1,"minutes":27},
    {"name":"Emma",     "group":1,"escape":1,               "minutes":24},
    {"name":"Thiago",   "group":1,"escape":3,"challenge":3,"minutes":82},
    {"name":"Olivia",   "group":2,             "robot":3,  "minutes":21},
    {"name":"Julián",   "group":2,             "robot":2,  "minutes":26},
    {"name":"Martina",  "group":2,             "robot":1,  "minutes":33},
    {"name":"Bruno",    "group":2,             "robot":-1, "minutes":28}]';

begin
  select id into guide from people where email='horacio.rivero@educabot.com';
  if guide is null then
    insert into people(email, google_sub, name) values('horacio.rivero@educabot.com','dev:horacio.rivero@educabot.com','Horacio') returning id into guide;
  end if;
  if exists (select 1 from spaces where slug='school-demo') then return; end if;

  insert into spaces(name, slug, kind) values('Escuela 12 · Demo','school-demo','school') returning id into space;
  insert into memberships(person_id, space_id, role) values(guide, space, 'coordinator'),(guide, space, 'guide');
  insert into groups(space_id, name, code, tags) values(space,'4° A · Matemática','DEMO4A','{"grado":"4°","materia":"Matemática"}') returning id into g1;
  insert into groups(space_id, name, code, tags) values(space,'Taller de robótica','ROBOT1','{"turno":"sábados"}') returning id into g2;
  insert into memberships(person_id, space_id, group_id, role) values(guide, space, g1, 'guide'),(guide, space, g2, 'guide');

  -- space activities, copied from three recipes
  insert into activities(space_id, title, is_recipe, composition, document, rubric, authors)
    select space, title, false, composition, document, rubric, array[guide] from activities where is_recipe and title='Escape del aula' returning id into a1;
  insert into activities(space_id, title, is_recipe, composition, document, rubric, authors)
    select space, title, false, composition, document, rubric, array[guide] from activities where is_recipe and title='Reto de la semana' returning id into a2;
  insert into activities(space_id, title, is_recipe, composition, document, rubric, authors)
    select space, title, false, composition, document, rubric, array[guide] from activities where is_recipe and title='El robot que cuenta' returning id into a3;

  insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot, opens_at) select a1, g1, document, rubric, now()-interval '6 days' from activities where id=a1 returning id into s1;
  insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot, opens_at) select a2, g1, document, rubric, now()-interval '3 days' from activities where id=a2 returning id into s2;
  insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot, opens_at) select a3, g2, document, rubric, now()-interval '5 days' from activities where id=a3 returning id into s3;
  -- s4 is deliberately left without submissions: an assignment nobody has opened yet.
  insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot, opens_at) select a1, g2, document, rubric, now()-interval '1 days' from activities where id=a1 returning id into s4;

  for i in 0..jsonb_array_length(roster)-1 loop
    who := roster->i;
    insert into people(email, google_sub, name)
      values(lower(who->>'name')||'@demo.melu','dev:'||lower(who->>'name')||'@demo.melu', who->>'name') returning id into learner;
    grp := case when (who->>'group')::int = 1 then g1 else g2 end;
    insert into memberships(person_id, space_id, group_id, role) values(learner, space, grp, 'learner');

    -- one pass per activity this learner touched
    -- Los alias van con sufijo: en plpgsql una columna que se llama igual que una variable
    -- del bloque es ambigua y falla en tiempo de ejecución.
    for blocks, hits, opened, assignment, activity in
      select bl, hh, op, asg, act from (values
        (escape_blocks,    (who->>'escape')::int,    now() - interval '5 days' + (i * interval '3 hours'), s1, a1),
        (challenge_blocks, (who->>'challenge')::int, now() - interval '2 days' + (i * interval '2 hours'), s2, a2),
        (robot_blocks,     (who->>'robot')::int,     now() - interval '4 days' + (i * interval '5 hours'), s3, a3)
      ) as t(bl, hh, op, asg, act) where hh is not null
    loop
      minutes := (who->>'minutes')::int;
      submitted := opened + (minutes * interval '1 minute');
      sub_status := case when hits < 0 then 'in_progress' else 'submitted' end;
      sub_answers := '{}'::jsonb; sub_steps := '{}'::jsonb;

      idx := 0;
      for b in select * from jsonb_array_elements(blocks) loop
        right_one := idx < hits;
        if hits >= 0 then
          sub_answers := jsonb_set(sub_answers, array[b->>'id'], case when right_one then b->'right' else b->'wrong' end);
          sub_steps := jsonb_set(sub_steps, array[b->>'id'], jsonb_build_object(
            'attempts', case when right_one then 1 else 2 end,
            'ok', right_one,
            'ms', (minutes * 60000 / jsonb_array_length(blocks))));
        end if;
        idx := idx + 1;
      end loop;

      insert into submissions(assignment_id, learner_id, status, answers, steps, submitted_at)
        values(assignment, learner, sub_status, sub_answers, sub_steps,
               case when sub_status = 'in_progress' then null else submitted end);
      insert into events(person_id, group_id, activity_id, verb, occurred_at)
        values(learner, grp, activity, 'mission.opened', opened);
      if sub_status <> 'in_progress' then
        insert into events(person_id, group_id, activity_id, verb, occurred_at)
          values(learner, grp, activity, 'mission.submitted', submitted);
      end if;
    end loop;
  end loop;

  -- a few already graded, so the teacher lands on a dashboard with work behind it
  update submissions set status='graded', scores='[{"id":"r1","level":2},{"id":"r2","level":1}]'::jsonb
  where status='submitted' and learner_id in (select id from people where name in ('Sofía','Lucía','Nico'));
end $$;
