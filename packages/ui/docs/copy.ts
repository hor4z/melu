// La prosa del sitio, en español.
//
// El código de `src/` está en inglés (identificadores, comentarios y JSDoc) y así se queda:
// eso lo lee un programa y quien lo edita. Pero el sitio lo lee una persona, así que lo que
// se muestra sale de acá y no del JSDoc. Es la misma frontera que el resto del repo: clave
// técnica en inglés, etiqueta en español.
//
// Las claves son el nombre del export (`Button`) o el export con su prop (`Button.loading`),
// y salen del barril, no de acá. Si una prop del código tiene JSDoc y no tiene su línea en
// esta tabla, el índice de `/components` lo avisa: la traducción no puede quedarse atrás en
// silencio.

export const COPY: Record<string, string> = {
  // Primitivas
  Slottable:
    'Marca cuál de los hijos es el que `Slot` tiene que pasar a ser. Un componente que dibuja '
    + 'adornos alrededor del contenido (Button con sus íconos, Chip con su span) envuelve acá lo '
    + 'que le pasaron: sin la marca, el slot no tiene forma de saber cuál es el verdadero.',

  // Íconos
  'Icon.icon': 'Cualquier ícono de lucide-react: ese es el set del kit.',
  'Icon.label': 'Solo para íconos con significado propio. Si al lado hay texto, dejalo vacío.',

  // Botones
  'Button.asChild': 'Rinde el hijo (un `<a>`, un `<Link>`) con los estilos del botón, en vez de un `<button>`.',
  'Button.loading': 'Muestra el spinner, deshabilita y anuncia el estado.',
  ButtonGroup: 'Botones pegados en una fila: comparten bordes y redondeo.',
  'IconButton.label': 'Obligatoria: es el nombre accesible del botón, porque no hay texto visible.',

  // Formulario
  'Field.asGroup': 'Para grupos (radios, checkboxes): rinde fieldset y legend en vez de label.',
  'Field.label': 'La etiqueta corta. Si no la pasás, usá `<FieldLabel>` como hijo.',
  'Field.status': 'Un mensaje con tono: rojo para el error, ámbar para el aviso, verde para la confirmación.',
  Form: 'Las filas de un formulario, con el espaciado parejo.',
  'Input.clearable': 'Muestra una X para vaciar el campo cuando tiene texto.',
  'Textarea.autoGrow': 'Crece con el contenido en vez de hacer scroll.',
  'Switch.children': 'La etiqueta al lado del control. Sin esto, poné el Switch adentro de un Field.',
  'Switch.spread': 'Empuja la etiqueta al borde opuesto: es la forma de una lista de ajustes.',
  RadioGroupItem: 'Un radio con su etiqueta. Las flechas se mueven entre opciones, como corresponde.',
  RadioCard: 'La variante en tarjeta: toda la caja es clickeable. Sirve para elegir un modo o un plan.',
  'ToggleGroup.type': '`single` deja uno activo; `multiple` permite varios.',
  SegmentedControl: 'Un control para pocas opciones excluyentes, siempre visibles. Pasadas las cinco, usá un Select.',
  'SegmentedControl.layout': '`fill` reparte el ancho entre las opciones.',
  'Slider.onValueCommit': 'Se dispara al soltar: sirve para pegarle al servidor una sola vez.',
  'Slider.value': 'Un número para un valor; dos para un rango.',
  NativeSelect: 'El `<select>` del navegador con los estilos del kit: para formularios simples o listas muy largas.',

  // Contenido
  CardMedia: 'La franja de arriba a sangre: una portada, una ilustración o una foto.',
  'Chip.onRemove': 'Muestra la X para quitarlo: filtros, etiquetas elegidas.',
  Badge: 'Un contador o un estado corto. Más chico y más redondo que un Chip.',
  'Badge.onRemove': 'Muestra la X para quitarlo: filtros, etiquetas elegidas.',
  'Avatar.status': 'El punto de estado en la esquina: en línea, pendiente, lo que haga falta.',
  AvatarGroup: 'Avatares superpuestos; pasado `max` muestra "+N".',
  Eyebrow: 'El rótulo de sección en mayúsculas: el gesto que ordena la página.',

  // Capas
  MenuButton:
    'El disparador de un menú que muestra qué hay elegido: un visual a la izquierda, la etiqueta, '
    + 'una línea abajo y el chevron. El menú de la cuenta y el selector de espacios lo escribían '
    + 'cada uno por su lado, con su propio anillo de foco y su propio padding.',
  'MenuButton.leading': 'Lo que va a la izquierda: un Avatar, un Icon sobre un mosaico, un Logo.',
  'MenuButton.description': 'La segunda línea, más chica y más callada.',
  'MenuButton.block': 'Ocupa todo el ancho: el selector de la barra lateral sí, el de la cabecera no.',
  'MenuButton.chevron': 'Dos chevrones para elegir entre varios; uno para un menú común.',
  'MenuButton.compact': 'Abajo de `sm` queda solo el visual. Para cabeceras, donde el lugar se acaba antes.',
  MoreMenu: 'El menú de tres puntos: el gesto de "más acciones" sobre una fila o una tarjeta.',
  'Drawer.purpose': '`required` bloquea el cierre con Escape o con un clic afuera: solo cierran los botones.',
  Drawer: 'Un panel pegado a un borde. Las partes son las de Dialog, con otro nombre para que se lea.',
  'AlertDialog.trigger': 'Lo que abre la confirmación. Sin esto se controla de afuera con `open`.',
  'AlertDialog.children': 'Contenido extra entre la explicación y los botones. Casi nunca hace falta.',
  'AlertDialog.tone': '`danger` pinta el botón de confirmar en rojo: se borra, se expulsa, se pierde algo.',
  'AlertDialog.loading': 'Deja el botón hilando mientras la acción viaja, y bloquea el cierre.',
  'DialogContent.initialFocus': 'Qué se enfoca al abrir. Por defecto el primero; una confirmación enfoca Cancelar.',
  'Slottable.children': 'El hijo de verdad, el que el slot tiene que pasar a ser.',
  'DropdownMenuItem.keepOpen': 'Deja el menú abierto al elegir: sirve para opciones que se tildan.',
  'DropdownMenuItem.label': 'El texto para buscar tecleando. Si los hijos no son texto plano, pasalo a mano.',
  'DropdownMenuCheckboxItem.keepOpen': 'Deja el menú abierto al elegir: sirve para opciones que se tildan.',
  'DropdownMenuCheckboxItem.label': 'El texto para buscar tecleando. Si los hijos no son texto plano, pasalo a mano.',
  'Dialog.purpose': '`required` bloquea el cierre con Escape o con un clic afuera: solo cierran los botones.',
  PopoverAnchor:
    'Ancla el panel a un elemento sin convertirlo en disparador: lo abre otra cosa (tipear "/", por ejemplo).',
  Portal:
    'Saca el contenido del árbol del DOM y lo cuelga al final del body. Es lo que evita que un menú '
    + 'quede recortado por un `overflow: hidden` o tapado por el `z-index` de un padre. También deja '
    + 'las guardas de foco para que el tabulador no se escape del flotante.',

  // Estado y datos
  EmptyState: 'El vacío con una explicación: siempre decir qué falta y qué se puede hacer.',
  Sparkline: 'Una línea de tendencia mínima, sin librería.',
  Table:
    'Una tabla, en partes. La caja de alrededor hace el scroll horizontal ella sola, así que una '
    + 'tabla ancha nunca se lleva puesta a la página.',
  'Table.containerClassName': 'Clases para la caja de alrededor, que es la que hace el scroll.',
  TableHeader:
    '`sticky` deja la cabecera clavada mientras las filas pasan, y necesita que la caja de '
    + 'alrededor tenga alto (`containerClassName="max-h-96"`): lo que scrollea es esa caja, y en '
    + 'una caja tan alta como su contenido la cabecera no tiene contra qué pegarse. Va en las '
    + 'celdas y no en el `<thead>` a propósito: con `border-collapse`, una fila pegada pierde su '
    + 'borde de abajo.',
  TableFooter: 'La fila de cierre: los totales, o cuántas son.',
  'TableRow.interactive': 'La fila entera contesta al clic: cursor y hover.',
  'TableHead.sort': 'Para dónde ordena esta columna, o `false` cuando puede ordenar y no es la que ordena.',
  'TableHead.onSort': 'Pasarla convierte el título en un botón y anuncia `aria-sort`.',
  'TableCell.numeric': 'Números: a la derecha y con dígitos parejos, para que la columna se lea como columna.',
  TableCaption: 'Qué es la tabla, para quien no puede verla. Se lee debajo.',
  TableEmpty: 'La fila de "no hay nada": una celda a lo ancho, con el `EmptyState` adentro.',
  TableSkeleton:
    'El cuerpo mientras las filas viajan. Va en lugar de `TableBody`, así la cabecera se queda '
    + 'quieta y la tabla no cambia de tamaño cuando llegan los datos: una pantalla vacía que '
    + 'después salta es peor que una gris que no se mueve. Los anchos cambian de celda a celda a '
    + 'propósito: todos iguales se leen como un formulario y no como una lista de nombres.',
  'TableSkeleton.columns': 'Cuántas columnas tiene la tabla: el gris tiene que tener la forma de lo que viene.',
  Pagination:
    'La línea de abajo de una tabla: qué tramo se está viendo, y cómo pasar al de al lado. No hay '
    + 'números de página a propósito: la api entrega un tramo y dice si hay más, y un número '
    + 'prometería un total y un salto que un cursor no puede contestar. Lo que sí puede contestar '
    + 'es el siguiente y el anterior, y eso es lo que hay acá.',
  'PaginationStatus.to': 'La última de las que se ven, contando desde uno.',
  'PaginationStatus.from': 'La primera de las que se ven.',
  'PaginationStatus.total': 'Cuántas hay en total. Sin esto solo se dice el tramo.',
  'PaginationStatus.noun': 'Qué se está contando, en plural: "entregas".',
  'PaginationStatus.children': 'Reemplaza la frase entera cuando la pantalla tiene una mejor.',
  PaginationStatus:
    'Qué tramo se está viendo. Es la misma frase en todos lados para que nadie escriba la suya, y '
    + 'cuando el tramo es todo deja de contar desde dónde: "17 entregas" y no "1 a 17 de 17 '
    + 'entregas", que dice lo mismo tres veces.',
  PaginationPrev:
    'Van de a dos y están siempre, apagados en las puntas: un par que aparece y desaparece le '
    + 'corre el otro botón debajo del dedo a quien iba a tocarlo. Son `ghost` y no van con marco: '
    + 'la fila ya tiene su línea arriba y la tarjeta alrededor, y un tercer recuadro ahí adentro '
    + 'es uno de más.',
  PaginationNext: 'Su `disabled` es el `more` que contesta la api: mientras haya más, hay un siguiente.',
  DataList:
    'Las mismas filas de una `Table`, una abajo de la otra, para cuando no hay ancho. Una tabla en '
    + 'un celular o no se lee o se arrastra de costado, y de costado no la arrastra nadie: acá cada '
    + 'fila es una ficha, y lo que no entra es lo que no importaba.',
  DataListItem:
    'Una ficha. Adentro, una grilla de dos columnas: la figura a la izquierda y todo lo demás '
    + 'apilado a la derecha, que es lo que mantiene las líneas alineadas cuando el nombre es largo.',
  'DataListItem.interactive': 'La ficha entera contesta al clic: cursor y hover.',
  DataListMedia: 'La figura de la izquierda: un avatar, un ícono. Ocupa todo el alto de la ficha.',
  DataListHead: 'La primera línea: el título de un lado y, en la otra punta, el estado.',
  DataListText: 'La segunda línea: de qué se trata la ficha.',
  DataListMeta:
    'La letra chica, en pedazos: las columnas de la tabla que en el celular pasan a ser una sola '
    + 'línea. Separados por aire y no por un punto: un nombre puede traer su propio punto adentro '
    + '("4° A · Matemática") y entonces el separador y el contenido se ven igual, y la línea se lee '
    + 'como una sola tira. El espacio dice lo mismo y nunca choca con lo que está separando. A '
    + 'quien escucha le llega una coma que nadie ve: el aire no separa para quien no mira.',
  DataListActions: 'Las acciones, en la esquina de cierre de la ficha.',
  DataListSkeleton:
    'La lista mientras las fichas viajan. La misma forma que van a tener, así no salta nada '
    + 'cuando llegan los datos. Es el gemelo de `TableSkeleton`, para el ancho donde no hay tabla.',
  FilterSet:
    'Los filtros de una tabla, agregados de a uno. Es un botón mientras no hay nada filtrando, y '
    + 'cada filtro que se elige ahí aparece como una pastilla con su panel y su X. Mostrar todos '
    + 'los filtros de golpe le pide a la persona que los lea todos antes de saber cuál quiere; '
    + 'mostrar uno le pide que diga qué está buscando. Rinde hermanos, así que va adentro de una '
    + '`FilterBar`, al lado de la búsqueda.',
  'FilterSet.value': 'Qué está puesto: `{ estado: [\'submitted\'] }`. Una clave que está es un filtro en la barra.',
  'FilterSet.label': 'La palabra del botón mientras la barra está vacía.',
  'FilterSet.onReset': 'Reemplaza lo que hace el reset: sirve cuando la pantalla además tiene que vaciar su búsqueda.',
  'Filter.defaultOpen': 'Abre el panel apenas aparece: el que se acaba de agregar está pidiendo que lo contesten.',
  'Filter.onRemove': 'Dibuja la X que saca el filtro de la barra. Sin esto, el filtro está siempre.',
  Filter:
    'Un filtro de una tabla: un botón que dice qué filtra, y un panel para elegir. Guarda un arreglo '
    + 'de valores porque lo normal es querer dos estados a la vez, y funciona controlado o no, como el resto.',
  'Filter.label': 'Qué se filtra: "Estado", "Grupo". Es el nombre del botón y el de la lista.',
  'Filter.icon': 'Va a la izquierda del nombre, para distinguir un filtro de otro de un vistazo.',
  'Filter.loading': 'Mientras las opciones se están trayendo.',
  'Filter.multiple': 'Con `false` se elige una sola opción, y elegir cierra el panel.',
  'Filter.search':
    'Controlarla entrega la búsqueda: las opciones llegan ya filtradas. Lo elegido no se pierde '
    + 'de vista aunque la consulta lo deje afuera, pero queda con su valor crudo de nombre: mandá '
    + 'las opciones elegidas junto con los resultados y el disparador conserva su color y sus caras.',
  'Filter.searchable': 'La caja para buscar entre las opciones. Sola a partir de ocho.',
  FilterBar: 'La fila de arriba de una tabla: la búsqueda, los filtros y, cuando algo filtra, el reset.',
  FilterSearch: 'El texto libre de la barra: un `Input` con la lupa, la X y el ancho que corresponde.',
  'FilterSearch.clearable': 'Muestra una X para vaciar el campo cuando tiene texto.',
  FilterReset: 'Deshace todos los filtros de una. Mostralo solo cuando hay algo que deshacer.',

  // Marca
  Logomark: 'El logo, uno para toda la app: un zigzag de tres trazos, la "m" dibujada a mano.',
  PhotoFrame: 'Una foto en un marco blanco con borde de tinta, apenas rotada.',
}
