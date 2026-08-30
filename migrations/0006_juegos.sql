-- Tres recetas que son juegos. Como en Genially: una mecánica conocida con contenido propio.
insert into actividad (titulo, es_receta, composicion, documento, rubrica) values

('Recicla y clasifica', true,
 '{"experiencia":"juego","lente":"juego","disciplinas":["Ciencias · materiales","Ciudadanía · ambiente"],"escenario":["pantalla"],"social":"pareja","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"reglas","nombre":"Reglas","bloques":[
   {"id":"c1","tipo":"parrafo","texto":"Cada residuo va en un contenedor. Arrastralos, o tocá el residuo y después la caja."},
   {"id":"c2","tipo":"destacado","texto":"Si dudás, pensá de qué está hecho, no para qué servía."}]},
  {"clave":"jugar","nombre":"Jugar","bloques":[
   {"id":"c3","tipo":"juego","texto":"Poné cada residuo en su contenedor","motor":"clasificar",
    "categorias":[
     {"nombre":"Papel y cartón","items":["Caja de zapatos","Hoja de carpeta","Rollo de cocina"]},
     {"nombre":"Plástico","items":["Botella de gaseosa","Tapita","Bolsa de fideos"]},
     {"nombre":"Orgánico","items":["Cáscara de banana","Yerba usada","Restos de manzana"]}],
    "explicacion":"El material manda: la caja de zapatos es cartón aunque haya traído zapatos, y la yerba es orgánica aunque venga en paquete."}]},
  {"clave":"debrief","nombre":"Debrief","bloques":[
   {"id":"c4","tipo":"pregunta","texto":"¿Cuál te costó más decidir y por qué?"},
   {"id":"c5","tipo":"evidencia","texto":"Foto de los tachos de tu casa o del aula: ¿están separados así?","kind":"foto"}]}]}',
 '[{"id":"g1","label":"Clasifica por material y no por uso","niveles":["Todavía no","A veces","Siempre"]}]'),

('Memoria de fracciones', true,
 '{"experiencia":"juego","lente":"juego","disciplinas":["Matemática · fracciones"],"escenario":["pantalla"],"social":"solo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"reglas","nombre":"Reglas","bloques":[
   {"id":"m1","tipo":"parrafo","texto":"Cada fracción tiene su pareja escrita de otra forma. Dá vuelta dos cartas por vez y encontralas todas."}]},
  {"clave":"jugar","nombre":"Jugar","bloques":[
   {"id":"m2","tipo":"juego","texto":"Encontrá las parejas","motor":"memoria",
    "pares":[{"izq":"1/2","der":"0,5"},{"izq":"1/4","der":"0,25"},{"izq":"3/4","der":"6/8"},{"izq":"1/3","der":"2/6"},{"izq":"2/2","der":"1 entero"},{"izq":"1/10","der":"0,1"}],
    "explicacion":"Dos fracciones son la misma cantidad si al simplificarlas dan lo mismo: 6/8 se simplifica a 3/4."}]},
  {"clave":"debrief","nombre":"Debrief","bloques":[
   {"id":"m3","tipo":"numerico","texto":"Si 3/4 es lo mismo que 6/8, ¿qué número es igual a 9/12?","respuesta":0.75,"tolerancia":0.01,"explicacion":"9/12 también se simplifica a 3/4, que en decimales es 0,75."},
   {"id":"m4","tipo":"autoreporte","texto":"¿Cuánto te acordabas de las cartas?"}]}]}',
 '[{"id":"g1","label":"Reconoce fracciones equivalentes","niveles":["Todavía no","A veces","Siempre"]}]'),

('Contrarreloj de cálculo', true,
 '{"experiencia":"juego","lente":"juego","disciplinas":["Matemática · cálculo mental"],"escenario":["pantalla"],"social":"solo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"reglas","nombre":"Reglas","bloques":[
   {"id":"t1","tipo":"parrafo","texto":"Seis cuentas, sesenta segundos. No hace falta responder todas: vale más pensar que apurarse."}]},
  {"clave":"jugar","nombre":"Jugar","bloques":[
   {"id":"t2","tipo":"juego","texto":"Cálculo mental contra el reloj","motor":"contrarreloj","segundos":60,
    "preguntas":[
     {"texto":"25 × 4","opciones":["90","100","110"],"correcta":1},
     {"texto":"La mitad de 86","opciones":["43","44","38"],"correcta":0},
     {"texto":"7 × 8","opciones":["54","56","64"],"correcta":1},
     {"texto":"120 ÷ 4","opciones":["30","24","40"],"correcta":0},
     {"texto":"El doble de 145","opciones":["280","290","300"],"correcta":1},
     {"texto":"99 + 47","opciones":["146","136","156"],"correcta":0}],
    "explicacion":"Los atajos que sirven: para ×4, duplicar dos veces. Para 99 + algo, sumar 100 y restar 1."}]},
  {"clave":"debrief","nombre":"Debrief","bloques":[
   {"id":"t3","tipo":"pregunta","texto":"¿Alguna la resolviste con un atajo? Contá cuál."},
   {"id":"t4","tipo":"autoreporte","texto":"¿Te puso nervioso el reloj?"}]}]}',
 '[{"id":"g1","label":"Usa atajos de cálculo mental","niveles":["Cuenta todo","A veces","Casi siempre"]}]');
