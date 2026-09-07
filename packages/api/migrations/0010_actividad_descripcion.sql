-- Una actividad puede decir de qué se trata, sin abrirla.
--
-- La pantalla ya mostraba algo parecido, pero sacado del documento a mano: el primer párrafo de
-- la primera fase. Eso no es una descripción, es la primera consigna, y se rompe el día que la
-- actividad empiece con otra cosa. Ahora es un campo.
alter table activities add column if not exists description text;

-- Y se rellena con eso mismo, que es lo que ya se estaba viendo: así ninguna receta queda muda
-- y no hay que inventarle catorce textos nuevos a algo que ya se leía.
update activities a set description = (
  select b->>'text'
    from jsonb_array_elements(a.document->'phases'->0->'blocks') b
   where b->>'type' = 'paragraph'
   limit 1)
 where a.description is null
   and jsonb_typeof(a.document->'phases'->0->'blocks') = 'array';

-- La única que no empieza con un párrafo: son tres preguntas y nada más, así que la descripción
-- se escribe. Después del update de arriba para que el orden no importe.
update activities set description = 'Tres preguntas cortas para empezar el día: con cuánta energía llegaron, qué tan tranquilos se sienten, y si hay algo que quieran contar.'
 where title = '¿Cómo llegaste hoy?' and coalesce(description, '') = '';
