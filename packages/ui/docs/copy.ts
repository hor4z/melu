// La prosa del sitio, en español.
//
// El código de `src/` está en inglés —identificadores, comentarios y JSDoc— y así se queda:
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
    + 'adornos alrededor del contenido —Button con sus íconos, Chip con su span— envuelve acá lo '
    + 'que le pasaron: sin la marca, el slot no tiene forma de saber cuál es el verdadero.',

  // Íconos
  'Icon.icon': 'Cualquier ícono de lucide-react: ese es el set del kit.',
  'Icon.label': 'Solo para íconos con significado propio. Si al lado hay texto, dejalo vacío.',

  // Botones
  'Button.asChild': 'Rinde el hijo —un `<a>`, un `<Link>`— con los estilos del botón, en vez de un `<button>`.',
  'Button.loading': 'Muestra el spinner, deshabilita y anuncia el estado.',
  ButtonGroup: 'Botones pegados en una fila: comparten bordes y redondeo.',
  'IconButton.label': 'Obligatoria: es el nombre accesible del botón, porque no hay texto visible.',

  // Formulario
  'Field.asGroup': 'Para grupos —radios, checkboxes—: rinde fieldset y legend en vez de label.',
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
  AvatarGroup: 'Avatares superpuestos; pasado `max` muestra «+N».',
  Eyebrow: 'El rótulo de sección en mayúsculas: el gesto que ordena la página.',

  // Capas
  'DropdownMenuItem.keepOpen': 'Deja el menú abierto al elegir: sirve para opciones que se tildan.',
  'DropdownMenuItem.label': 'El texto para buscar tecleando. Si los hijos no son texto plano, pasalo a mano.',
  'DropdownMenuCheckboxItem.keepOpen': 'Deja el menú abierto al elegir: sirve para opciones que se tildan.',
  'DropdownMenuCheckboxItem.label': 'El texto para buscar tecleando. Si los hijos no son texto plano, pasalo a mano.',
  'Dialog.purpose': '`required` bloquea el cierre con Escape o con un clic afuera: solo cierran los botones.',
  PopoverAnchor:
    'Ancla el panel a un elemento sin convertirlo en disparador: lo abre otra cosa —tipear «/», por ejemplo—.',
  Portal:
    'Saca el contenido del árbol del DOM y lo cuelga al final del body. Es lo que evita que un menú '
    + 'quede recortado por un `overflow: hidden` o tapado por el `z-index` de un padre. También deja '
    + 'las guardas de foco para que el tabulador no se escape del flotante.',

  // Estado y datos
  EmptyState: 'El vacío con una explicación: siempre decir qué falta y qué se puede hacer.',
  Sparkline: 'Una línea de tendencia mínima, sin librería.',

  // Marca
  Logomark: 'El logo, uno para toda la app: un zigzag de tres trazos, la «m» dibujada a mano.',
  Squiggle: 'El subrayado a mano abajo de una palabra. Una vez por página, en el título.',
  PhotoFrame: 'Una foto en un marco blanco con borde de tinta, apenas rotada.',
}
