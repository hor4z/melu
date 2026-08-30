create extension if not exists pgcrypto;

-- estructura
create table espacio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  tipo text not null default 'personal',           -- escuela | club | apoyo | personal
  created_at timestamptz not null default now()
);

create table periodo (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references espacio(id) on delete cascade,
  nombre text not null,
  desde date, hasta date,
  created_at timestamptz not null default now()
);

create table grupo (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references espacio(id) on delete cascade,
  periodo_id uuid references periodo(id) on delete set null,
  nombre text not null,
  codigo text not null unique,                     -- para /unirme/:codigo
  etiquetas jsonb not null default '{}',           -- grado, materia, turno...
  created_at timestamptz not null default now()
);

create table persona (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  google_sub text unique,
  nombre text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

create table membresia (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references persona(id) on delete cascade,
  espacio_id uuid not null references espacio(id) on delete cascade,
  grupo_id uuid references grupo(id) on delete cascade,
  rol text not null check (rol in ('guia','aprendiz','acompanante','coordinador')),
  created_at timestamptz not null default now(),
  unique (persona_id, espacio_id, grupo_id, rol)
);
create index on membresia (persona_id);
create index on membresia (grupo_id);

create table vinculo (
  acompanante_id uuid not null references persona(id) on delete cascade,
  aprendiz_id uuid not null references persona(id) on delete cascade,
  primary key (acompanante_id, aprendiz_id)
);

-- contenido
create table lente (
  clave text primary key,
  nombre text not null,
  descripcion text not null default '',
  fases jsonb not null                              -- [{clave, nombre, pide}]
);

create table objetivo (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references espacio(id) on delete cascade,
  disciplina text not null,
  titulo text not null,
  requiere uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table actividad (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacio(id) on delete cascade,  -- null = receta global
  titulo text not null,
  es_receta boolean not null default false,
  composicion jsonb not null default '{}',          -- {experiencia, lente, disciplinas[], escenario[], social, evidencia[]}
  documento jsonb not null default '{"fases":[]}',  -- {fases:[{clave,nombre,bloques:[...]}]}
  rubrica jsonb not null default '[]',              -- [{id,label,niveles[],objetivoId?,duenoId?}]
  autores uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- el circuito
create table asignacion (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references actividad(id),
  grupo_id uuid not null references grupo(id) on delete cascade,
  destinatarios uuid[],                              -- null = todo el grupo
  documento_snapshot jsonb not null,
  rubrica_snapshot jsonb not null default '[]',
  abre timestamptz not null default now(),
  cierra timestamptz,
  created_at timestamptz not null default now()
);

create table entrega (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references asignacion(id) on delete cascade,
  aprendiz_id uuid not null references persona(id) on delete cascade,
  estado text not null default 'en_curso' check (estado in ('en_curso','entregada','corregida')),
  respuestas jsonb not null default '{}',
  artefactos jsonb not null default '[]',
  puntajes jsonb not null default '[]',
  entregada_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (asignacion_id, aprendiz_id)
);

-- la base de todo: append-only, bitemporal
create table evento (
  id bigserial primary key,
  persona_id uuid,
  grupo_id uuid,
  actividad_id uuid,
  verbo text not null,
  payload jsonb not null default '{}',
  origen text not null default 'observado' check (origen in ('observado','declarado','inferido')),
  ocurrio timestamptz not null default now(),
  registrado timestamptz not null default now()
);
create index on evento (persona_id, ocurrio);
create index on evento (verbo, ocurrio);

create table sesion (
  token text primary key,
  persona_id uuid not null references persona(id) on delete cascade,
  expira timestamptz not null,
  created_at timestamptz not null default now()
);

-- los lentes, como datos
insert into lente (clave, nombre, descripcion, fases) values
('sin_lente','Sin lente','Una sola fase. Práctica, lectura, cualquier cosa corta.',
 '[{"clave":"unica","nombre":"Actividad","pide":""}]'),
('cpa','CPA (Singapur)','Un concepto matemático nuevo, de lo concreto al símbolo.',
 '[{"clave":"concreto","nombre":"Concreto","pide":"Foto de los materiales manipulados"},{"clave":"pictorico","nombre":"Pictórico","pide":"Dibujo o diagrama"},{"clave":"abstracto","nombre":"Abstracto","pide":"Notación simbólica"}]'),
('design_thinking','Design thinking','Cuando hay alguien para quien se diseña. Sin usuario real es teatro.',
 '[{"clave":"empatizar","nombre":"Empatizar","pide":"Entrevista o observación"},{"clave":"definir","nombre":"Definir","pide":"El problema en una frase"},{"clave":"idear","nombre":"Idear","pide":"Bocetos"},{"clave":"prototipar","nombre":"Prototipar","pide":"Foto del prototipo"},{"clave":"probar","nombre":"Probar","pide":"Qué pasó al probarlo con la persona"}]'),
('polya','Polya','Resolución de problemas. El revisar es donde se aprende.',
 '[{"clave":"entender","nombre":"Entender","pide":"Qué se pide, con tus palabras"},{"clave":"planificar","nombre":"Planificar","pide":"El plan antes de la respuesta"},{"clave":"ejecutar","nombre":"Ejecutar","pide":"La resolución"},{"clave":"revisar","nombre":"Revisar","pide":"¿Tiene sentido? ¿Otro camino?"}]'),
('proyecto','Proyecto (ABP)','Interdisciplinar y largo. Envoltorio natural para dos docentes.',
 '[{"clave":"pregunta","nombre":"Pregunta","pide":""},{"clave":"investigar","nombre":"Investigar","pide":"Fuentes y hallazgos"},{"clave":"crear","nombre":"Crear","pide":"El producto"},{"clave":"presentar","nombre":"Presentar","pide":"Audio o video"},{"clave":"reflexionar","nombre":"Reflexionar","pide":"Qué aprendí, qué cambiaría"}]'),
('indagacion_5e','Indagación 5E','Ciencias y fenómenos. La explicación viene después de tocar.',
 '[{"clave":"enganchar","nombre":"Enganchar","pide":""},{"clave":"explorar","nombre":"Explorar","pide":"Observaciones"},{"clave":"explicar","nombre":"Explicar","pide":"Tu explicación"},{"clave":"elaborar","nombre":"Elaborar","pide":"Aplicación a otro caso"},{"clave":"evaluar","nombre":"Evaluar","pide":""}]'),
('rutina_pensamiento','Rutinas de pensamiento','Cortas, diez minutos, cualquier disciplina.',
 '[{"clave":"veo","nombre":"Veo","pide":"Qué ves"},{"clave":"pienso","nombre":"Pienso","pide":"Qué pensás"},{"clave":"me_pregunto","nombre":"Me pregunto","pide":"Qué te preguntás"}]'),
('juego','Juego + debrief','Lúdico con intención. Sin debrief es recreo.',
 '[{"clave":"reglas","nombre":"Reglas","pide":""},{"clave":"jugar","nombre":"Jugar","pide":"Resultado de cada ronda"},{"clave":"debrief","nombre":"Debrief","pide":"Qué operación resolvía cada paso"}]'),
('servicio','Aprendizaje-servicio','Comunidad, barrio, escuela.',
 '[{"clave":"necesidad","nombre":"Necesidad","pide":"Qué hace falta y a quién"},{"clave":"plan","nombre":"Plan","pide":""},{"clave":"accion","nombre":"Acción","pide":"Fotos de lo hecho"},{"clave":"reflexion","nombre":"Reflexión","pide":""}]'),
('espaciado','Recuperación espaciada','Consolidar lo ya visto. Evaluación que enseña.',
 '[{"clave":"chequeo","nombre":"Chequeo","pide":"2-3 ítems"},{"clave":"devolucion","nombre":"Devolución","pide":""},{"clave":"rechequeo","nombre":"Re-chequeo","pide":"Días después"}]');
