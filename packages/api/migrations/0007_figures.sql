-- An activity where the idea lands by moving the figure, not by reading about it.
insert into activities (title, is_recipe, composition, document, rubric) values
('Fracciones que se tocan', true,
 '{"experience":"practice","lens":"cpa","disciplines":["Matemática · fracciones"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
  {"key":"concrete","name":"Concreto","blocks":[
   {"id":"n1","type":"paragraph","text":"Una barra entera partida en cuatro pedazos iguales. Pintá los que se piden."},
   {"id":"n2","type":"manipulative","text":"Pintá tres cuartos de la barra","figure":"fraction_bar","parts":4,"answer":3,
    "hint":"Un cuarto es cada pedazo. Tres cuartos son tres pedazos.","explanation":"Abajo va en cuántas partes se cortó el entero (4) y arriba cuántas pintaste (3)."},
   {"id":"n3","type":"manipulative","text":"Ahora pintá la mitad de esta barra de seis partes","figure":"fraction_bar","parts":6,"answer":3,
    "explanation":"La mitad de 6 partes son 3: por eso 3/6 y 1/2 son la misma cantidad."}]},
  {"key":"pictorial","name":"Pictórico","blocks":[
   {"id":"n4","type":"paragraph","text":"La misma cantidad, ahora sobre una recta. Arrastrá el punto."},
   {"id":"n5","type":"manipulative","text":"Poné el punto en 3/4","figure":"number_line","min":0,"max":2,"step":0.25,"answer":0.75,"tolerance":0,
    "hint":"Entre 0 y 1 hay cuatro saltos. Contá tres.","explanation":"Cada marca chica es un cuarto: 0,25 · 0,5 · 0,75. La tercera es 3/4."},
   {"id":"n6","type":"manipulative","text":"¿Dónde cae 1 y 1/2?","figure":"number_line","min":0,"max":2,"step":0.25,"answer":1.5,"tolerance":0,
    "explanation":"Un entero y medio: pasás el 1 y avanzás dos cuartos más."}]},
  {"key":"abstract","name":"Abstracto","blocks":[
   {"id":"n7","type":"paragraph","text":"La balanza pesa igual de los dos lados solo cuando x vale lo justo."},
   {"id":"n8","type":"manipulative","text":"Equilibrá la balanza: 2·x + 3 = 11","figure":"balance","coefA":2,"coefB":3,"coefC":11,
    "hint":"Probá subiendo de a uno y mirá para qué lado se inclina.","explanation":"Con x = 4: 2·4 + 3 = 11. Los dos platos pesan lo mismo."},
   {"id":"n9","type":"self_report","text":"¿Te ayudó mover la figura para entenderlo?"}]}]}',
 '[{"id":"f1","label":"Ubica una fracción en la recta","levels":["Todavía no","Con ayuda","Solo"]},{"id":"f2","label":"Reconoce fracciones equivalentes","levels":["Todavía no","A veces","Siempre"]}]');
