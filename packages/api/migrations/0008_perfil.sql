-- Perfil de aprendizaje: lo que la persona declaró al entrar.
-- Lo observado no se guarda acá: se recalcula de las entregas, para que nunca quede viejo.
create table if not exists perfil (
  persona_id  uuid primary key references persona(id) on delete cascade,
  declarado   jsonb not null default '{}',   -- polo -> 0..1
  respuestas  jsonb not null default '{}',   -- lo que tocó, tal cual, para poder rehacer el cálculo
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
