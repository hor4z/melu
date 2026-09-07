-- Un grupo puede decir qué es. El nombre alcanza para distinguirlo ("4° A · Matemática"), no
-- para saber de qué se trata: cuándo se junta, con qué acuerdo, qué se está haciendo este mes.
-- Va donde antes había tres cuentas que el docente ya tenía a la vista en las pestañas.
alter table groups add column if not exists description text;

-- Los grupos que ya existían quedaron sin nada que decir, y ahora la descripción es obligatoria
-- para crear uno. A los dos de la demo se les pone la que trae el seed. Al resto no se le
-- inventa nada: la ficha del grupo, en lugar de la descripción, ofrece escribirla.
update groups set description = 'El grado de la mañana. Este trimestre venimos con fracciones y con problemas que piden pensar antes de operar.'
 where description is null and name = '4° A · Matemática';
update groups set description = 'Contraturno de los sábados, para quien se quiera anotar. Trabajamos en equipo y armamos cosas que se mueven.'
 where description is null and name = 'Taller de robótica';
