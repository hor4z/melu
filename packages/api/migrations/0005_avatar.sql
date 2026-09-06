-- El perfil que la persona edita: cómo se llama y qué cara tiene.
--
-- El nombre se parte en tres. `name` se queda igual y sigue siendo el nombre que se muestra,
-- porque lo leen la mitad de las queries del producto y no tiene sentido que cada una arme el
-- mismo string. Lo que cambia es de dónde sale: ahora lo escribe el perfil a partir de las
-- partes, y la regla es que el apodo gana. Quien puso "Bruno" en apodo es Bruno en la pantalla
-- de su guía, aunque en el papel sea Bruno Alejandro Fernández Lima.
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

-- El avatar.
--
-- `avatar_url` sigue siendo la foto: hoy la escribe Google, mañana un servicio de archivos.
-- Estas tres columnas guardan la otra opción, la figura, que no es un archivo sino tres datos:
-- con qué estilo se dibuja, con qué semilla, y qué partes eligió la persona.
--
-- La semilla se guarda aparte del nombre a propósito. Si fuera el nombre, cambiar cómo te
-- llamás te cambiaría la cara, y al revés: dos personas que se llaman igual no tendrían con qué
-- diferenciarse. Vacía significa "usá mi nombre", que es de dónde sale la primera figura.
--
-- `avatar_style` nulo es la señal de "prefiero mi foto": mientras no haya estilo elegido gana
-- `avatar_url`, y si tampoco hay foto se cae a la figura, que es lo que ya pasaba.
alter table people add column if not exists avatar_style text;
alter table people add column if not exists avatar_seed text;

-- Las partes elegidas, como {"eyes":"variant03","hairColor":"ac6511"}. Van en jsonb y no en
-- columnas porque cada estilo tiene las suyas: el robot tiene antena y la carita tiene pelo, y
-- la lista la manda la librería que dibuja, no esta tabla. Lo que sí se controla es la forma,
-- y eso se valida en Go antes de llegar acá.
alter table people add column if not exists avatar_options jsonb;

alter table people drop constraint if exists people_avatar_style_check;
alter table people add constraint people_avatar_style_check check (
  avatar_style is null or avatar_style in ('adventurer', 'bigSmile', 'funEmoji', 'bottts')
);
