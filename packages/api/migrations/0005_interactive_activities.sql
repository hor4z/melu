-- Recipes gain self-grading blocks: choice, number, fill-in, order and match.
-- The runner walks them one step at a time.

update activities set document = '{"phases":[
 {"key":"rules","name":"Reglas","blocks":[
  {"id":"e1","type":"paragraph","text":"Cinco candados, cinco pistas escondidas en el aula. Cada pista tiene un QR que abre un acertijo acá."},
  {"id":"e2","type":"callout","text":"El equipo que abre los cinco, sale. Pueden usar papel y lápiz para probar números."}]},
 {"key":"play","name":"Jugar","blocks":[
  {"id":"e3","type":"choice","text":"Candado 1 — El doble de un número, menos 4, da 10. ¿Qué número abre el candado?","options":["3","7","14"],"correct":1,"hint":"Si el doble menos 4 da 10, el doble solo da 14.","explanation":"El doble tiene que ser 14, porque 14 − 4 = 10. Y el doble de 7 es 14."},
  {"id":"e4","type":"number","text":"Candado 2 — Tres amigos se repartieron 27 figuritas en partes iguales y a uno le regalaron 2 más. ¿Cuántas tiene ese?","answer":11,"tolerance":0,"unit":"figuritas","hint":"Primero repartí las 27 entre los tres.","explanation":"27 ÷ 3 = 9 para cada uno. El que recibió el regalo tiene 9 + 2 = 11."},
  {"id":"e5","type":"fill_in","text":"Candado 3 — Un número más su mitad da 18. El número es {{numero}} y su mitad es {{mitad}}.","blanks":["12","6"],"hint":"Si el número fuera 10, ¿cuánto daría?","explanation":"12 + 6 = 18. El número más su mitad es lo mismo que una vez y media el número: 18 ÷ 1,5 = 12."},
  {"id":"e6","type":"order","text":"Candado 4 — Ordená los pasos para resolver «el triple de un número más 5 es 26».","items":["Escribo lo que sé: triple + 5 = 26","Le saco el 5 a los dos lados: triple = 21","Divido por 3: el número es 7","Verifico: 7 × 3 + 5 = 26"],"explanation":"Primero se deshace la suma y después la multiplicación: al revés de como se armó."}]},
 {"key":"debrief","name":"Debrief","blocks":[
  {"id":"e7","type":"match","text":"Cada candado escondía una operación. Uní cada uno con la que lo resolvía.","pairs":[{"left":"Candado 1","right":"Sumar y después dividir"},{"left":"Candado 2","right":"Repartir en partes iguales"},{"left":"Candado 3","right":"Pensar en una vez y media"},{"left":"Candado 4","right":"Deshacer los pasos al revés"}],"explanation":"En todos hicimos lo mismo: leer qué se le hizo al número y deshacerlo en orden inverso."},
  {"id":"e8","type":"question","text":"¿Cuál les costó más y por qué? Escríbanlo con sus palabras."},
  {"id":"e9","type":"self_report","text":"¿Cuánto te divertiste?"}]}]}'::jsonb
where is_recipe and title = 'Escape del aula';

update activities set document = '{"phases":[
 {"key":"concrete","name":"Concreto","blocks":[
  {"id":"f1","type":"paragraph","text":"Esta receta es para 4 personas. En tu casa son 6. Elegí algo simple: panqueques, limonada, ensalada de frutas."},
  {"id":"f2","type":"paragraph","text":"Con tazas y cucharas de verdad, armá la cantidad para 4. Después armá la cantidad para 6 al lado."},
  {"id":"f3","type":"evidence","text":"Foto de las dos cantidades, una al lado de la otra","media":"photo"}]},
 {"key":"pictorial","name":"Pictórico","blocks":[
  {"id":"f4","type":"paragraph","text":"Dibujá las tazas. Cada taza es un rectángulo; si es media taza, pintá la mitad."},
  {"id":"f5","type":"choice","text":"Si pintás 3 de 4 partes iguales de un rectángulo, ¿qué fracción es?","options":["3/4","4/3","1/3","3/1"],"correct":0,"explanation":"Arriba va cuántas partes pintaste (3) y abajo en cuántas partes dividiste el entero (4)."},
  {"id":"f6","type":"evidence","text":"Foto del dibujo","media":"photo"}]},
 {"key":"abstract","name":"Abstracto","blocks":[
  {"id":"f7","type":"number","text":"La receta lleva 1/2 taza de azúcar para 4 personas. ¿Cuántas tazas van para 6?","answer":0.75,"tolerance":0.01,"unit":"tazas","hint":"¿Cuánta azúcar le toca a una sola persona?","explanation":"Media taza entre 4 es 1/8 de taza por persona. Para 6: 6 × 1/8 = 6/8 = 3/4 de taza."},
  {"id":"f8","type":"multi","text":"¿Cuáles de estas son iguales a 3/4? Puede haber más de una.","options":["6/8","0,75","3/8","9/12"],"correctMulti":[0,1,3],"explanation":"6/8 y 9/12 se simplifican a 3/4, y 0,75 es la misma cantidad escrita en decimales. 3/8 es la mitad de 3/4."},
  {"id":"f9","type":"evidence","text":"Audio: explicale a alguien de tu casa cómo lo pensaste","media":"audio"},
  {"id":"f10","type":"self_report","text":"¿Qué tan seguro estás de tu respuesta?"}]}]}'::jsonb
where is_recipe and title = 'Fracciones en la cocina';

update activities set document = '{"phases":[
 {"key":"understand","name":"Entender","blocks":[
  {"id":"r1","type":"paragraph","text":"En un corral hay gallinas y conejos. Se cuentan 10 cabezas y 26 patas."},
  {"id":"r2","type":"question","text":"Con tus palabras: ¿qué te dan y qué te piden?"}]},
 {"key":"plan","name":"Planificar","blocks":[
  {"id":"r3","type":"choice","text":"Antes de resolver: ¿cómo lo vas a atacar?","options":["Probar números y ajustar","Dibujar los animales y contar patas","Hacer una tabla de gallinas y conejos","Cualquiera de las tres sirve"],"correct":3,"explanation":"Las tres funcionan. Lo que importa es elegir una y sostenerla: probar sin plan es lo que se hace largo."}]},
 {"key":"execute","name":"Ejecutar","blocks":[
  {"id":"r4","type":"number","text":"¿Cuántas gallinas hay?","answer":7,"unit":"gallinas","hint":"Si fueran todas gallinas serían 20 patas. Sobran 6.","explanation":"Con 10 cabezas, si todas fueran gallinas habría 20 patas. Faltan 6, y cada conejo agrega 2 patas: 3 conejos. Entonces 7 gallinas."},
  {"id":"r5","type":"number","text":"¿Y cuántos conejos?","answer":3,"unit":"conejos","explanation":"10 − 7 = 3 conejos. Verificación: 7 × 2 + 3 × 4 = 14 + 12 = 26 patas."}]},
 {"key":"review","name":"Revisar","blocks":[
  {"id":"r6","type":"multi","text":"¿Qué verificaste antes de dar la respuesta?","options":["Que las cabezas sumen 10","Que las patas sumen 26","Que no haya animales de más","Nada, fui directo"],"correctMulti":[0,1],"explanation":"Verificar contra las dos condiciones del enunciado es lo que convierte una respuesta en una respuesta segura."},
  {"id":"r7","type":"self_report","text":"¿Cuánto te costó?"}]}]}'::jsonb
where is_recipe and title = 'Reto de la semana';

update activities set document = '{"phases":[
 {"key":"question","name":"Pregunta","blocks":[
  {"id":"b1","type":"paragraph","text":"El robot avanza y prende una luz cada tres pasos, sin que nadie le diga cuándo. ¿Cómo sabe que llegó al tercero?"}]},
 {"key":"research","name":"Investigar","blocks":[
  {"id":"b2","type":"multi","text":"De estos pasos, ¿en cuáles se prende la luz?","options":["9","14","21","27"],"correctMulti":[0,2,3],"hint":"Escribí 3, 6, 9, 12… y fijate cuáles aparecen.","explanation":"9, 21 y 27 están en la cuenta de tres en tres. El 14 no: entre 12 y 15."},
  {"id":"b3","type":"number","text":"¿En qué paso se prende por sexta vez?","answer":18,"hint":"La primera vez es en el 3.","explanation":"Cada vez suma 3: 3, 6, 9, 12, 15, 18. La sexta es 6 × 3 = 18."}]},
 {"key":"create","name":"Crear","blocks":[
  {"id":"b4","type":"paragraph","text":"Programen el robot. Pista: no hace falta escribir 3, 6, 9… hay una forma de repetir."},
  {"id":"b5","type":"evidence","text":"El programa","media":"file"},
  {"id":"b6","type":"evidence","text":"Foto del robot en el paso 9","media":"photo"}]},
 {"key":"present","name":"Presentar","blocks":[
  {"id":"b7","type":"question","text":"Ahora cambien: cada cuatro pasos. ¿Qué tuvieron que tocar en el programa? ¿Una cosa o muchas?"}]},
 {"key":"reflect","name":"Reflexionar","blocks":[
  {"id":"b8","type":"choice","text":"Los números donde se prende la luz se llaman…","options":["divisores de 3","múltiplos de 3","números primos","números pares"],"correct":1,"explanation":"Son los múltiplos de 3: lo que sale de multiplicar 3 por 1, 2, 3, 4… Justo lo que hace el bucle."}]}]}'::jsonb
where is_recipe and title = 'El robot que cuenta';

-- Untouched demo copies inherit the new content, and assignments are re-frozen.
update activities a set document = r.document, rubric = r.rubric
from activities r
where r.is_recipe and r.space_id is null and not a.is_recipe and a.title = r.title and a.updated_at = a.created_at;

update assignments s set document_snapshot = a.document, rubric_snapshot = a.rubric
from activities a where a.id = s.activity_id;

-- Answers in the old format no longer apply: in-progress drafts are cleared.
update submissions set answers = '{}', steps = '{}' where status = 'in_progress';
