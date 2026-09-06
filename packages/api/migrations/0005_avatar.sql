-- El nombre se parte en tres.
--
-- `name` se queda igual y sigue siendo el nombre que se muestra, porque lo leen la mitad de las
-- queries del producto y no tiene sentido que cada una arme el mismo string. Lo que cambia es de
-- dónde sale: ahora lo escribe el perfil a partir de las partes, y la regla es que el apodo
-- gana. Quien puso "Bruno" en apodo es Bruno en la pantalla de su guía, aunque en el papel sea
-- Bruno Alejandro Fernández Lima.
--
-- El apellido existe para el guía, que tiene dos Sofías en el mismo grupo, y el apodo existe
-- para el chico, que quiere que lo llamen como lo llaman. Los dos datos hacen falta y son
-- distintos: por eso son columnas y no un solo campo con una convención adentro.
alter table people add column if not exists first_name text;
alter table people add column if not exists last_name text;
alter table people add column if not exists nickname text;

-- Lo que ya está guardado arranca partido en dos por el primer espacio. Es una heurística y se
-- equivoca con los apellidos compuestos, pero deja a todo el mundo con algo razonable en la
-- pantalla el primer día, y el primero que la corrige es el dueño del nombre.
update people
   set first_name = coalesce(first_name, split_part(name, ' ', 1)),
       last_name  = coalesce(last_name, nullif(substr(name, length(split_part(name, ' ', 1)) + 2), ''))
 where first_name is null;

-- El avatar no tiene columnas, y es a propósito.
--
-- `avatar_url` es la foto y ya existe desde 0003. Quien no tiene foto recibe una figura dibujada
-- a partir de su nombre: es determinística, así que no hay nada que guardar. El mismo nombre da
-- siempre la misma cara, y si alguien se cambia el nombre le cambia la cara, que es lo correcto
-- cuando la cara es consecuencia del nombre y no una elección.
--
-- Hubo una versión con estilo, semilla y partes elegidas, para que cada uno armara la suya. Se
-- sacó antes de llegar a main: mientras el avatar solo lo ve su dueño, armarlo es configuración
-- que no le devuelve nada a nadie. Las tres bajas quedan escritas porque la migración ya había
-- corrido en las bases de desarrollo.
alter table people drop constraint if exists people_avatar_style_check;
alter table people drop column if exists avatar_style;
alter table people drop column if exists avatar_seed;
alter table people drop column if exists avatar_options;
