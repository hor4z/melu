-- Las recetas pasan a tener bloques que se corrigen solos: opciones, número,
-- completar, ordenar y emparejar. El runner las recorre paso a paso.

update actividad set documento = '{"fases":[
 {"clave":"reglas","nombre":"Reglas","bloques":[
  {"id":"e1","tipo":"parrafo","texto":"Cinco candados, cinco pistas escondidas en el aula. Cada pista tiene un QR que abre un acertijo acá."},
  {"id":"e2","tipo":"destacado","texto":"El equipo que abre los cinco, sale. Pueden usar papel y lápiz para probar números."}]},
 {"clave":"jugar","nombre":"Jugar","bloques":[
  {"id":"e3","tipo":"opciones","texto":"Candado 1 — El doble de un número, menos 4, da 10. ¿Qué número abre el candado?","opciones":["3","7","14"],"correcta":1,"pista":"Si el doble menos 4 da 10, el doble solo da 14.","explicacion":"El doble tiene que ser 14, porque 14 − 4 = 10. Y el doble de 7 es 14."},
  {"id":"e4","tipo":"numerico","texto":"Candado 2 — Tres amigos se repartieron 27 figuritas en partes iguales y a uno le regalaron 2 más. ¿Cuántas tiene ese?","respuesta":11,"tolerancia":0,"unidad":"figuritas","pista":"Primero repartí las 27 entre los tres.","explicacion":"27 ÷ 3 = 9 para cada uno. El que recibió el regalo tiene 9 + 2 = 11."},
  {"id":"e5","tipo":"completar","texto":"Candado 3 — Un número más su mitad da 18. El número es {{numero}} y su mitad es {{mitad}}.","huecos":["12","6"],"pista":"Si el número fuera 10, ¿cuánto daría?","explicacion":"12 + 6 = 18. El número más su mitad es lo mismo que una vez y media el número: 18 ÷ 1,5 = 12."},
  {"id":"e6","tipo":"ordenar","texto":"Candado 4 — Ordená los pasos para resolver «el triple de un número más 5 es 26».","items":["Escribo lo que sé: triple + 5 = 26","Le saco el 5 a los dos lados: triple = 21","Divido por 3: el número es 7","Verifico: 7 × 3 + 5 = 26"],"explicacion":"Primero se deshace la suma y después la multiplicación: al revés de como se armó."}]},
 {"clave":"debrief","nombre":"Debrief","bloques":[
  {"id":"e7","tipo":"emparejar","texto":"Cada candado escondía una operación. Uní cada uno con la que lo resolvía.","pares":[{"izq":"Candado 1","der":"Sumar y después dividir"},{"izq":"Candado 2","der":"Repartir en partes iguales"},{"izq":"Candado 3","der":"Pensar en una vez y media"},{"izq":"Candado 4","der":"Deshacer los pasos al revés"}],"explicacion":"En todos hicimos lo mismo: leer qué se le hizo al número y deshacerlo en orden inverso."},
  {"id":"e8","tipo":"pregunta","texto":"¿Cuál les costó más y por qué? Escríbanlo con sus palabras."},
  {"id":"e9","tipo":"autoreporte","texto":"¿Cuánto te divertiste?"}]}]}'::jsonb
where es_receta and titulo = 'Escape del aula';

update actividad set documento = '{"fases":[
 {"clave":"concreto","nombre":"Concreto","bloques":[
  {"id":"f1","tipo":"parrafo","texto":"Esta receta es para 4 personas. En tu casa son 6. Elegí algo simple: panqueques, limonada, ensalada de frutas."},
  {"id":"f2","tipo":"parrafo","texto":"Con tazas y cucharas de verdad, armá la cantidad para 4. Después armá la cantidad para 6 al lado."},
  {"id":"f3","tipo":"evidencia","texto":"Foto de las dos cantidades, una al lado de la otra","kind":"foto"}]},
 {"clave":"pictorico","nombre":"Pictórico","bloques":[
  {"id":"f4","tipo":"parrafo","texto":"Dibujá las tazas. Cada taza es un rectángulo; si es media taza, pintá la mitad."},
  {"id":"f5","tipo":"opciones","texto":"Si pintás 3 de 4 partes iguales de un rectángulo, ¿qué fracción es?","opciones":["3/4","4/3","1/3","3/1"],"correcta":0,"explicacion":"Arriba va cuántas partes pintaste (3) y abajo en cuántas partes dividiste el entero (4)."},
  {"id":"f6","tipo":"evidencia","texto":"Foto del dibujo","kind":"foto"}]},
 {"clave":"abstracto","nombre":"Abstracto","bloques":[
  {"id":"f7","tipo":"numerico","texto":"La receta lleva 1/2 taza de azúcar para 4 personas. ¿Cuántas tazas van para 6?","respuesta":0.75,"tolerancia":0.01,"unidad":"tazas","pista":"¿Cuánta azúcar le toca a una sola persona?","explicacion":"Media taza entre 4 es 1/8 de taza por persona. Para 6: 6 × 1/8 = 6/8 = 3/4 de taza."},
  {"id":"f8","tipo":"varias","texto":"¿Cuáles de estas son iguales a 3/4? Puede haber más de una.","opciones":["6/8","0,75","3/8","9/12"],"correctas":[0,1,3],"explicacion":"6/8 y 9/12 se simplifican a 3/4, y 0,75 es la misma cantidad escrita en decimales. 3/8 es la mitad de 3/4."},
  {"id":"f9","tipo":"evidencia","texto":"Audio: explicale a alguien de tu casa cómo lo pensaste","kind":"audio"},
  {"id":"f10","tipo":"autoreporte","texto":"¿Qué tan seguro estás de tu respuesta?"}]}]}'::jsonb
where es_receta and titulo = 'Fracciones en la cocina';

update actividad set documento = '{"fases":[
 {"clave":"entender","nombre":"Entender","bloques":[
  {"id":"r1","tipo":"parrafo","texto":"En un corral hay gallinas y conejos. Se cuentan 10 cabezas y 26 patas."},
  {"id":"r2","tipo":"pregunta","texto":"Con tus palabras: ¿qué te dan y qué te piden?"}]},
 {"clave":"planificar","nombre":"Planificar","bloques":[
  {"id":"r3","tipo":"opciones","texto":"Antes de resolver: ¿cómo lo vas a atacar?","opciones":["Probar números y ajustar","Dibujar los animales y contar patas","Hacer una tabla de gallinas y conejos","Cualquiera de las tres sirve"],"correcta":3,"explicacion":"Las tres funcionan. Lo que importa es elegir una y sostenerla: probar sin plan es lo que se hace largo."}]},
 {"clave":"ejecutar","nombre":"Ejecutar","bloques":[
  {"id":"r4","tipo":"numerico","texto":"¿Cuántas gallinas hay?","respuesta":7,"unidad":"gallinas","pista":"Si fueran todas gallinas serían 20 patas. Sobran 6.","explicacion":"Con 10 cabezas, si todas fueran gallinas habría 20 patas. Faltan 6, y cada conejo agrega 2 patas: 3 conejos. Entonces 7 gallinas."},
  {"id":"r5","tipo":"numerico","texto":"¿Y cuántos conejos?","respuesta":3,"unidad":"conejos","explicacion":"10 − 7 = 3 conejos. Verificación: 7 × 2 + 3 × 4 = 14 + 12 = 26 patas."}]},
 {"clave":"revisar","nombre":"Revisar","bloques":[
  {"id":"r6","tipo":"varias","texto":"¿Qué verificaste antes de dar la respuesta?","opciones":["Que las cabezas sumen 10","Que las patas sumen 26","Que no haya animales de más","Nada, fui directo"],"correctas":[0,1],"explicacion":"Verificar contra las dos condiciones del enunciado es lo que convierte una respuesta en una respuesta segura."},
  {"id":"r7","tipo":"autoreporte","texto":"¿Cuánto te costó?"}]}]}'::jsonb
where es_receta and titulo = 'Reto de la semana';

update actividad set documento = '{"fases":[
 {"clave":"pregunta","nombre":"Pregunta","bloques":[
  {"id":"b1","tipo":"parrafo","texto":"El robot avanza y prende una luz cada tres pasos, sin que nadie le diga cuándo. ¿Cómo sabe que llegó al tercero?"}]},
 {"clave":"investigar","nombre":"Investigar","bloques":[
  {"id":"b2","tipo":"varias","texto":"De estos pasos, ¿en cuáles se prende la luz?","opciones":["9","14","21","27"],"correctas":[0,2,3],"pista":"Escribí 3, 6, 9, 12… y fijate cuáles aparecen.","explicacion":"9, 21 y 27 están en la cuenta de tres en tres. El 14 no: entre 12 y 15."},
  {"id":"b3","tipo":"numerico","texto":"¿En qué paso se prende por sexta vez?","respuesta":18,"pista":"La primera vez es en el 3.","explicacion":"Cada vez suma 3: 3, 6, 9, 12, 15, 18. La sexta es 6 × 3 = 18."}]},
 {"clave":"crear","nombre":"Crear","bloques":[
  {"id":"b4","tipo":"parrafo","texto":"Programen el robot. Pista: no hace falta escribir 3, 6, 9… hay una forma de repetir."},
  {"id":"b5","tipo":"evidencia","texto":"El programa","kind":"archivo"},
  {"id":"b6","tipo":"evidencia","texto":"Foto del robot en el paso 9","kind":"foto"}]},
 {"clave":"presentar","nombre":"Presentar","bloques":[
  {"id":"b7","tipo":"pregunta","texto":"Ahora cambien: cada cuatro pasos. ¿Qué tuvieron que tocar en el programa? ¿Una cosa o muchas?"}]},
 {"clave":"reflexionar","nombre":"Reflexionar","bloques":[
  {"id":"b8","tipo":"opciones","texto":"Los números donde se prende la luz se llaman…","opciones":["divisores de 3","múltiplos de 3","números primos","números pares"],"correcta":1,"explicacion":"Son los múltiplos de 3: lo que sale de multiplicar 3 por 1, 2, 3, 4… Justo lo que hace el bucle."}]}]}'::jsonb
where es_receta and titulo = 'El robot que cuenta';

-- Las copias de demo que nadie tocó heredan el contenido nuevo, y las asignaciones se vuelven a congelar.
update actividad a set documento = r.documento, rubrica = r.rubrica
from actividad r
where r.es_receta and r.espacio_id is null and not a.es_receta and a.titulo = r.titulo and a.updated_at = a.created_at;

update asignacion s set documento_snapshot = a.documento, rubrica_snapshot = a.rubrica
from actividad a where a.id = s.actividad_id;

-- Lo que se respondió con el formato viejo ya no aplica: se limpian los borradores en curso.
update entrega set respuestas = '{}', pasos = '{}' where estado = 'en_curso';
