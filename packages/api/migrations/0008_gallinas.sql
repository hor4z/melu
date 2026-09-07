-- El renombre de la receta también para las bases que ya existen.
--
-- Editar `0002_recipes.sql` en el lugar alcanza para una base nueva y para nadie más: las
-- migraciones se anotan por nombre de archivo y las ya aplicadas no vuelven a correr. Sin esto,
-- una base viva se quedaba con "Reto de la semana" y las dos señales que sugieren esta receta
-- la buscan por título: no la encontraban y quedaban sin nada que ofrecer.
--
-- Alcanza también a las copias que un espacio haya hecho y no haya renombrado: es el mismo
-- contenido, y el nombre viejo es justamente lo que se está arreglando.
update activities set title = 'Gallinas y conejos' where title = 'Reto de la semana';
