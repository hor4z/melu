create extension if not exists pgcrypto;

-- Table names are plural because `group` is a reserved word in SQL.
-- The product vocabulary (espacio, grupo, guía, aprendiz, lente) lives in AGENTS.md;
-- here and everywhere else in the code we use its English representation.

-- structure
create table spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null default 'personal',           -- school | club | tutoring | personal
  created_at timestamptz not null default now()
);

create table terms (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null,
  starts_on date, ends_on date,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  term_id uuid references terms(id) on delete set null,
  name text not null,
  code text not null unique,                       -- for /join/:code
  tags jsonb not null default '{}',                -- grade, subject, shift...
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  google_sub text unique,
  name text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  space_id uuid not null references spaces(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  role text not null check (role in ('guide','learner','companion','coordinator')),
  created_at timestamptz not null default now(),
  unique (person_id, space_id, group_id, role)
);
create index on memberships (person_id);
create index on memberships (group_id);

create table companion_links (
  companion_id uuid not null references people(id) on delete cascade,
  learner_id uuid not null references people(id) on delete cascade,
  primary key (companion_id, learner_id)
);

-- content
create table lenses (
  key text primary key,
  name text not null,
  description text not null default '',
  phases jsonb not null                             -- [{key, name, asks}]
);

create table objectives (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  discipline text not null,
  title text not null,
  requires uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references spaces(id) on delete cascade,  -- null = global recipe
  title text not null,
  is_recipe boolean not null default false,
  composition jsonb not null default '{}',          -- {experience, lens, disciplines[], setting[], social, evidence[]}
  document jsonb not null default '{"phases":[]}',  -- {phases:[{key,name,blocks:[...]}]}
  rubric jsonb not null default '[]',               -- [{id,label,levels[],objectiveId?,ownerId?}]
  authors uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- the loop
create table assignments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id),
  group_id uuid not null references groups(id) on delete cascade,
  recipients uuid[],                                 -- null = the whole group
  document_snapshot jsonb not null,
  rubric_snapshot jsonb not null default '[]',
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  learner_id uuid not null references people(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','graded')),
  answers jsonb not null default '{}',
  -- how each block went: attempts, whether they got it right, how long it took.
  -- Richer than the final answer, which is the poorest signal an activity produces.
  steps jsonb not null default '{}',
  artifacts jsonb not null default '[]',
  scores jsonb not null default '[]',
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, learner_id)
);

-- the ground truth: append-only, bitemporal
create table events (
  id bigserial primary key,
  person_id uuid,
  group_id uuid,
  activity_id uuid,
  verb text not null,
  payload jsonb not null default '{}',
  source text not null default 'observed' check (source in ('observed','declared','inferred')),
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);
create index on events (person_id, occurred_at);
create index on events (verb, occurred_at);

create table sessions (
  token text primary key,
  person_id uuid not null references people(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Learning profile: what the person declared when they signed up.
-- The observed side is not stored: it is recomputed from submissions so it never goes stale.
create table profiles (
  person_id  uuid primary key references people(id) on delete cascade,
  declared   jsonb not null default '{}',   -- pole -> 0..1
  answers    jsonb not null default '{}',   -- exactly what they picked, so the computation can be redone
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- lenses, as data. The key is technical; the text is content and stays in Spanish.
insert into lenses (key, name, description, phases) values
('no_lens','Sin lente','Una sola fase. Práctica, lectura, cualquier cosa corta.',
 '[{"key":"single","name":"Actividad","asks":""}]'),
('cpa','CPA (Singapur)','Un concepto matemático nuevo, de lo concreto al símbolo.',
 '[{"key":"concrete","name":"Concreto","asks":"Foto de los materiales manipulados"},{"key":"pictorial","name":"Pictórico","asks":"Dibujo o diagrama"},{"key":"abstract","name":"Abstracto","asks":"Notación simbólica"}]'),
('design_thinking','Design thinking','Cuando hay alguien para quien se diseña. Sin usuario real es teatro.',
 '[{"key":"empathize","name":"Empatizar","asks":"Entrevista o observación"},{"key":"define","name":"Definir","asks":"El problema en una frase"},{"key":"ideate","name":"Idear","asks":"Bocetos"},{"key":"prototype","name":"Prototipar","asks":"Foto del prototipo"},{"key":"test","name":"Probar","asks":"Qué pasó al probarlo con la persona"}]'),
('polya','Polya','Resolución de problemas. El revisar es donde se aprende.',
 '[{"key":"understand","name":"Entender","asks":"Qué se pide, con tus palabras"},{"key":"plan","name":"Planificar","asks":"El plan antes de la respuesta"},{"key":"execute","name":"Ejecutar","asks":"La resolución"},{"key":"review","name":"Revisar","asks":"¿Tiene sentido? ¿Otro camino?"}]'),
('project','Proyecto (ABP)','Interdisciplinar y largo. Envoltorio natural para dos docentes.',
 '[{"key":"question","name":"Pregunta","asks":""},{"key":"research","name":"Investigar","asks":"Fuentes y hallazgos"},{"key":"create","name":"Crear","asks":"El producto"},{"key":"present","name":"Presentar","asks":"Audio o video"},{"key":"reflect","name":"Reflexionar","asks":"Qué aprendí, qué cambiaría"}]'),
('inquiry_5e','Indagación 5E','Ciencias y fenómenos. La explicación viene después de tocar.',
 '[{"key":"engage","name":"Enganchar","asks":""},{"key":"explore","name":"Explorar","asks":"Observaciones"},{"key":"explain","name":"Explicar","asks":"Tu explicación"},{"key":"elaborate","name":"Elaborar","asks":"Aplicación a otro caso"},{"key":"evaluate","name":"Evaluar","asks":""}]'),
('thinking_routine','Rutinas de pensamiento','Cortas, diez minutos, cualquier disciplina.',
 '[{"key":"see","name":"Veo","asks":"Qué ves"},{"key":"think","name":"Pienso","asks":"Qué pensás"},{"key":"wonder","name":"Me pregunto","asks":"Qué te preguntás"}]'),
('game','Juego + debrief','Lúdico con intención. Sin debrief es recreo.',
 '[{"key":"rules","name":"Reglas","asks":""},{"key":"play","name":"Jugar","asks":"Resultado de cada ronda"},{"key":"debrief","name":"Debrief","asks":"Qué operación resolvía cada paso"}]'),
('service_learning','Aprendizaje-servicio','Comunidad, barrio, escuela.',
 '[{"key":"need","name":"Necesidad","asks":"Qué hace falta y a quién"},{"key":"plan","name":"Plan","asks":""},{"key":"action","name":"Acción","asks":"Fotos de lo hecho"},{"key":"reflection","name":"Reflexión","asks":""}]'),
('spaced_review','Recuperación espaciada','Consolidar lo ya visto. Evaluación que enseña.',
 '[{"key":"check","name":"Chequeo","asks":"2-3 ítems"},{"key":"feedback","name":"Devolución","asks":""},{"key":"recheck","name":"Re-chequeo","asks":"Días después"}]');
