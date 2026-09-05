-- Three recipes that are games. Like Genially: a familiar mechanic with your own content.
insert into activities (title, is_recipe, composition, document, rubric) values

('Recicla y clasifica', true,
 '{"experience":"game","lens":"game","disciplines":["Ciencias · materiales","Ciudadanía · ambiente"],"setting":["screen"],"social":"pair","evidence":["answer"]}',
 '{"phases":[
  {"key":"rules","name":"Reglas","blocks":[
   {"id":"c1","type":"paragraph","text":"Cada residuo va en un contenedor. Arrastralos, o tocá el residuo y después la caja."},
   {"id":"c2","type":"callout","text":"Si dudás, pensá de qué está hecho, no para qué servía."}]},
  {"key":"play","name":"Jugar","blocks":[
   {"id":"c3","type":"game","text":"Poné cada residuo en su contenedor","engine":"sort",
    "categories":[
     {"name":"Papel y cartón","items":["Caja de zapatos","Hoja de carpeta","Rollo de cocina"]},
     {"name":"Plástico","items":["Botella de gaseosa","Tapita","Bolsa de fideos"]},
     {"name":"Orgánico","items":["Cáscara de banana","Yerba usada","Restos de manzana"]}],
    "explanation":"El material manda: la caja de zapatos es cartón aunque haya traído zapatos, y la yerba es orgánica aunque venga en paquete."}]},
  {"key":"debrief","name":"Debrief","blocks":[
   {"id":"c4","type":"question","text":"¿Cuál te costó más decidir y por qué?"},
   {"id":"c5","type":"evidence","text":"Foto de los tachos de tu casa o del aula: ¿están separados así?","media":"photo"}]}]}',
 '[{"id":"g1","label":"Clasifica por material y no por uso","levels":["Todavía no","A veces","Siempre"]}]'),

('Memoria de fracciones', true,
 '{"experience":"game","lens":"game","disciplines":["Matemática · fracciones"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
  {"key":"rules","name":"Reglas","blocks":[
   {"id":"m1","type":"paragraph","text":"Cada fracción tiene su pareja escrita de otra forma. Dá vuelta dos cartas por vez y encontralas todas."}]},
  {"key":"play","name":"Jugar","blocks":[
   {"id":"m2","type":"game","text":"Encontrá las parejas","engine":"memory",
    "pairs":[{"left":"1/2","right":"0,5"},{"left":"1/4","right":"0,25"},{"left":"3/4","right":"6/8"},{"left":"1/3","right":"2/6"},{"left":"2/2","right":"1 entero"},{"left":"1/10","right":"0,1"}],
    "explanation":"Dos fracciones son la misma cantidad si al simplificarlas dan lo mismo: 6/8 se simplifica a 3/4."}]},
  {"key":"debrief","name":"Debrief","blocks":[
   {"id":"m3","type":"number","text":"Si 3/4 es lo mismo que 6/8, ¿qué número es igual a 9/12?","answer":0.75,"tolerance":0.01,"explanation":"9/12 también se simplifica a 3/4, que en decimales es 0,75."},
   {"id":"m4","type":"self_report","text":"¿Cuánto te acordabas de las cartas?"}]}]}',
 '[{"id":"g1","label":"Reconoce fracciones equivalentes","levels":["Todavía no","A veces","Siempre"]}]'),

('Contrarreloj de cálculo', true,
 '{"experience":"game","lens":"game","disciplines":["Matemática · cálculo mental"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
  {"key":"rules","name":"Reglas","blocks":[
   {"id":"t1","type":"paragraph","text":"Seis cuentas, sesenta segundos. No hace falta responder todas: vale más pensar que apurarse."}]},
  {"key":"play","name":"Jugar","blocks":[
   {"id":"t2","type":"game","text":"Cálculo mental contra el reloj","engine":"time_attack","seconds":60,
    "questions":[
     {"text":"25 × 4","options":["90","100","110"],"correct":1},
     {"text":"La mitad de 86","options":["43","44","38"],"correct":0},
     {"text":"7 × 8","options":["54","56","64"],"correct":1},
     {"text":"120 ÷ 4","options":["30","24","40"],"correct":0},
     {"text":"El doble de 145","options":["280","290","300"],"correct":1},
     {"text":"99 + 47","options":["146","136","156"],"correct":0}],
    "explanation":"Los atajos que sirven: para ×4, duplicar dos veces. Para 99 + algo, sumar 100 y restar 1."}]},
  {"key":"debrief","name":"Debrief","blocks":[
   {"id":"t3","type":"question","text":"¿Alguna la resolviste con un atajo? Contá cuál."},
   {"id":"t4","type":"self_report","text":"¿Te puso nervioso el reloj?"}]}]}',
 '[{"id":"g1","label":"Usa atajos de cálculo mental","levels":["Cuenta todo","A veces","Casi siempre"]}]');
