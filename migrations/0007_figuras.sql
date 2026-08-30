-- Una actividad donde la idea se entiende moviendo la figura, no leyéndola.
insert into actividad (titulo, es_receta, composicion, documento, rubrica) values
('Fracciones que se tocan', true,
 '{"experiencia":"practica","lente":"cpa","disciplinas":["Matemática · fracciones"],"escenario":["pantalla"],"social":"solo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"concreto","nombre":"Concreto","bloques":[
   {"id":"n1","tipo":"parrafo","texto":"Una barra entera partida en cuatro pedazos iguales. Pintá los que se piden."},
   {"id":"n2","tipo":"manipulable","texto":"Pintá tres cuartos de la barra","figura":"fraccion","partes":4,"respuesta":3,
    "pista":"Un cuarto es cada pedazo. Tres cuartos son tres pedazos.","explicacion":"Abajo va en cuántas partes se cortó el entero (4) y arriba cuántas pintaste (3)."},
   {"id":"n3","tipo":"manipulable","texto":"Ahora pintá la mitad de esta barra de seis partes","figura":"fraccion","partes":6,"respuesta":3,
    "explicacion":"La mitad de 6 partes son 3: por eso 3/6 y 1/2 son la misma cantidad."}]},
  {"clave":"pictorico","nombre":"Pictórico","bloques":[
   {"id":"n4","tipo":"parrafo","texto":"La misma cantidad, ahora sobre una recta. Arrastrá el punto."},
   {"id":"n5","tipo":"manipulable","texto":"Poné el punto en 3/4","figura":"recta","min":0,"max":2,"paso":0.25,"respuesta":0.75,"tolerancia":0,
    "pista":"Entre 0 y 1 hay cuatro saltos. Contá tres.","explicacion":"Cada marca chica es un cuarto: 0,25 · 0,5 · 0,75. La tercera es 3/4."},
   {"id":"n6","tipo":"manipulable","texto":"¿Dónde cae 1 y 1/2?","figura":"recta","min":0,"max":2,"paso":0.25,"respuesta":1.5,"tolerancia":0,
    "explicacion":"Un entero y medio: pasás el 1 y avanzás dos cuartos más."}]},
  {"clave":"abstracto","nombre":"Abstracto","bloques":[
   {"id":"n7","tipo":"parrafo","texto":"La balanza pesa igual de los dos lados solo cuando x vale lo justo."},
   {"id":"n8","tipo":"manipulable","texto":"Equilibrá la balanza: 2·x + 3 = 11","figura":"balanza","coefA":2,"coefB":3,"coefC":11,
    "pista":"Probá subiendo de a uno y mirá para qué lado se inclina.","explicacion":"Con x = 4: 2·4 + 3 = 11. Los dos platos pesan lo mismo."},
   {"id":"n9","tipo":"autoreporte","texto":"¿Te ayudó mover la figura para entenderlo?"}]}]}',
 '[{"id":"f1","label":"Ubica una fracción en la recta","niveles":["Todavía no","Con ayuda","Solo"]},{"id":"f2","label":"Reconoce fracciones equivalentes","niveles":["Todavía no","A veces","Siempre"]}]');
