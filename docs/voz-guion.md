# Guion de voz del onboarding

Qué hay que grabar para que la tarjeta «Escuchá» suene en cualquier máquina, y para que
quien todavía no lee suelto pueda escuchar las consignas.

Hoy eso lo hace el sintetizador del navegador (`speechSynthesis`). Funciona en celulares,
Mac y Windows, pero en Linux sin voces instaladas **no suena nada** y la tarjeta queda muda.
Eso no es solo feo: «Escuchá» es uno de los cuatro canales que el onboarding mide, así que
una tarjeta muda se lee como «a esta persona no le entra por el oído», que es un dato falso.

---

## La voz es la de ella

Decidido: habla la nena de la pantalla, no una narradora. Eso manda sobre todo lo demás.

No explica **a** alguien: comparte **con** alguien. Por eso las frases están escritas en
primera persona y repartiendo — «tengo una galletita y somos dos», «contemos juntos»,
«sacale cinco al doce y aparece». Es una compañera contándote algo que ya sabe, no una
maestra tomando lección.

Español rioplatense, voseo, sin neutro. Y sin sobreactuar de «voz para chicos»: los chicos
detectan eso al toque. Hablá como le hablarías a un hermanito, con ganas pero de verdad.

## Cómo grabar

Sirve el celular (nota de voz), Audacity, o lo que tengas. Lo que importa:

- Un cuarto con cosas blandas (cama, cortinas, ropa). No un baño ni una oficina vacía.
- El micrófono a un palmo de la boca, **siempre a la misma distancia**.
- Tono normal, un poco más lento de lo natural. Explicando, no actuando.
- **Una sola toma continua** con todas las frases en orden, **2 segundos de silencio entre
  una y otra**. Yo las corto por silencio. Si te equivocás, pausá y repetí la frase entera:
  me quedo con la última y reviso corte por corte antes de meterlas.
- Mandame el archivo **tal cual sale**, sin comprimir ni editar. Yo normalizo y convierto.

---

## Grupo A — Las seis explicaciones (imprescindibles)

Son las que se escuchan al tocar ▶ en la tarjeta «Escuchá». Sin estas, la tarjeta no
suena en ninguna franja de edad.

| # | archivo | frase |
|---|---|---|
| 1 | `mitad` | Tengo una galletita y somos dos. La parto justo por el medio... ¡listo! Dos pedazos igualitos: uno para vos, uno para mí. Ese pedazo tuyo es la mitad. |
| 2 | `contar` | Mirá: tres bolitas acá, dos bolitas acá. ¿Cuántas hay? Contemos juntos... una, dos, tres, cuatro, ¡cinco! |
| 3 | `tercio` | Agarrá una barra de chocolate y partila en tres partes iguales. Te comés una sola. Esa que te comiste es un tercio. |
| 4 | `porcuatro` | Tres por cuatro es armar tres filas de cuatro. Y no las contás de a una: contás de a cuatro, que es más rápido. Cuatro, ocho, doce. |
| 5 | `porcentaje` | Veinticinco por ciento son veinticinco de cada cien. O sea, la cuarta parte. Si una pizza se reparte entre cuatro, tu porción es el veinticinco por ciento. |
| 6 | `incognita` | Hay un número escondido ahí. Le sumás cinco y te da doce. ¿Cuál es? Sacale cinco al doce y aparece: siete. |

## Grupo B — Las consignas (imprescindibles)

El título y la bajada de cada pregunta, de corrido, como una sola frase. La primera la
escucha todo el mundo; las otras siete son de la franja «recién empiezo», que es
justamente la de quien no lee.

| # | archivo | frase |
|---|---|---|
| 7 | `p-banda` | ¿Por dónde andás? Para mostrarte ejemplos que te sirvan y no cosas que todavía no viste. |
| 8 | `p-canal1` | La mitad, explicado de cuatro maneras. Probá las cuatro. Después tocá «con esta» abajo de la que más te gustó. |
| 9 | `p-canal2` | Otra cosa, las mismas cuatro maneras. Tres y dos. Probalas de nuevo y marcá con cuál lo agarrás. |
| 10 | `p-chispa` | Cuatro maneras de empezar lo mismo. Contar los pasos que hay hasta el patio. ¿Cuál te dan ganas de abrir? |
| 11 | `p-ritmo` | Lo mismo, explicado de dos maneras. Cómo hacer un sándwich. Tocá la que se entiende mejor. |
| 12 | `p-compania` | Hay algo que no te sale. ¿Qué hacés, en general? |
| 13 | `p-andamio` | Algo que nunca hiciste. ¿Cómo preferís arrancar? |
| 14 | `p-dosis` | Última. ¿Cuándo te sale mejor? |

## Grupo C — Las etiquetas de las tarjetas (opcional)

Para quien no lee **nada**. Hoy no hay control para reproducirlas: si se graban, hay que
agregarles un altavoz a cada tarjeta. Son cortas y ya vas a estar frente al micrófono.

| # | archivo | frase |
|---|---|---|
| 15 | `t-mira` | Mirá |
| 16 | `t-escucha` | Escuchá |
| 17 | `t-lee` | Leé |
| 18 | `t-hacer-mitad` | Pintá la mitad. |
| 19 | `t-hacer-contar` | Pintá cinco. |
| 20 | `t-hacer-tercio` | Pintá un tercio. |
| 21 | `t-hacer-porcuatro` | Armá tres filas de cuatro. |
| 22 | `t-hacer-porcentaje` | Pintá el veinticinco por ciento. |
| 23 | `t-hacer-incognita` | Buscá el valor de equis. |

## Grupo D — Las consignas de primaria y secundaria (opcional)

Hoy esas franjas no muestran altavoz, porque se supone que leen. Si querés que también
lo tengan, son estas doce. No las necesito para arrancar.

Se sacan del mismo guion cambiando la franja; te las paso si decidís grabarlas.

---

## Qué hago yo con eso

1. Corto la toma por silencio y verifico cada corte contra el texto de esta tabla.
2. Normalizo el volumen (parejo entre frases) y recorto los silencios de los extremos.
3. Convierto a AAC y las dejo en `web/public/voz/<archivo>.m4a`.
4. Cambio la tarjeta «Escuchá» para que reproduzca el archivo, y sincronizo el resaltado
   palabra por palabra **contra la duración real del audio** (hoy corre con un temporizador
   fijo de 330 ms por palabra, así que aunque haya voz, la palabra iluminada se despega).
5. Dejo el sintetizador del navegador como red por si falta algún archivo, y si no hay ni
   archivo ni voz, la tarjeta «Escuchá» no se ofrece: mejor no medir que medir mal.

El archivo original de la grabación no queda solo en tu máquina: va al Drive de Educabot,
que es de donde se rehace si algún día hay que recortar distinto.
