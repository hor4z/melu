-- The recipes melu ships with. They are content: a teacher duplicates one and makes it theirs.
-- Keys are technical and travel to the client; every text is content and stays in Spanish.
insert into activities (title, is_recipe, composition, document, rubric) values

('Puente de espagueti', true,
 '{"experience":"challenge","lens":"design_thinking","disciplines":["Matemática · medida","Física · fuerzas","Lengua · argumentar"],"setting":["kit"],"social":"team","evidence":["photo","audio"]}',
 '{"phases":[
  {"key":"empathize","name":"Empatizar","blocks":[
   {"id":"b1","type":"paragraph","text":"Un puente tiene que aguantar un vaso lleno de agua entre dos mesas separadas 30 cm. Antes de construir, miren tres puentes reales: ¿qué formas se repiten?"},
   {"id":"b2","type":"question","text":"¿Qué forma geométrica aparece más en los puentes que vieron? ¿Por qué creen que es esa?"}]},
  {"key":"define","name":"Definir","blocks":[
   {"id":"b3","type":"question","text":"Escriban en una frase qué tiene que lograr su puente y con qué límite de materiales (20 espaguetis, 1 m de cinta)."}]},
  {"key":"ideate","name":"Idear","blocks":[
   {"id":"b4","type":"paragraph","text":"Cada integrante dibuja un diseño distinto. Después eligen uno, o mezclan dos."},
   {"id":"b5","type":"evidence","text":"Foto de los bocetos del equipo","media":"photo"}]},
  {"key":"prototype","name":"Prototipar","blocks":[
   {"id":"b6","type":"callout","text":"Midan el largo real de cada pieza antes de pegarla. La diferencia entre lo que dibujaron y lo que midieron es parte de lo que vamos a mirar."},
   {"id":"b7","type":"evidence","text":"Foto del puente terminado, de costado","media":"photo"}]},
  {"key":"test","name":"Probar","blocks":[
   {"id":"b8","type":"question","text":"¿Aguantó? ¿Dónde se rompió o se dobló primero? ¿Qué cambiarían en una segunda versión?"},
   {"id":"b9","type":"evidence","text":"Audio de 60 segundos: expliquen por qué creen que se comportó así","media":"audio"},
   {"id":"b10","type":"self_report","text":"¿Cuánto les costó trabajar en equipo hoy?"}]}]}',
 '[{"id":"r1","label":"Midió y usó las medidas al construir","levels":["Todavía no","A veces","Siempre"]},
  {"id":"r2","label":"Explica el comportamiento del puente con una razón física","levels":["No aparece","Aparece una razón","Relaciona forma y fuerza"]},
  {"id":"r3","label":"Argumenta el rediseño","levels":["Sin propuesta","Propone sin razón","Propone y justifica"]}]'),

('Cartógrafos del barrio', true,
 '{"experience":"real_mission","lens":"project","disciplines":["Matemática · escala","Sociales · geografía","Lengua · escritura"],"setting":["street","paper"],"social":"pair","evidence":["photo"]}',
 '{"phases":[
  {"key":"question","name":"Pregunta","blocks":[
   {"id":"b1","type":"paragraph","text":"¿Cuánto mide de verdad la cuadra de la escuela? Nadie lo sabe. Ustedes lo van a averiguar caminando."}]},
  {"key":"research","name":"Investigar","blocks":[
   {"id":"b2","type":"paragraph","text":"Midan su paso: caminen 10 pasos junto a una cinta métrica y dividan. Ese es su patrón."},
   {"id":"b3","type":"question","text":"¿Cuánto mide un paso tuyo, en centímetros? ¿Y uno de tu compañero? ¿Por qué no da lo mismo?"}]},
  {"key":"create","name":"Crear","blocks":[
   {"id":"b4","type":"paragraph","text":"Recorran la cuadra contando pasos. Pasen el resultado al papel con una escala: 1 cm en la hoja = 5 m en la calle."},
   {"id":"b5","type":"evidence","text":"Foto del mapa, con la escala escrita","media":"photo"}]},
  {"key":"present","name":"Presentar","blocks":[
   {"id":"b6","type":"question","text":"Marquen tres lugares que les importan de esa cuadra y escriban por qué, en dos renglones cada uno."}]},
  {"key":"reflect","name":"Reflexionar","blocks":[
   {"id":"b7","type":"question","text":"Si hubieran medido con pasos de un adulto, ¿el mapa cambiaría? ¿Qué cambiaría y qué no?"}]}]}',
 '[{"id":"r1","label":"Aplica la escala correctamente","levels":["No","Con errores","Sí"]},
  {"id":"r2","label":"El texto explica el recorrido","levels":["No","Parcialmente","Claramente"]}]'),

('Una pieza para alguien', true,
 '{"experience":"creation","lens":"design_thinking","disciplines":["Matemática · medida","Diseño","Empatía"],"setting":["printer_3d","home"],"social":"alone","evidence":["file","photo","audio"]}',
 '{"phases":[
  {"key":"empathize","name":"Empatizar","blocks":[
   {"id":"b1","type":"paragraph","text":"Entrevistá a alguien de tu casa durante cinco minutos. Buscá una molestia chica y cotidiana: algo que se cae, que no cierra, que no tiene dónde ir."},
   {"id":"b2","type":"question","text":"¿Qué molestia encontraste? Contala con las palabras de la persona."}]},
  {"key":"define","name":"Definir","blocks":[
   {"id":"b3","type":"question","text":"La pieza tiene que ______ para que ______ pueda ______. Completá la frase."}]},
  {"key":"ideate","name":"Idear","blocks":[
   {"id":"b4","type":"evidence","text":"Foto de tres bocetos distintos, con medidas en milímetros","media":"photo"}]},
  {"key":"prototype","name":"Prototipar","blocks":[
   {"id":"b5","type":"callout","text":"Medí el objeto real con regla antes de modelar. El STL y la foto de la pieza impresa van juntos: la distancia entre ambos es lo que vamos a mirar."},
   {"id":"b6","type":"evidence","text":"El archivo STL","media":"file"},
   {"id":"b7","type":"evidence","text":"Foto de la pieza impresa, puesta donde va","media":"photo"}]},
  {"key":"test","name":"Probar","blocks":[
   {"id":"b8","type":"evidence","text":"Audio: qué dijo la persona al usarla","media":"audio"},
   {"id":"b9","type":"question","text":"¿Qué medida cambiarías en la versión dos?"}]}]}',
 '[{"id":"r1","label":"Las medidas del modelo salen de medir el objeto real","levels":["No","En parte","Sí"]},
  {"id":"r2","label":"La pieza responde a la necesidad de la persona","levels":["No","Parcialmente","Sí, y lo probó"]}]'),

('El robot que cuenta', true,
 '{"experience":"build","lens":"project","disciplines":["Matemática · patrones","Programación"],"setting":["robot"],"social":"team","evidence":["file","photo"]}',
 '{"phases":[
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
   {"id":"b8","type":"choice","text":"Los números donde se prende la luz se llaman…","options":["divisores de 3","múltiplos de 3","números primos","números pares"],"correct":1,"explanation":"Son los múltiplos de 3: lo que sale de multiplicar 3 por 1, 2, 3, 4… Justo lo que hace el bucle."}]}]}',
 '[{"id":"r1","label":"Usa repetición en vez de enumerar","levels":["Enumera","Mezcla","Usa un bucle"]},
  {"id":"r2","label":"Identifica el patrón numérico","levels":["No","Lo describe","Lo nombra: múltiplos"]}]'),

('Fracciones en la cocina', true,
 '{"experience":"practice","lens":"cpa","disciplines":["Matemática · fracciones","Lengua · instrucciones"],"setting":["home","kitchen"],"social":"family","evidence":["photo","audio"]}',
 '{"phases":[
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
   {"id":"f10","type":"self_report","text":"¿Qué tan seguro estás de tu respuesta?"}]}]}',
 '[{"id":"r1","label":"Pasa de lo concreto al dibujo sin perder cantidades","levels":["No","Con ayuda","Solo"]},
  {"id":"r2","label":"Escribe la operación con fracciones","levels":["No","Con errores","Correcta y explicada"]}]'),

('Escape del aula', true,
 '{"experience":"game","lens":"game","disciplines":["Matemática · ecuaciones","Lengua · lectura"],"setting":["paper","screen"],"social":"team","evidence":["answer"]}',
 '{"phases":[
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
   {"id":"e9","type":"self_report","text":"¿Cuánto te divertiste?"}]}]}',
 '[{"id":"r1","label":"Traduce el enunciado a una operación","levels":["No","A veces","Siempre"]},
  {"id":"r2","label":"En el debrief nombra la operación","levels":["No","Con ayuda","Solo"]}]'),

('Cuento con números', true,
 '{"experience":"creation","lens":"thinking_routine","disciplines":["Lengua · narrativa","Matemática · un concepto a elección"],"setting":["screen","paper"],"social":"alone","evidence":["answer","audio"]}',
 '{"phases":[
  {"key":"see","name":"Veo","blocks":[
   {"id":"b1","type":"paragraph","text":"Elegí un concepto que estés aprendiendo: el cero, las fracciones, un triángulo, el infinito. Escribí tres cosas que ves cuando lo pensás."},
   {"id":"b2","type":"question","text":"Tus tres cosas:"}]},
  {"key":"think","name":"Pienso","blocks":[
   {"id":"b3","type":"question","text":"Si ese concepto fuera un personaje, ¿qué problema tendría? ¿Quién sería su enemigo?"}]},
  {"key":"wonder","name":"Me pregunto","blocks":[
   {"id":"b4","type":"paragraph","text":"Escribí el cuento. Diez renglones alcanzan. El concepto tiene que hacer algo que solo él puede hacer."},
   {"id":"b5","type":"question","text":"El cuento:"},
   {"id":"b6","type":"evidence","text":"Audio: leelo en voz alta","media":"audio"}]}]}',
 '[{"id":"r1","label":"El concepto matemático funciona bien en la historia","levels":["Está de adorno","Aparece","Es el motor del cuento"],"discipline":"Matemática"},
  {"id":"r2","label":"Narrativa: conflicto y resolución","levels":["No hay","Uno de los dos","Los dos"],"discipline":"Lengua"}]'),

('La tienda del grupo', true,
 '{"experience":"simulation","lens":"project","disciplines":["Matemática · decimales","Matemática · dinero","Ciudadanía · acuerdos"],"setting":["screen","paper"],"social":"whole_group","evidence":["answer"]}',
 '{"phases":[
  {"key":"question","name":"Semana 1 · Abrir","blocks":[
   {"id":"b1","type":"paragraph","text":"El grupo abre una tienda. Cada uno recibe 100 melus. Hay que decidir juntos qué se vende y a qué precio."},
   {"id":"b2","type":"question","text":"¿Qué vendemos y cuánto cuesta cada cosa? Anotá la lista con precios con centavos."}]},
  {"key":"research","name":"Semana 2 · Comprar","blocks":[
   {"id":"b3","type":"question","text":"Comprá tres cosas. Escribí el total y el vuelto de un billete de 50."}]},
  {"key":"create","name":"Semana 3 · Ahorrar","blocks":[
   {"id":"b4","type":"question","text":"Algo cuesta 37,50 y tenés 22,75. ¿Cuánto te falta? ¿En cuántas semanas llegás si ahorrás 5 por semana?"}]},
  {"key":"present","name":"Semana 4 · Decidir","blocks":[
   {"id":"b5","type":"question","text":"La tienda tiene 180 melus de ganancia. Propongan y voten qué hacer con eso. Escribí qué se decidió y cómo se votó."}]},
  {"key":"reflect","name":"Cierre","blocks":[
   {"id":"b6","type":"self_report","text":"¿Qué tan fácil te resultó calcular con centavos al final, comparado con el principio?"}]}]}',
 '[{"id":"r1","label":"Opera con decimales en contexto de dinero","levels":["No","Con errores","Correctamente"]},
  {"id":"r2","label":"Participa de la decisión colectiva","levels":["No","Vota","Propone y argumenta"]}]'),

('Reto de la semana', true,
 '{"experience":"challenge","lens":"polya","disciplines":["Matemática · resolución de problemas"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
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
   {"id":"r7","type":"self_report","text":"¿Cuánto te costó?"}]}]}',
 '[{"id":"r1","label":"Formula un plan antes de operar","levels":["No","Vago","Concreto"]},
  {"id":"r2","label":"Verifica el resultado contra el enunciado","levels":["No","Parcial","Completo"]}]'),

('¿Cómo llegaste hoy?', true,
 '{"experience":"checkin","lens":"no_lens","disciplines":["Bienestar"],"setting":["screen"],"social":"alone","evidence":["self_report"]}',
 '{"phases":[
  {"key":"single","name":"Hoy","blocks":[
   {"id":"b1","type":"self_report","text":"¿Con cuánta energía llegaste hoy?"},
   {"id":"b2","type":"self_report","text":"¿Qué tan tranquilo te sentís?"},
   {"id":"b3","type":"question","text":"¿Hay algo que quieras que sepa? (opcional, nadie más lo ve)"}]}]}',
 '[]'),

('Recicla y clasifica', true,
 '{"experience":"game","lens":"game","disciplines":["Ciencias · materiales","Ciudadanía · ambiente"],"setting":["screen"],"social":"pair","evidence":["answer"]}',
 '{"phases":[
  {"key":"rules","name":"Reglas","blocks":[
   {"id":"c1","type":"paragraph","text":"Cada residuo va en un contenedor. Arrastralos, o tocá el residuo y después la caja."},
   {"id":"c2","type":"callout","text":"Si dudás, pensá de qué está hecho, no para qué servía."}]},
  {"key":"play","name":"Jugar","blocks":[
   {"id":"c3","type":"game","text":"Poné cada residuo en su contenedor","engine":"sort","categories":[{"name":"Papel y cartón","items":["Caja de zapatos","Hoja de carpeta","Rollo de cocina"]},{"name":"Plástico","items":["Botella de gaseosa","Tapita","Bolsa de fideos"]},{"name":"Orgánico","items":["Cáscara de banana","Yerba usada","Restos de manzana"]}],"explanation":"El material manda: la caja de zapatos es cartón aunque haya traído zapatos, y la yerba es orgánica aunque venga en paquete."}]},
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
   {"id":"m2","type":"game","text":"Encontrá las parejas","pairs":[{"left":"1/2","right":"0,5"},{"left":"1/4","right":"0,25"},{"left":"3/4","right":"6/8"},{"left":"1/3","right":"2/6"},{"left":"2/2","right":"1 entero"},{"left":"1/10","right":"0,1"}],"engine":"memory","explanation":"Dos fracciones son la misma cantidad si al simplificarlas dan lo mismo: 6/8 se simplifica a 3/4."}]},
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
   {"id":"t2","type":"game","text":"Cálculo mental contra el reloj","engine":"time_attack","questions":[{"text":"25 × 4","options":["90","100","110"],"correct":1},{"text":"La mitad de 86","options":["43","44","38"],"correct":0},{"text":"7 × 8","options":["54","56","64"],"correct":1},{"text":"120 ÷ 4","options":["30","24","40"],"correct":0},{"text":"El doble de 145","options":["280","290","300"],"correct":1},{"text":"99 + 47","options":["146","136","156"],"correct":0}],"seconds":60,"explanation":"Los atajos que sirven: para ×4, duplicar dos veces. Para 99 + algo, sumar 100 y restar 1."}]},
  {"key":"debrief","name":"Debrief","blocks":[
   {"id":"t3","type":"question","text":"¿Alguna la resolviste con un atajo? Contá cuál."},
   {"id":"t4","type":"self_report","text":"¿Te puso nervioso el reloj?"}]}]}',
 '[{"id":"g1","label":"Usa atajos de cálculo mental","levels":["Cuenta todo","A veces","Casi siempre"]}]'),

('Fracciones que se tocan', true,
 '{"experience":"practice","lens":"cpa","disciplines":["Matemática · fracciones"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
  {"key":"concrete","name":"Concreto","blocks":[
   {"id":"n1","type":"paragraph","text":"Una barra entera partida en cuatro pedazos iguales. Pintá los que se piden."},
   {"id":"n2","type":"manipulative","text":"Pintá tres cuartos de la barra","answer":3,"figure":"fraction_bar","parts":4,"hint":"Un cuarto es cada pedazo. Tres cuartos son tres pedazos.","explanation":"Abajo va en cuántas partes se cortó el entero (4) y arriba cuántas pintaste (3)."},
   {"id":"n3","type":"manipulative","text":"Ahora pintá la mitad de esta barra de seis partes","answer":3,"figure":"fraction_bar","parts":6,"explanation":"La mitad de 6 partes son 3: por eso 3/6 y 1/2 son la misma cantidad."}]},
  {"key":"pictorial","name":"Pictórico","blocks":[
   {"id":"n4","type":"paragraph","text":"La misma cantidad, ahora sobre una recta. Arrastrá el punto."},
   {"id":"n5","type":"manipulative","text":"Poné el punto en 3/4","answer":0.75,"tolerance":0,"figure":"number_line","min":0,"max":2,"step":0.25,"hint":"Entre 0 y 1 hay cuatro saltos. Contá tres.","explanation":"Cada marca chica es un cuarto: 0,25 · 0,5 · 0,75. La tercera es 3/4."},
   {"id":"n6","type":"manipulative","text":"¿Dónde cae 1 y 1/2?","answer":1.5,"tolerance":0,"figure":"number_line","min":0,"max":2,"step":0.25,"explanation":"Un entero y medio: pasás el 1 y avanzás dos cuartos más."}]},
  {"key":"abstract","name":"Abstracto","blocks":[
   {"id":"n7","type":"paragraph","text":"La balanza pesa igual de los dos lados solo cuando x vale lo justo."},
   {"id":"n8","type":"manipulative","text":"Equilibrá la balanza: 2·x + 3 = 11","figure":"balance","coefA":2,"coefB":3,"coefC":11,"hint":"Probá subiendo de a uno y mirá para qué lado se inclina.","explanation":"Con x = 4: 2·4 + 3 = 11. Los dos platos pesan lo mismo."},
   {"id":"n9","type":"self_report","text":"¿Te ayudó mover la figura para entenderlo?"}]}]}',
 '[{"id":"f1","label":"Ubica una fracción en la recta","levels":["Todavía no","Con ayuda","Solo"]},
  {"id":"f2","label":"Reconoce fracciones equivalentes","levels":["Todavía no","A veces","Siempre"]}]');
