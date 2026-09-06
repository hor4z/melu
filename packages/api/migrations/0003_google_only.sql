-- Google es la única puerta, y el email es la identidad estable.
--
-- El avatar se guarda como una URL a secas y no como "la foto de Google": hoy la escribe el
-- login, mañana puede escribirla un servicio propio de archivos sin tocar el modelo.
alter table people add column if not exists avatar_url text;

-- `pin_hash` era el camino para que un aprendiz entrara sin cuenta. Nunca se implementó y no la
-- lee una sola línea de Go; con Google como única puerta ya no va a existir.
alter table people drop column if exists pin_hash;

-- El email venía comparándose con `email=$1`, sensible a mayúsculas: `Sofia@escuela.edu` y
-- `sofia@escuela.edu` eran dos personas distintas. Como el guía escribe los emails a mano y
-- Google los devuelve en minúsculas, eso rompía el encuentro entre los dos. Se normaliza lo que
-- ya está y el índice pasa a ser sobre la forma en minúsculas.
update people set email = lower(email) where email is not null and email <> lower(email);
alter table people drop constraint if exists people_email_key;
create unique index if not exists people_email_lower on people (lower(email));

-- Se va el código de grupo: nadie tiene que dictar, copiar ni escanear seis letras. Al grupo se
-- entra porque el guía sumó tu email, y cuando entrás con Google ya está esperándote.
alter table groups drop column if exists code;
