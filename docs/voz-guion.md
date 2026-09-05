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

## Cómo se llaman los archivos

**El que me mandás es uno solo**, la toma entera: `melu-voz-AAAA-MM-DD.wav`
(o `.m4a`, o lo que escupa el grabador). Si hay una segunda sesión,
`melu-voz-2026-09-05-toma2.wav`. La fecha importa porque va a haber regrabaciones y
tiene que quedar claro cuál es la buena.

**Los que salen del corte** los armo yo y viven en `packages/web/public/voice/`. Una sola regla:
**el nombre del archivo es la clave que ya usa el código**, literal. Así el reproductor
arma la ruta solo (`/voice/samples/${key}.m4a`) y no hay una tabla de traducción entre el
código y los audios, que es la clase de cosa que se desactualiza y nadie se entera.

Las claves del código están en inglés (ver AGENTS.md); los audios siguen esas claves.
Sin acentos ni eñes ni espacios: son URLs.

```
packages/web/public/voice/
├── samples/            las seis explicaciones
│   ├── half.m4a
│   ├── count.m4a
│   ├── third.m4a
│   ├── timesFour.m4a
│   ├── percent.m4a
│   └── unknown.m4a
├── prompts/            las consignas, por franja
│   ├── common/
│   │   └── band.m4a           (la escuchan todos, se pregunta antes de saber la franja)
│   └── small/
│       ├── channel1.m4a
│       ├── channel2.m4a
│       ├── spark.m4a
│       ├── pace.m4a
│       ├── company.m4a
│       ├── scaffold.m4a
│       └── dose.m4a
└── labels/           opcional, las etiquetas de las tarjetas
    ├── see.m4a
    ├── listen.m4a
    └── read.m4a
```

La franja va en la carpeta y no en el nombre porque las consignas **cambian según la
edad**: el día que grabes primaria y secundaria, `prompts/medium/spark.m4a` convive con
`prompts/small/spark.m4a` sin pisarse. Si el nombre fuera solo `spark.m4a` habría que
renombrar todo.

Las consignas de las tarjetas del grupo C van con su concepto, no sueltas:
`samples/half-prompt.m4a`, `samples/count-prompt.m4a`, y así.

---

## Grupo A — Las seis explicaciones ✅ GRABADO (31/08/2026)

Son las que se escuchan al tocar ▶ en la tarjeta «Escuchá».

Ya están en `packages/web/public/voice/samples/`. Voces sintéticas de ElevenLabs: **Gaby** para las
cuatro de chicos y primaria, **Martin Alvarez** para las dos de secundaria. Vinieron con casi
6 LUFS de diferencia entre una voz y otra, así que se normalizaron todas a −18 LUFS y se les
recortó la cola de silencio.

| # | archivo que queda | frase |
|---|---|---|
| 1 | `samples/half.m4a` | Tengo una galletita y somos dos. La parto justo por el medio... ¡listo! Dos pedazos igualitos: uno para vos, uno para mí. Ese pedazo tuyo es la mitad. |
| 2 | `samples/count.m4a` | Mirá: tres bolitas acá, dos bolitas acá. ¿Cuántas hay? Contemos juntos... una, dos, tres, cuatro, ¡cinco! |
| 3 | `samples/third.m4a` | Agarrá una barra de chocolate y partila en tres partes iguales. Te comés una sola. Esa que te comiste es un tercio. |
| 4 | `samples/timesFour.m4a` | Tres por cuatro es armar tres filas de cuatro. Y no las contás de a una: contás de a cuatro, que es más rápido. Cuatro, ocho, doce. |
| 5 | `samples/percent.m4a` | Veinticinco por ciento son veinticinco de cada cien. O sea, la cuarta parte. Si una pizza se reparte entre cuatro, tu porción es el veinticinco por ciento. |
| 6 | `samples/unknown.m4a` | Hay un número escondido ahí. Le sumás cinco y te da doce. ¿Cuál es? Sacale cinco al doce y aparece: siete. |

## Grupo B — Las consignas ⬜ PENDIENTE

Sin estas, la franja «recién empieza» no tiene lectura en voz alta: el altavoz al lado de
la consigna directamente no se dibuja cuando no hay ni archivo ni voz del sistema.

El título y la bajada de cada pregunta, de corrido, como una sola frase. La primera la
escucha todo el mundo; las otras siete son de la franja «recién empiezo», que es
justamente la de quien no lee.

| # | archivo que queda | frase |
|---|---|---|
| 7 | `prompts/common/band.m4a` | ¿Por dónde andás? Para mostrarte ejemplos que te sirvan y no cosas que todavía no viste. |
| 8 | `prompts/small/channel1.m4a` | La mitad, explicado de cuatro maneras. Probá las cuatro. Después tocá «con esta» abajo de la que más te gustó. |
| 9 | `prompts/small/channel2.m4a` | Otra cosa, las mismas cuatro maneras. Tres y dos. Probalas de nuevo y marcá con cuál lo agarrás. |
| 10 | `prompts/small/spark.m4a` | Cuatro maneras de empezar lo mismo. Contar los pasos que hay hasta el patio. ¿Cuál te dan ganas de abrir? |
| 11 | `prompts/small/pace.m4a` | Lo mismo, explicado de dos maneras. Cómo hacer un sándwich. Tocá la que se entiende mejor. |
| 12 | `prompts/small/company.m4a` | Hay algo que no te sale. ¿Qué hacés, en general? |
| 13 | `prompts/small/scaffold.m4a` | Algo que nunca hiciste. ¿Cómo preferís arrancar? |
| 14 | `prompts/small/dose.m4a` | Última. ¿Cuándo te sale mejor? |

## Grupo C — Las etiquetas de las tarjetas (opcional)

Para quien no lee **nada**. Hoy no hay control para reproducirlas: si se graban, hay que
agregarles un altavoz a cada tarjeta. Son cortas y ya vas a estar frente al micrófono.

| # | archivo que queda | frase |
|---|---|---|
| 15 | `labels/see.m4a` | Mirá |
| 16 | `labels/listen.m4a` | Escuchá |
| 17 | `labels/read.m4a` | Leé |
| 18 | `samples/half-prompt.m4a` | Pintá la mitad. |
| 19 | `samples/count-prompt.m4a` | Pintá cinco. |
| 20 | `samples/third-prompt.m4a` | Pintá un tercio. |
| 21 | `samples/timesFour-prompt.m4a` | Armá tres filas de cuatro. |
| 22 | `samples/percent-prompt.m4a` | Pintá el veinticinco por ciento. |
| 23 | `samples/unknown-prompt.m4a` | Buscá el valor de equis. |

## Grupo D — Las consignas de primaria y secundaria (opcional)

Hoy esas franjas no muestran altavoz, porque se supone que leen. Si querés que también
lo tengan, son estas doce. No las necesito para arrancar.

Se sacan del mismo guion cambiando la franja; te las paso si decidís grabarlas.

---

## Qué hago yo con eso

1. Corto la toma por silencio y verifico cada corte contra el texto de esta tabla.
2. Normalizo el volumen (parejo entre frases) y recorto los silencios de los extremos.
3. Convierto a AAC y las dejo en `packages/web/public/voice/<archivo>.m4a`.
4. Cambio la tarjeta «Escuchá» para que reproduzca el archivo, y sincronizo el resaltado
   palabra por palabra **contra la duración real del audio** (hoy corre con un temporizador
   fijo de 330 ms por palabra, así que aunque haya voz, la palabra iluminada se despega).
5. Dejo el sintetizador del navegador como red por si falta algún archivo, y si no hay ni
   archivo ni voz, la tarjeta «Escuchá» no se ofrece: mejor no medir que medir mal.

El archivo original de la grabación no queda solo en tu máquina: va al Drive de Educabot,
que es de donde se rehace si algún día hay que recortar distinto.
