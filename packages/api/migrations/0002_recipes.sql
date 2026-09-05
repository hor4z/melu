-- Ten global recipes (space_id null). A teacher duplicates one and makes it theirs.
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
 '[{"id":"r1","label":"Midió y usó las medidas al construir","levels":["Todavía no","A veces","Siempre"]},{"id":"r2","label":"Explica el comportamiento del puente con una razón física","levels":["No aparece","Aparece una razón","Relaciona forma y fuerza"]},{"id":"r3","label":"Argumenta el rediseño","levels":["Sin propuesta","Propone sin razón","Propone y justifica"]}]'),

('Cartógrafos del barrio', true,
 '{"experience":"real_mission","lens":"project","disciplines":["Matemática · escala","Sociales · geografía","Lengua · escritura"],"setting":["street","paper"],"social":"pair","evidence":["photo"]}',
 '{"phases":[
  {"key":"question","name":"Pregunta","blocks":[{"id":"b1","type":"paragraph","text":"¿Cuánto mide de verdad la cuadra de la escuela? Nadie lo sabe. Ustedes lo van a averiguar caminando."}]},
  {"key":"research","name":"Investigar","blocks":[
   {"id":"b2","type":"paragraph","text":"Midan su paso: caminen 10 pasos junto a una cinta métrica y dividan. Ese es su patrón."},
   {"id":"b3","type":"question","text":"¿Cuánto mide un paso tuyo, en centímetros? ¿Y uno de tu compañero? ¿Por qué no da lo mismo?"}]},
  {"key":"create","name":"Crear","blocks":[
   {"id":"b4","type":"paragraph","text":"Recorran la cuadra contando pasos. Pasen el resultado al papel con una escala: 1 cm en la hoja = 5 m en la calle."},
   {"id":"b5","type":"evidence","text":"Foto del mapa, con la escala escrita","media":"photo"}]},
  {"key":"present","name":"Presentar","blocks":[{"id":"b6","type":"question","text":"Marquen tres lugares que les importan de esa cuadra y escriban por qué, en dos renglones cada uno."}]},
  {"key":"reflect","name":"Reflexionar","blocks":[{"id":"b7","type":"question","text":"Si hubieran medido con pasos de un adulto, ¿el mapa cambiaría? ¿Qué cambiaría y qué no?"}]}]}',
 '[{"id":"r1","label":"Aplica la escala correctamente","levels":["No","Con errores","Sí"]},{"id":"r2","label":"El texto explica el recorrido","levels":["No","Parcialmente","Claramente"]}]'),

('Una pieza para alguien', true,
 '{"experience":"creation","lens":"design_thinking","disciplines":["Matemática · medida","Diseño","Empatía"],"setting":["printer_3d","home"],"social":"alone","evidence":["file","photo","audio"]}',
 '{"phases":[
  {"key":"empathize","name":"Empatizar","blocks":[
   {"id":"b1","type":"paragraph","text":"Entrevistá a alguien de tu casa durante cinco minutos. Buscá una molestia chica y cotidiana: algo que se cae, que no cierra, que no tiene dónde ir."},
   {"id":"b2","type":"question","text":"¿Qué molestia encontraste? Contala con las palabras de la persona."}]},
  {"key":"define","name":"Definir","blocks":[{"id":"b3","type":"question","text":"La pieza tiene que ______ para que ______ pueda ______. Completá la frase."}]},
  {"key":"ideate","name":"Idear","blocks":[{"id":"b4","type":"evidence","text":"Foto de tres bocetos distintos, con medidas en milímetros","media":"photo"}]},
  {"key":"prototype","name":"Prototipar","blocks":[
   {"id":"b5","type":"callout","text":"Medí el objeto real con regla antes de modelar. El STL y la foto de la pieza impresa van juntos: la distancia entre ambos es lo que vamos a mirar."},
   {"id":"b6","type":"evidence","text":"El archivo STL","media":"file"},
   {"id":"b7","type":"evidence","text":"Foto de la pieza impresa, puesta donde va","media":"photo"}]},
  {"key":"test","name":"Probar","blocks":[
   {"id":"b8","type":"evidence","text":"Audio: qué dijo la persona al usarla","media":"audio"},
   {"id":"b9","type":"question","text":"¿Qué medida cambiarías en la versión dos?"}]}]}',
 '[{"id":"r1","label":"Las medidas del modelo salen de medir el objeto real","levels":["No","En parte","Sí"]},{"id":"r2","label":"La pieza responde a la necesidad de la persona","levels":["No","Parcialmente","Sí, y lo probó"]}]'),

('El robot que cuenta', true,
 '{"experience":"build","lens":"project","disciplines":["Matemática · patrones","Programación"],"setting":["robot"],"social":"team","evidence":["file","photo"]}',
 '{"phases":[
  {"key":"question","name":"Pregunta","blocks":[{"id":"b1","type":"paragraph","text":"El robot tiene que avanzar y prender una luz cada tres pasos, sin que le digan cuándo. ¿Cómo sabe cuándo es el tercero?"}]},
  {"key":"research","name":"Investigar","blocks":[{"id":"b2","type":"question","text":"Escriban la secuencia de los primeros 15 pasos marcando en cuáles se prende la luz. ¿Qué tienen en común esos números?"}]},
  {"key":"create","name":"Crear","blocks":[
   {"id":"b3","type":"paragraph","text":"Programen el robot. Pista: no hace falta decirle 3, 6, 9… hay una forma de repetir."},
   {"id":"b4","type":"evidence","text":"El programa","media":"file"},
   {"id":"b5","type":"evidence","text":"Foto del robot en el paso 9","media":"photo"}]},
  {"key":"present","name":"Presentar","blocks":[{"id":"b6","type":"question","text":"Ahora cambien: cada cuatro pasos. ¿Qué tuvieron que tocar en el programa? ¿Fue una cosa o muchas?"}]},
  {"key":"reflect","name":"Reflexionar","blocks":[{"id":"b7","type":"check","text":"Si el robot prende la luz cada 3 pasos, ¿en el paso 27 la prende?","options":["Sí","No","Depende"],"correct":0}]}]}',
 '[{"id":"r1","label":"Usa repetición en vez de enumerar","levels":["Enumera","Mezcla","Usa un bucle"]},{"id":"r2","label":"Identifica el patrón numérico","levels":["No","Lo describe","Lo nombra: múltiplos"]}]'),

('Fracciones en la cocina', true,
 '{"experience":"practice","lens":"cpa","disciplines":["Matemática · fracciones","Lengua · instrucciones"],"setting":["home","kitchen"],"social":"family","evidence":["photo","audio"]}',
 '{"phases":[
  {"key":"concrete","name":"Concreto","blocks":[
   {"id":"b1","type":"paragraph","text":"Esta receta es para 4 personas. En tu casa son 6. Elegí algo simple: panqueques, limonada, ensalada de frutas."},
   {"id":"b2","type":"paragraph","text":"Con tazas y cucharas de verdad, armá la cantidad para 4. Después armá la cantidad para 6 al lado."},
   {"id":"b3","type":"evidence","text":"Foto de las dos cantidades, una al lado de la otra","media":"photo"}]},
  {"key":"pictorial","name":"Pictórico","blocks":[
   {"id":"b4","type":"paragraph","text":"Dibujá las tazas. Cada taza es un rectángulo; si es media taza, pintá la mitad."},
   {"id":"b5","type":"evidence","text":"Foto del dibujo","media":"photo"}]},
  {"key":"abstract","name":"Abstracto","blocks":[
   {"id":"b6","type":"question","text":"Si la receta dice 1/2 taza de azúcar para 4, ¿cuánto va para 6? Escribí la cuenta, no solo el resultado."},
   {"id":"b7","type":"evidence","text":"Audio: explicale a alguien de tu casa cómo lo pensaste","media":"audio"},
   {"id":"b8","type":"self_report","text":"¿Qué tan seguro estás de tu respuesta?"}]}]}',
 '[{"id":"r1","label":"Pasa de lo concreto al dibujo sin perder cantidades","levels":["No","Con ayuda","Solo"]},{"id":"r2","label":"Escribe la operación con fracciones","levels":["No","Con errores","Correcta y explicada"]}]'),

('Escape del aula', true,
 '{"experience":"game","lens":"game","disciplines":["Matemática · ecuaciones","Lengua · lectura"],"setting":["paper","screen"],"social":"team","evidence":["answer"]}',
 '{"phases":[
  {"key":"rules","name":"Reglas","blocks":[{"id":"b1","type":"paragraph","text":"Cinco candados, cinco pistas escondidas en el aula. Cada pista tiene un código QR que abre un acertijo acá. El equipo que abre los cinco, sale."}]},
  {"key":"play","name":"Jugar","blocks":[
   {"id":"b2","type":"check","text":"Candado 1 — El doble de un número menos 4 es 10. ¿Qué número abre el candado?","options":["3","7","14"],"correct":1},
   {"id":"b3","type":"check","text":"Candado 2 — Tres amigos se repartieron 27 figuritas en partes iguales y a uno le regalaron 2 más. ¿Cuántas tiene ese?","options":["9","11","13"],"correct":1},
   {"id":"b4","type":"question","text":"Candado 3 — Un número más su mitad da 18. Escribí el número y cómo lo encontraste."}]},
  {"key":"debrief","name":"Debrief","blocks":[
   {"id":"b5","type":"question","text":"Cada candado escondía una operación. Escriban cuál era en cada uno, con sus palabras."},
   {"id":"b6","type":"self_report","text":"¿Cuánto te divertiste? Sinceridad total."}]}]}',
 '[{"id":"r1","label":"Traduce el enunciado a una operación","levels":["No","A veces","Siempre"]},{"id":"r2","label":"En el debrief nombra la operación","levels":["No","Con ayuda","Solo"]}]'),

('Cuento con números', true,
 '{"experience":"creation","lens":"thinking_routine","disciplines":["Lengua · narrativa","Matemática · un concepto a elección"],"setting":["screen","paper"],"social":"alone","evidence":["answer","audio"]}',
 '{"phases":[
  {"key":"see","name":"Veo","blocks":[{"id":"b1","type":"paragraph","text":"Elegí un concepto que estés aprendiendo: el cero, las fracciones, un triángulo, el infinito. Escribí tres cosas que ves cuando lo pensás."},{"id":"b2","type":"question","text":"Tus tres cosas:"}]},
  {"key":"think","name":"Pienso","blocks":[{"id":"b3","type":"question","text":"Si ese concepto fuera un personaje, ¿qué problema tendría? ¿Quién sería su enemigo?"}]},
  {"key":"wonder","name":"Me pregunto","blocks":[
   {"id":"b4","type":"paragraph","text":"Escribí el cuento. Diez renglones alcanzan. El concepto tiene que hacer algo que solo él puede hacer."},
   {"id":"b5","type":"question","text":"El cuento:"},
   {"id":"b6","type":"evidence","text":"Audio: leelo en voz alta","media":"audio"}]}]}',
 '[{"id":"r1","label":"El concepto matemático funciona bien en la historia","levels":["Está de adorno","Aparece","Es el motor del cuento"],"discipline":"Matemática"},{"id":"r2","label":"Narrativa: conflicto y resolución","levels":["No hay","Uno de los dos","Los dos"],"discipline":"Lengua"}]'),

('La tienda del grupo', true,
 '{"experience":"simulation","lens":"project","disciplines":["Matemática · decimales","Matemática · dinero","Ciudadanía · acuerdos"],"setting":["screen","paper"],"social":"whole_group","evidence":["answer"]}',
 '{"phases":[
  {"key":"question","name":"Semana 1 · Abrir","blocks":[{"id":"b1","type":"paragraph","text":"El grupo abre una tienda. Cada uno recibe 100 melus. Hay que decidir juntos qué se vende y a qué precio."},{"id":"b2","type":"question","text":"¿Qué vendemos y cuánto cuesta cada cosa? Anotá la lista con precios con centavos."}]},
  {"key":"research","name":"Semana 2 · Comprar","blocks":[{"id":"b3","type":"question","text":"Comprá tres cosas. Escribí el total y el vuelto de un billete de 50."}]},
  {"key":"create","name":"Semana 3 · Ahorrar","blocks":[{"id":"b4","type":"question","text":"Algo cuesta 37,50 y tenés 22,75. ¿Cuánto te falta? ¿En cuántas semanas llegás si ahorrás 5 por semana?"}]},
  {"key":"present","name":"Semana 4 · Decidir","blocks":[{"id":"b5","type":"question","text":"La tienda tiene 180 melus de ganancia. Propongan y voten qué hacer con eso. Escribí qué se decidió y cómo se votó."}]},
  {"key":"reflect","name":"Cierre","blocks":[{"id":"b6","type":"self_report","text":"¿Qué tan fácil te resultó calcular con centavos al final, comparado con el principio?"}]}]}',
 '[{"id":"r1","label":"Opera con decimales en contexto de dinero","levels":["No","Con errores","Correctamente"]},{"id":"r2","label":"Participa de la decisión colectiva","levels":["No","Vota","Propone y argumenta"]}]'),

('Reto de la semana', true,
 '{"experience":"challenge","lens":"polya","disciplines":["Matemática · resolución de problemas"],"setting":["screen"],"social":"alone","evidence":["answer"]}',
 '{"phases":[
  {"key":"understand","name":"Entender","blocks":[{"id":"b1","type":"paragraph","text":"En un corral hay gallinas y conejos. Se cuentan 10 cabezas y 26 patas. ¿Cuántos hay de cada uno?"},{"id":"b2","type":"question","text":"Con tus palabras: ¿qué te dan y qué te piden?"}]},
  {"key":"plan","name":"Planificar","blocks":[{"id":"b3","type":"question","text":"Antes de resolver: ¿cómo lo vas a atacar? Probar números, dibujar, hacer una tabla, otra cosa?"}]},
  {"key":"execute","name":"Ejecutar","blocks":[{"id":"b4","type":"question","text":"Resolvelo. Mostrá los pasos, no solo el resultado."}]},
  {"key":"review","name":"Revisar","blocks":[{"id":"b5","type":"question","text":"Verificá: ¿las cabezas suman 10 y las patas 26? ¿Había otro camino? ¿Cuál te parece mejor y por qué?"},{"id":"b6","type":"self_report","text":"¿Cuánto te costó?"}]}]}',
 '[{"id":"r1","label":"Formula un plan antes de operar","levels":["No","Vago","Concreto"]},{"id":"r2","label":"Verifica el resultado contra el enunciado","levels":["No","Parcial","Completo"]}]'),

('¿Cómo llegaste hoy?', true,
 '{"experience":"checkin","lens":"no_lens","disciplines":["Bienestar"],"setting":["screen"],"social":"alone","evidence":["self_report"]}',
 '{"phases":[{"key":"single","name":"Hoy","blocks":[
   {"id":"b1","type":"self_report","text":"¿Con cuánta energía llegaste hoy?"},
   {"id":"b2","type":"self_report","text":"¿Qué tan tranquilo te sentís?"},
   {"id":"b3","type":"question","text":"¿Hay algo que quieras que sepa? (opcional, nadie más lo ve)"}]}]}',
 '[]');
