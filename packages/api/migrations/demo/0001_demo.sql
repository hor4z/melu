-- Demo data (only with MELU_DEMO=1). One space, two groups, twelve learners and assorted submissions.
do $$
declare
  guide uuid; space uuid; g1 uuid; g2 uuid; r record; a1 uuid; a2 uuid; a3 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid;
  learner uuid; i int; names text[] := array['Sofía','Nico','Valentina','Mateo','Lucía','Benjamín','Emma','Thiago','Olivia','Julián','Martina','Bruno'];
  opened timestamptz; submitted timestamptz; sub_status text; sub_answers jsonb;
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
  insert into assignments(activity_id, group_id, document_snapshot, rubric_snapshot, opens_at) select a1, g2, document, rubric, now()-interval '1 days' from activities where id=a1 returning id into s4;

  for i in 1..12 loop
    insert into people(email, google_sub, name) values(lower(names[i])||'@demo.melu','dev:'||lower(names[i])||'@demo.melu', names[i]) returning id into learner;
    insert into memberships(person_id, space_id, group_id, role) values(learner, space, case when i<=8 then g1 else g2 end, 'learner');

    -- classroom escape (4°A) / robot (workshop): submissions with varied times and accuracy
    if i<=8 then
      opened := now() - (interval '5 days') + (i * interval '3 hours');
      submitted := opened + ((8 + (i*7) % 30) * interval '1 minute');
      sub_status := case when i=3 then 'in_progress' when i in (1,2,5) then 'graded' else 'submitted' end;
      sub_answers := case when i in (4,7) then '{"b2":2,"b3":0,"b4":"un número","b5":"no sé","b6":3}'::jsonb else '{"b2":1,"b3":1,"b4":"12, porque 12+6=18","b5":"restar y dividir","b6":4}'::jsonb end;
      insert into submissions(assignment_id, learner_id, status, answers, submitted_at, scores) values(s1, learner, sub_status, sub_answers, case when sub_status='in_progress' then null else submitted end, case when sub_status='graded' then '[{"id":"r1","level":2},{"id":"r2","level":1}]'::jsonb else '[]'::jsonb end);
      insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g1, a1, 'mission.opened', opened);
      if sub_status<>'in_progress' then insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g1, a1, 'mission.submitted', submitted); end if;
      -- weekly challenge: half of them started it
      if i % 2 = 0 then
        opened := now() - interval '2 days' + (i * interval '2 hours');
        submitted := opened + ((15 + (i*11) % 40) * interval '1 minute');
        sub_status := case when i=8 then 'in_progress' else 'submitted' end;
        insert into submissions(assignment_id, learner_id, status, answers, submitted_at) values(s2, learner, sub_status, '{"b2":"me dan cabezas y patas","b3":"probar números","b4":"7 gallinas y 3 conejos"}', case when sub_status='in_progress' then null else submitted end);
        insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g1, a2, 'mission.opened', opened);
        if sub_status<>'in_progress' then insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g1, a2, 'mission.submitted', submitted); end if;
      end if;
    else
      opened := now() - interval '4 days' + (i * interval '5 hours');
      submitted := opened + ((20 + (i*13) % 50) * interval '1 minute');
      sub_status := case when i=12 then 'in_progress' else 'submitted' end;
      sub_answers := case when i=11 then '{"b2":"3,6,9","b7":1}'::jsonb else '{"b2":"3,6,9,12: van de tres en tres","b6":"solo el número","b7":0}'::jsonb end;
      insert into submissions(assignment_id, learner_id, status, answers, submitted_at) values(s3, learner, sub_status, sub_answers, case when sub_status='in_progress' then null else submitted end);
      insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g2, a3, 'mission.opened', opened);
      if sub_status<>'in_progress' then insert into events(person_id, group_id, activity_id, verb, occurred_at) values(learner, g2, a3, 'mission.submitted', submitted); end if;
    end if;
  end loop;
end $$;
