-- Diez recetas globales (espacio_id null). Un docente las duplica y las hace suyas.
insert into actividad (titulo, es_receta, composicion, documento, rubrica) values

('Puente de espagueti', true,
 '{"experiencia":"reto","lente":"design_thinking","disciplinas":["Matemática · medida","Física · fuerzas","Lengua · argumentar"],"escenario":["kit"],"social":"equipo","evidencia":["foto","audio"]}',
 '{"fases":[
  {"clave":"empatizar","nombre":"Empatizar","bloques":[
   {"id":"b1","tipo":"parrafo","texto":"Un puente tiene que aguantar un vaso lleno de agua entre dos mesas separadas 30 cm. Antes de construir, miren tres puentes reales: ¿qué formas se repiten?"},
   {"id":"b2","tipo":"pregunta","texto":"¿Qué forma geométrica aparece más en los puentes que vieron? ¿Por qué creen que es esa?"}]},
  {"clave":"definir","nombre":"Definir","bloques":[
   {"id":"b3","tipo":"pregunta","texto":"Escriban en una frase qué tiene que lograr su puente y con qué límite de materiales (20 espaguetis, 1 m de cinta)."}]},
  {"clave":"idear","nombre":"Idear","bloques":[
   {"id":"b4","tipo":"parrafo","texto":"Cada integrante dibuja un diseño distinto. Después eligen uno, o mezclan dos."},
   {"id":"b5","tipo":"evidencia","texto":"Foto de los bocetos del equipo","kind":"foto"}]},
  {"clave":"prototipar","nombre":"Prototipar","bloques":[
   {"id":"b6","tipo":"destacado","texto":"Midan el largo real de cada pieza antes de pegarla. La diferencia entre lo que dibujaron y lo que midieron es parte de lo que vamos a mirar."},
   {"id":"b7","tipo":"evidencia","texto":"Foto del puente terminado, de costado","kind":"foto"}]},
  {"clave":"probar","nombre":"Probar","bloques":[
   {"id":"b8","tipo":"pregunta","texto":"¿Aguantó? ¿Dónde se rompió o se dobló primero? ¿Qué cambiarían en una segunda versión?"},
   {"id":"b9","tipo":"evidencia","texto":"Audio de 60 segundos: expliquen por qué creen que se comportó así","kind":"audio"},
   {"id":"b10","tipo":"autoreporte","texto":"¿Cuánto les costó trabajar en equipo hoy?"}]}]}',
 '[{"id":"r1","label":"Midió y usó las medidas al construir","niveles":["Todavía no","A veces","Siempre"]},{"id":"r2","label":"Explica el comportamiento del puente con una razón física","niveles":["No aparece","Aparece una razón","Relaciona forma y fuerza"]},{"id":"r3","label":"Argumenta el rediseño","niveles":["Sin propuesta","Propone sin razón","Propone y justifica"]}]'),

('Cartógrafos del barrio', true,
 '{"experiencia":"mision_real","lente":"proyecto","disciplinas":["Matemática · escala","Sociales · geografía","Lengua · escritura"],"escenario":["calle","papel"],"social":"pareja","evidencia":["foto"]}',
 '{"fases":[
  {"clave":"pregunta","nombre":"Pregunta","bloques":[{"id":"b1","tipo":"parrafo","texto":"¿Cuánto mide de verdad la cuadra de la escuela? Nadie lo sabe. Ustedes lo van a averiguar caminando."}]},
  {"clave":"investigar","nombre":"Investigar","bloques":[
   {"id":"b2","tipo":"parrafo","texto":"Midan su paso: caminen 10 pasos junto a una cinta métrica y dividan. Ese es su patrón."},
   {"id":"b3","tipo":"pregunta","texto":"¿Cuánto mide un paso tuyo, en centímetros? ¿Y uno de tu compañero? ¿Por qué no da lo mismo?"}]},
  {"clave":"crear","nombre":"Crear","bloques":[
   {"id":"b4","tipo":"parrafo","texto":"Recorran la cuadra contando pasos. Pasen el resultado al papel con una escala: 1 cm en la hoja = 5 m en la calle."},
   {"id":"b5","tipo":"evidencia","texto":"Foto del mapa, con la escala escrita","kind":"foto"}]},
  {"clave":"presentar","nombre":"Presentar","bloques":[{"id":"b6","tipo":"pregunta","texto":"Marquen tres lugares que les importan de esa cuadra y escriban por qué, en dos renglones cada uno."}]},
  {"clave":"reflexionar","nombre":"Reflexionar","bloques":[{"id":"b7","tipo":"pregunta","texto":"Si hubieran medido con pasos de un adulto, ¿el mapa cambiaría? ¿Qué cambiaría y qué no?"}]}]}',
 '[{"id":"r1","label":"Aplica la escala correctamente","niveles":["No","Con errores","Sí"]},{"id":"r2","label":"El texto explica el recorrido","niveles":["No","Parcialmente","Claramente"]}]'),

('Una pieza para alguien', true,
 '{"experiencia":"creacion","lente":"design_thinking","disciplinas":["Matemática · medida","Diseño","Empatía"],"escenario":["impresora_3d","casa"],"social":"solo","evidencia":["archivo","foto","audio"]}',
 '{"fases":[
  {"clave":"empatizar","nombre":"Empatizar","bloques":[
   {"id":"b1","tipo":"parrafo","texto":"Entrevistá a alguien de tu casa durante cinco minutos. Buscá una molestia chica y cotidiana: algo que se cae, que no cierra, que no tiene dónde ir."},
   {"id":"b2","tipo":"pregunta","texto":"¿Qué molestia encontraste? Contala con las palabras de la persona."}]},
  {"clave":"definir","nombre":"Definir","bloques":[{"id":"b3","tipo":"pregunta","texto":"La pieza tiene que ______ para que ______ pueda ______. Completá la frase."}]},
  {"clave":"idear","nombre":"Idear","bloques":[{"id":"b4","tipo":"evidencia","texto":"Foto de tres bocetos distintos, con medidas en milímetros","kind":"foto"}]},
  {"clave":"prototipar","nombre":"Prototipar","bloques":[
   {"id":"b5","tipo":"destacado","texto":"Medí el objeto real con regla antes de modelar. El STL y la foto de la pieza impresa van juntos: la distancia entre ambos es lo que vamos a mirar."},
   {"id":"b6","tipo":"evidencia","texto":"El archivo STL","kind":"archivo"},
   {"id":"b7","tipo":"evidencia","texto":"Foto de la pieza impresa, puesta donde va","kind":"foto"}]},
  {"clave":"probar","nombre":"Probar","bloques":[
   {"id":"b8","tipo":"evidencia","texto":"Audio: qué dijo la persona al usarla","kind":"audio"},
   {"id":"b9","tipo":"pregunta","texto":"¿Qué medida cambiarías en la versión dos?"}]}]}',
 '[{"id":"r1","label":"Las medidas del modelo salen de medir el objeto real","niveles":["No","En parte","Sí"]},{"id":"r2","label":"La pieza responde a la necesidad de la persona","niveles":["No","Parcialmente","Sí, y lo probó"]}]'),

('El robot que cuenta', true,
 '{"experiencia":"construccion","lente":"proyecto","disciplinas":["Matemática · patrones","Programación"],"escenario":["robot"],"social":"equipo","evidencia":["archivo","foto"]}',
 '{"fases":[
  {"clave":"pregunta","nombre":"Pregunta","bloques":[{"id":"b1","tipo":"parrafo","texto":"El robot tiene que avanzar y prender una luz cada tres pasos, sin que le digan cuándo. ¿Cómo sabe cuándo es el tercero?"}]},
  {"clave":"investigar","nombre":"Investigar","bloques":[{"id":"b2","tipo":"pregunta","texto":"Escriban la secuencia de los primeros 15 pasos marcando en cuáles se prende la luz. ¿Qué tienen en común esos números?"}]},
  {"clave":"crear","nombre":"Crear","bloques":[
   {"id":"b3","tipo":"parrafo","texto":"Programen el robot. Pista: no hace falta decirle 3, 6, 9… hay una forma de repetir."},
   {"id":"b4","tipo":"evidencia","texto":"El programa","kind":"archivo"},
   {"id":"b5","tipo":"evidencia","texto":"Foto del robot en el paso 9","kind":"foto"}]},
  {"clave":"presentar","nombre":"Presentar","bloques":[{"id":"b6","tipo":"pregunta","texto":"Ahora cambien: cada cuatro pasos. ¿Qué tuvieron que tocar en el programa? ¿Fue una cosa o muchas?"}]},
  {"clave":"reflexionar","nombre":"Reflexionar","bloques":[{"id":"b7","tipo":"chequeo","texto":"Si el robot prende la luz cada 3 pasos, ¿en el paso 27 la prende?","opciones":["Sí","No","Depende"],"correcta":0}]}]}',
 '[{"id":"r1","label":"Usa repetición en vez de enumerar","niveles":["Enumera","Mezcla","Usa un bucle"]},{"id":"r2","label":"Identifica el patrón numérico","niveles":["No","Lo describe","Lo nombra: múltiplos"]}]'),

('Fracciones en la cocina', true,
 '{"experiencia":"practica","lente":"cpa","disciplinas":["Matemática · fracciones","Lengua · instrucciones"],"escenario":["casa","cocina"],"social":"familia","evidencia":["foto","audio"]}',
 '{"fases":[
  {"clave":"concreto","nombre":"Concreto","bloques":[
   {"id":"b1","tipo":"parrafo","texto":"Esta receta es para 4 personas. En tu casa son 6. Elegí algo simple: panqueques, limonada, ensalada de frutas."},
   {"id":"b2","tipo":"parrafo","texto":"Con tazas y cucharas de verdad, armá la cantidad para 4. Después armá la cantidad para 6 al lado."},
   {"id":"b3","tipo":"evidencia","texto":"Foto de las dos cantidades, una al lado de la otra","kind":"foto"}]},
  {"clave":"pictorico","nombre":"Pictórico","bloques":[
   {"id":"b4","tipo":"parrafo","texto":"Dibujá las tazas. Cada taza es un rectángulo; si es media taza, pintá la mitad."},
   {"id":"b5","tipo":"evidencia","texto":"Foto del dibujo","kind":"foto"}]},
  {"clave":"abstracto","nombre":"Abstracto","bloques":[
   {"id":"b6","tipo":"pregunta","texto":"Si la receta dice 1/2 taza de azúcar para 4, ¿cuánto va para 6? Escribí la cuenta, no solo el resultado."},
   {"id":"b7","tipo":"evidencia","texto":"Audio: explicale a alguien de tu casa cómo lo pensaste","kind":"audio"},
   {"id":"b8","tipo":"autoreporte","texto":"¿Qué tan seguro estás de tu respuesta?"}]}]}',
 '[{"id":"r1","label":"Pasa de lo concreto al dibujo sin perder cantidades","niveles":["No","Con ayuda","Solo"]},{"id":"r2","label":"Escribe la operación con fracciones","niveles":["No","Con errores","Correcta y explicada"]}]'),

('Escape del aula', true,
 '{"experiencia":"juego","lente":"juego","disciplinas":["Matemática · ecuaciones","Lengua · lectura"],"escenario":["papel","pantalla"],"social":"equipo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"reglas","nombre":"Reglas","bloques":[{"id":"b1","tipo":"parrafo","texto":"Cinco candados, cinco pistas escondidas en el aula. Cada pista tiene un código QR que abre un acertijo acá. El equipo que abre los cinco, sale."}]},
  {"clave":"jugar","nombre":"Jugar","bloques":[
   {"id":"b2","tipo":"chequeo","texto":"Candado 1 — El doble de un número menos 4 es 10. ¿Qué número abre el candado?","opciones":["3","7","14"],"correcta":1},
   {"id":"b3","tipo":"chequeo","texto":"Candado 2 — Tres amigos se repartieron 27 figuritas en partes iguales y a uno le regalaron 2 más. ¿Cuántas tiene ese?","opciones":["9","11","13"],"correcta":1},
   {"id":"b4","tipo":"pregunta","texto":"Candado 3 — Un número más su mitad da 18. Escribí el número y cómo lo encontraste."}]},
  {"clave":"debrief","nombre":"Debrief","bloques":[
   {"id":"b5","tipo":"pregunta","texto":"Cada candado escondía una operación. Escriban cuál era en cada uno, con sus palabras."},
   {"id":"b6","tipo":"autoreporte","texto":"¿Cuánto te divertiste? Sinceridad total."}]}]}',
 '[{"id":"r1","label":"Traduce el enunciado a una operación","niveles":["No","A veces","Siempre"]},{"id":"r2","label":"En el debrief nombra la operación","niveles":["No","Con ayuda","Solo"]}]'),

('Cuento con números', true,
 '{"experiencia":"creacion","lente":"rutina_pensamiento","disciplinas":["Lengua · narrativa","Matemática · un concepto a elección"],"escenario":["pantalla","papel"],"social":"solo","evidencia":["respuesta","audio"]}',
 '{"fases":[
  {"clave":"veo","nombre":"Veo","bloques":[{"id":"b1","tipo":"parrafo","texto":"Elegí un concepto que estés aprendiendo: el cero, las fracciones, un triángulo, el infinito. Escribí tres cosas que ves cuando lo pensás."},{"id":"b2","tipo":"pregunta","texto":"Tus tres cosas:"}]},
  {"clave":"pienso","nombre":"Pienso","bloques":[{"id":"b3","tipo":"pregunta","texto":"Si ese concepto fuera un personaje, ¿qué problema tendría? ¿Quién sería su enemigo?"}]},
  {"clave":"me_pregunto","nombre":"Me pregunto","bloques":[
   {"id":"b4","tipo":"parrafo","texto":"Escribí el cuento. Diez renglones alcanzan. El concepto tiene que hacer algo que solo él puede hacer."},
   {"id":"b5","tipo":"pregunta","texto":"El cuento:"},
   {"id":"b6","tipo":"evidencia","texto":"Audio: leelo en voz alta","kind":"audio"}]}]}',
 '[{"id":"r1","label":"El concepto matemático funciona bien en la historia","niveles":["Está de adorno","Aparece","Es el motor del cuento"],"disciplina":"Matemática"},{"id":"r2","label":"Narrativa: conflicto y resolución","niveles":["No hay","Uno de los dos","Los dos"],"disciplina":"Lengua"}]'),

('La tienda del grupo', true,
 '{"experiencia":"simulacion","lente":"proyecto","disciplinas":["Matemática · decimales","Matemática · dinero","Ciudadanía · acuerdos"],"escenario":["pantalla","papel"],"social":"grupo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"pregunta","nombre":"Semana 1 · Abrir","bloques":[{"id":"b1","tipo":"parrafo","texto":"El grupo abre una tienda. Cada uno recibe 100 melus. Hay que decidir juntos qué se vende y a qué precio."},{"id":"b2","tipo":"pregunta","texto":"¿Qué vendemos y cuánto cuesta cada cosa? Anotá la lista con precios con centavos."}]},
  {"clave":"investigar","nombre":"Semana 2 · Comprar","bloques":[{"id":"b3","tipo":"pregunta","texto":"Comprá tres cosas. Escribí el total y el vuelto de un billete de 50."}]},
  {"clave":"crear","nombre":"Semana 3 · Ahorrar","bloques":[{"id":"b4","tipo":"pregunta","texto":"Algo cuesta 37,50 y tenés 22,75. ¿Cuánto te falta? ¿En cuántas semanas llegás si ahorrás 5 por semana?"}]},
  {"clave":"presentar","nombre":"Semana 4 · Decidir","bloques":[{"id":"b5","tipo":"pregunta","texto":"La tienda tiene 180 melus de ganancia. Propongan y voten qué hacer con eso. Escribí qué se decidió y cómo se votó."}]},
  {"clave":"reflexionar","nombre":"Cierre","bloques":[{"id":"b6","tipo":"autoreporte","texto":"¿Qué tan fácil te resultó calcular con centavos al final, comparado con el principio?"}]}]}',
 '[{"id":"r1","label":"Opera con decimales en contexto de dinero","niveles":["No","Con errores","Correctamente"]},{"id":"r2","label":"Participa de la decisión colectiva","niveles":["No","Vota","Propone y argumenta"]}]'),

('Reto de la semana', true,
 '{"experiencia":"reto","lente":"polya","disciplinas":["Matemática · resolución de problemas"],"escenario":["pantalla"],"social":"solo","evidencia":["respuesta"]}',
 '{"fases":[
  {"clave":"entender","nombre":"Entender","bloques":[{"id":"b1","tipo":"parrafo","texto":"En un corral hay gallinas y conejos. Se cuentan 10 cabezas y 26 patas. ¿Cuántos hay de cada uno?"},{"id":"b2","tipo":"pregunta","texto":"Con tus palabras: ¿qué te dan y qué te piden?"}]},
  {"clave":"planificar","nombre":"Planificar","bloques":[{"id":"b3","tipo":"pregunta","texto":"Antes de resolver: ¿cómo lo vas a atacar? Probar números, dibujar, hacer una tabla, otra cosa?"}]},
  {"clave":"ejecutar","nombre":"Ejecutar","bloques":[{"id":"b4","tipo":"pregunta","texto":"Resolvelo. Mostrá los pasos, no solo el resultado."}]},
  {"clave":"revisar","nombre":"Revisar","bloques":[{"id":"b5","tipo":"pregunta","texto":"Verificá: ¿las cabezas suman 10 y las patas 26? ¿Había otro camino? ¿Cuál te parece mejor y por qué?"},{"id":"b6","tipo":"autoreporte","texto":"¿Cuánto te costó?"}]}]}',
 '[{"id":"r1","label":"Formula un plan antes de operar","niveles":["No","Vago","Concreto"]},{"id":"r2","label":"Verifica el resultado contra el enunciado","niveles":["No","Parcial","Completo"]}]'),

('¿Cómo llegaste hoy?', true,
 '{"experiencia":"checkin","lente":"sin_lente","disciplinas":["Bienestar"],"escenario":["pantalla"],"social":"solo","evidencia":["autoreporte"]}',
 '{"fases":[{"clave":"unica","nombre":"Hoy","bloques":[
   {"id":"b1","tipo":"autoreporte","texto":"¿Con cuánta energía llegaste hoy?"},
   {"id":"b2","tipo":"autoreporte","texto":"¿Qué tan tranquilo te sentís?"},
   {"id":"b3","tipo":"pregunta","texto":"¿Hay algo que quieras que sepa? (opcional, nadie más lo ve)"}]}]}',
 '[]');
