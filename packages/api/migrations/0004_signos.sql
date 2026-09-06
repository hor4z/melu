-- Los signos que el producto no usa, en el contenido que ya está guardado.
--
-- Las recetas se sembraron en 0002 y desde entonces el texto cambió dos veces: se fue la raya
-- larga y después las comillas angulares. Editar una migración ya aplicada no arregla nada,
-- porque nunca vuelve a correr: las bases que existían se quedaron con el texto viejo, y este
-- es texto que los chicos leen en pantalla. Así que va acá.
--
-- Se toca el documento y también la copia congelada de cada asignación: la copia es lo que el
-- chico abre, así que arreglar solo el original dejaría el texto viejo en las misiones vivas.
--
-- La comilla se reemplaza escapada porque el documento es JSON y se está tocando su texto
-- serializado: una comilla suelta ahí adentro lo rompe.
update activities set document = replace(replace(replace(
  document::text, '«', '\"'), '»', '\"'), ' — ', ': ')::jsonb
  where document::text ~ '[«»—]';

update assignments set document_snapshot = replace(replace(replace(
  document_snapshot::text, '«', '\"'), '»', '\"'), ' — ', ': ')::jsonb
  where document_snapshot::text ~ '[«»—]';
