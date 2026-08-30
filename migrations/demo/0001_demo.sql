-- Datos de demostración (solo con MELU_DEMO=1). Un espacio con dos grupos, doce aprendices y entregas variadas.
do $$
declare
  guia uuid; esp uuid; g1 uuid; g2 uuid; r record; a1 uuid; a2 uuid; a3 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid;
  ap uuid; i int; nombres text[] := array['Sofía','Nico','Valentina','Mateo','Lucía','Benjamín','Emma','Thiago','Olivia','Julián','Martina','Bruno'];
  abierta timestamptz; entregada timestamptz; est text; resp jsonb;
begin
  select id into guia from persona where email='horacio.rivero@educabot.com';
  if guia is null then
    insert into persona(email, google_sub, nombre) values('horacio.rivero@educabot.com','dev:horacio.rivero@educabot.com','Horacio') returning id into guia;
  end if;
  if exists (select 1 from espacio where slug='escuela-demo') then return; end if;

  insert into espacio(nombre, slug, tipo) values('Escuela 12 · Demo','escuela-demo','escuela') returning id into esp;
  insert into membresia(persona_id, espacio_id, rol) values(guia, esp, 'coordinador'),(guia, esp, 'guia');
  insert into grupo(espacio_id, nombre, codigo, etiquetas) values(esp,'4° A · Matemática','DEMO4A','{"grado":"4°","materia":"Matemática"}') returning id into g1;
  insert into grupo(espacio_id, nombre, codigo, etiquetas) values(esp,'Taller de robótica','ROBOT1','{"turno":"sábados"}') returning id into g2;
  insert into membresia(persona_id, espacio_id, grupo_id, rol) values(guia, esp, g1, 'guia'),(guia, esp, g2, 'guia');

  -- actividades del espacio, copiadas de tres recetas
  insert into actividad(espacio_id, titulo, es_receta, composicion, documento, rubrica, autores)
    select esp, titulo, false, composicion, documento, rubrica, array[guia] from actividad where es_receta and titulo='Escape del aula' returning id into a1;
  insert into actividad(espacio_id, titulo, es_receta, composicion, documento, rubrica, autores)
    select esp, titulo, false, composicion, documento, rubrica, array[guia] from actividad where es_receta and titulo='Reto de la semana' returning id into a2;
  insert into actividad(espacio_id, titulo, es_receta, composicion, documento, rubrica, autores)
    select esp, titulo, false, composicion, documento, rubrica, array[guia] from actividad where es_receta and titulo='El robot que cuenta' returning id into a3;

  insert into asignacion(actividad_id, grupo_id, documento_snapshot, rubrica_snapshot, abre) select a1, g1, documento, rubrica, now()-interval '6 days' from actividad where id=a1 returning id into s1;
  insert into asignacion(actividad_id, grupo_id, documento_snapshot, rubrica_snapshot, abre) select a2, g1, documento, rubrica, now()-interval '3 days' from actividad where id=a2 returning id into s2;
  insert into asignacion(actividad_id, grupo_id, documento_snapshot, rubrica_snapshot, abre) select a3, g2, documento, rubrica, now()-interval '5 days' from actividad where id=a3 returning id into s3;
  insert into asignacion(actividad_id, grupo_id, documento_snapshot, rubrica_snapshot, abre) select a1, g2, documento, rubrica, now()-interval '1 days' from actividad where id=a1 returning id into s4;

  for i in 1..12 loop
    insert into persona(email, google_sub, nombre) values(lower(nombres[i])||'@demo.melu','dev:'||lower(nombres[i])||'@demo.melu', nombres[i]) returning id into ap;
    insert into membresia(persona_id, espacio_id, grupo_id, rol) values(ap, esp, case when i<=8 then g1 else g2 end, 'aprendiz');

    -- escape del aula (4°A) / robot (taller): entregas con tiempos y aciertos variados
    if i<=8 then
      abierta := now() - (interval '5 days') + (i * interval '3 hours');
      entregada := abierta + ((8 + (i*7) % 30) * interval '1 minute');
      est := case when i=3 then 'en_curso' when i in (1,2,5) then 'corregida' else 'entregada' end;
      resp := case when i in (4,7) then '{"b2":2,"b3":0,"b4":"un número","b5":"no sé","b6":3}'::jsonb else '{"b2":1,"b3":1,"b4":"12, porque 12+6=18","b5":"restar y dividir","b6":4}'::jsonb end;
      insert into entrega(asignacion_id, aprendiz_id, estado, respuestas, entregada_at, puntajes) values(s1, ap, est, resp, case when est='en_curso' then null else entregada end, case when est='corregida' then '[{"id":"r1","nivel":2},{"id":"r2","nivel":1}]'::jsonb else '[]'::jsonb end);
      insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g1, a1, 'mision.abierta', abierta);
      if est<>'en_curso' then insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g1, a1, 'mision.entregada', entregada); end if;
      -- reto de la semana: la mitad lo empezó
      if i % 2 = 0 then
        abierta := now() - interval '2 days' + (i * interval '2 hours');
        entregada := abierta + ((15 + (i*11) % 40) * interval '1 minute');
        est := case when i=8 then 'en_curso' else 'entregada' end;
        insert into entrega(asignacion_id, aprendiz_id, estado, respuestas, entregada_at) values(s2, ap, est, '{"b2":"me dan cabezas y patas","b3":"probar números","b4":"7 gallinas y 3 conejos"}', case when est='en_curso' then null else entregada end);
        insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g1, a2, 'mision.abierta', abierta);
        if est<>'en_curso' then insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g1, a2, 'mision.entregada', entregada); end if;
      end if;
    else
      abierta := now() - interval '4 days' + (i * interval '5 hours');
      entregada := abierta + ((20 + (i*13) % 50) * interval '1 minute');
      est := case when i=12 then 'en_curso' else 'entregada' end;
      resp := case when i=11 then '{"b2":"3,6,9","b7":1}'::jsonb else '{"b2":"3,6,9,12: van de tres en tres","b6":"solo el número","b7":0}'::jsonb end;
      insert into entrega(asignacion_id, aprendiz_id, estado, respuestas, entregada_at) values(s3, ap, est, resp, case when est='en_curso' then null else entregada end);
      insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g2, a3, 'mision.abierta', abierta);
      if est<>'en_curso' then insert into evento(persona_id, grupo_id, actividad_id, verbo, ocurrio) values(ap, g2, a3, 'mision.entregada', entregada); end if;
    end if;
  end loop;
end $$;
