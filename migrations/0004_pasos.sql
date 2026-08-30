-- Cómo le fue en cada bloque: intentos, si acertó y cuánto tardó.
-- Antes solo guardábamos la respuesta final, que es la señal más pobre que produce una actividad.
alter table entrega add column if not exists pasos jsonb not null default '{}';
