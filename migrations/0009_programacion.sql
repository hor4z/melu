-- Programar actividades: fecha en que aparecen, fecha de entrega, y repetición.
--
-- Las dos primeras ya existían desde 0001 (asignacion.abre / asignacion.cierra) y nadie las
-- escribía nunca: `abre` caía siempre en su default y `cierra` era NULL en el 100 % de las filas.
-- Esta migración solo agrega lo que falta para repetir, y los índices que hasta ahora no hacían
-- falta porque nadie consultaba por fecha.

-- La regla de repetición: "todos los martes y jueves a las 10, hasta el 30 de noviembre".
-- No guarda contenido -el qué está en la actividad, el para quién en cada asignación- así que
-- cambiar una fecha suelta de la serie no necesita ninguna regla de precedencia: la fila diverge
-- y listo.
create table serie (
  id         uuid primary key default gen_random_uuid(),
  dias       smallint[] not null,           -- 0=domingo .. 6=sábado, igual que time.Weekday
  hora       text not null,                 -- "10:00", hora de pared en MELU_TZ
  dias_plazo integer,                       -- null = sin vencimiento; 3 = cierra 3 días después
  desde      date not null,
  hasta      date not null,
  created_at timestamptz not null default now(),
  check (array_length(dias, 1) between 1 and 7),
  check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  check (hasta >= desde),
  check (dias_plazo is null or dias_plazo between 0 and 365)
);

-- `set null` y no cascade: borrar una regla de repetición nunca puede borrar `entrega`, que es
-- trabajo real de chicos.
alter table asignacion add column serie_id uuid references serie(id) on delete set null;

create index on asignacion (serie_id);
create index on asignacion (grupo_id, abre);
create index on asignacion (grupo_id, cierra) where cierra is not null;
