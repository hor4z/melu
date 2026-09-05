// El índice de piezas: una entrada por componente, y de acá salen tanto la lista como cada
// página. Lo que NO vive acá es la lista de props ni la firma: eso lo lee el compilador de
// las fuentes (`virtual:melu-props`). Acá va solo lo que un humano tiene que decidir —a qué
// grupo pertenece, para qué sirve, cuándo no usarlo— que es justamente lo que ninguna
// herramienta puede deducir.

export type Group = 'Acciones' | 'Formulario' | 'Contenido' | 'Diálogos y capas' | 'Navegación' | 'Estado' | 'Datos' | 'Marca' | 'Primitivas'

export type Demo = {
  /** El archivo bajo `docs/examples/<slug>/`, sin extensión. Es el código que se muestra. */
  id: string
  title: string
  note?: string
}

export type Entry = {
  slug: string
  title: string
  group: Group
  /** Una línea. Es lo que se lee en el índice, así que dice para qué sirve, no qué es. */
  summary: string
  /** Todo lo que el barril exporta de esta familia. La tabla de props se arma con esto. */
  exports: string[]
  demos: Demo[]
  /** Cuándo usarlo. */
  when?: string[]
  /** Cuándo no. La mitad que separa un sistema de un catálogo. */
  whenNot?: string[]
}

export const REGISTRY: Entry[] = [
  {
    slug: 'button',
    title: 'Button',
    group: 'Acciones',
    summary: 'La acción de una pantalla. Un solo primario por vista.',
    exports: ['Button', 'ButtonGroup'],
    demos: [
      { id: 'variants', title: 'Variantes', note: 'La jerarquía se lee sola: el primario es uno, el resto acompaña.' },
      { id: 'sizes', title: 'Tamaños e íconos', note: 'El ícono va antes cuando anticipa la acción y después cuando la continúa.' },
      { id: 'states', title: 'Estados', note: '`loading` deshabilita y anuncia `aria-busy`: no hay que acordarse de las dos cosas.' },
      { id: 'as-child', title: 'Como enlace', note: 'Con `asChild` el botón presta el estilo y el elemento sigue siendo un `<a>`.' },
      { id: 'group', title: 'Grupo', note: 'Acciones hermanas del mismo peso, pegadas en una sola pieza.' },
    ],
    when: [
      'Algo pasa al tocarlo: se guarda, se abre, se envía.',
      'Es la acción principal de la vista, y entonces es el único `primary`.',
    ],
    whenNot: [
      'Si navega a otro lado, es un enlace: `asChild` con un `<Link>`.',
      'Si no tiene texto visible, es un `IconButton` — que pide `label` y no compila sin él.',
    ],
  },
  {
    slug: 'icon-button',
    title: 'IconButton',
    group: 'Acciones',
    summary: 'Un botón que es solo un ícono. El nombre accesible es obligatorio.',
    exports: ['IconButton'],
    demos: [
      { id: 'variants', title: 'Variantes y formas', note: 'Las mismas variantes que `Button`, más `shape` para el círculo.' },
      { id: 'label', title: 'El label no es opcional', note: 'Está en el tipo: sin él no compila, porque sin él el lector anuncia «botón».' },
    ],
    when: ['La acción se entiende sola por el ícono y el espacio es poco: una fila, una barra, una tarjeta.'],
    whenNot: ['Si el ícono necesita explicación, poné texto: un `Button` con `startIcon`.'],
  },
  {
    slug: 'field',
    title: 'Field',
    group: 'Formulario',
    summary: 'Etiqueta, descripción, estado y aria alrededor de cualquier control.',
    exports: ['Field', 'FieldLabel', 'FieldDescription', 'FieldStatus', 'Form', 'FormRow', 'FormActions'],
    demos: [
      { id: 'basic', title: 'Lo mínimo', note: 'El control que va adentro se cablea solo: id, `aria-describedby` y estado.' },
      { id: 'states', title: 'Estados', note: 'El error se anuncia con `role="alert"`; el éxito, no.' },
      { id: 'form', title: 'Un formulario', note: '`Form`, `FormRow` y `FormActions` arman el ritmo vertical sin clases sueltas.' },
    ],
    when: ['Todo control que tenga etiqueta. Es la forma de que el aria no dependa de acordarse.'],
    whenNot: ['Un control sin etiqueta visible ni descripción no necesita `Field`: le alcanza su `aria-label`.'],
  },
  {
    slug: 'input',
    title: 'Input',
    group: 'Formulario',
    summary: 'Texto de una línea o de varias, con íconos y botón de limpiar.',
    exports: ['Input', 'Textarea'],
    demos: [
      { id: 'basic', title: 'Con ícono y limpiable', note: 'El ícono es decorativo; el botón de limpiar sí lleva nombre.' },
      { id: 'textarea', title: 'Textarea', note: 'Crece con el contenido hasta el máximo que se le diga.' },
    ],
  },
  {
    slug: 'select',
    title: 'Select',
    group: 'Formulario',
    summary: 'Elegir uno de una lista. Con teclado, tecleo para buscar y grupos.',
    exports: ['Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem', 'SelectGroup', 'SelectLabel', 'SelectSeparator', 'NativeSelect'],
    demos: [
      { id: 'basic', title: 'Lo habitual', note: 'Controlado con `value` o suelto con `defaultValue`.' },
      { id: 'groups', title: 'Agrupado', note: 'Cuando la lista tiene familias, el rótulo las ordena sin hacer scroll a ciegas.' },
      { id: 'native', title: 'El nativo', note: 'Cuando la lista es simple, el del sistema operativo es mejor en móvil.' },
    ],
    when: ['Más de cinco opciones, o si la lista puede crecer.'],
    whenNot: ['Pocas opciones excluyentes y siempre visibles: `SegmentedControl`.'],
  },
  {
    slug: 'checkbox',
    title: 'Checkbox',
    group: 'Formulario',
    summary: 'Sí o no, con estado intermedio cuando manda a un grupo.',
    exports: ['Checkbox'],
    demos: [
      { id: 'basic', title: 'Los tres estados', note: '`indeterminate` es un estado real, no un truco visual: se anuncia como «mixto».' },
    ],
  },
  {
    slug: 'radio',
    title: 'RadioGroup',
    group: 'Formulario',
    summary: 'Una opción entre varias, en lista o en tarjetas.',
    exports: ['RadioGroup', 'RadioGroupItem', 'RadioCard'],
    demos: [
      { id: 'basic', title: 'En lista', note: 'Las flechas se mueven entre opciones y la selección sigue al foco.' },
      { id: 'cards', title: 'En tarjetas', note: 'Cuando cada opción necesita explicarse, la tarjeta le da lugar.' },
    ],
    whenNot: ['Si las opciones no son excluyentes, son checkboxes.'],
  },
  {
    slug: 'switch',
    title: 'Switch',
    group: 'Formulario',
    summary: 'Prender y apagar algo que aplica en el momento.',
    exports: ['Switch'],
    demos: [{ id: 'basic', title: 'Prendido y apagado' }],
    when: ['El cambio se aplica solo, sin botón de guardar.'],
    whenNot: ['Si hay que confirmar para que tenga efecto, es un checkbox dentro de un formulario.'],
  },
  {
    slug: 'toggle',
    title: 'Toggle',
    group: 'Formulario',
    summary: 'Un botón que queda apretado. Solo o en grupo.',
    exports: ['Toggle', 'ToggleGroup', 'ToggleGroupItem'],
    demos: [
      { id: 'basic', title: 'Solo y en grupo', note: 'El grupo puede ser de uno o de varios; el tipo lo dice.' },
    ],
  },
  {
    slug: 'segmented',
    title: 'SegmentedControl',
    group: 'Formulario',
    summary: 'Pocas opciones excluyentes, todas a la vista.',
    exports: ['SegmentedControl', 'SegmentedControlItem'],
    demos: [{ id: 'basic', title: 'Lo habitual' }],
    when: ['Entre dos y cinco opciones que conviene ver juntas: un rango de fechas, un modo de vista.'],
    whenNot: ['Más de cinco, o si la lista puede crecer: no entran y la fila se vuelve ilegible. Usá `Select`.'],
  },
  {
    slug: 'slider',
    title: 'Slider',
    group: 'Formulario',
    summary: 'Un número o un rango, con marcas y teclado.',
    exports: ['Slider'],
    demos: [
      { id: 'basic', title: 'Valor y rango', note: 'Flechas, Inicio y Fin, y ±10 con Shift.' },
    ],
    whenNot: ['Si el número exacto importa, un `Input` de tipo número se completa más rápido.'],
  },
  {
    slug: 'card',
    title: 'Card',
    group: 'Contenido',
    summary: 'La caja que agrupa. Con cabecera, contenido, pie y portada.',
    exports: ['Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter', 'CardMedia'],
    demos: [
      { id: 'anatomy', title: 'Anatomía', note: 'Las partes son opcionales, pero el orden no cambia.' },
      { id: 'interactive', title: 'Clickeable', note: 'Con `asChild` toda la caja pasa a ser un botón o un enlace de verdad.' },
      { id: 'media', title: 'Con portada', note: '`CardMedia` va a sangre arriba: la imagen toca los bordes.' },
      { id: 'tints', title: 'Tintes', note: 'Los fondos suaves ordenan sin pesar. Nunca dos seguidos.' },
    ],
  },
  {
    slug: 'chip',
    title: 'Chip',
    group: 'Contenido',
    summary: 'Una etiqueta corta. `Badge` es su versión para números.',
    exports: ['Chip', 'Badge'],
    demos: [
      { id: 'basic', title: 'Colores y tamaños' },
      { id: 'interactive', title: 'Con ícono, quitable y clickeable' },
      { id: 'badge', title: 'Badge', note: 'Más chico y más redondo: es para un número, no para una palabra.' },
    ],
    when: ['Una etiqueta: la disciplina, el estado, el tipo de actividad.'],
    whenNot: ['Un número sobre un ícono es un `Badge`: un chip con texto largo se lee como un badge roto.'],
  },
  {
    slug: 'avatar',
    title: 'Avatar',
    group: 'Contenido',
    summary: 'La cara de alguien, o sus iniciales si no hay foto.',
    exports: ['Avatar', 'AvatarGroup'],
    demos: [
      { id: 'basic', title: 'Foto, iniciales y estado', note: 'El mismo nombre cae siempre en el mismo tinte.' },
      { id: 'group', title: 'En grupo', note: 'Se superponen y el resto se cuenta.' },
    ],
  },
  {
    slug: 'text',
    title: 'Text',
    group: 'Contenido',
    summary: 'Todo el texto del sistema: cuerpo, títulos, rótulos y teclas.',
    exports: ['Text', 'Heading', 'Eyebrow', 'Kbd'],
    demos: [
      { id: 'heading', title: 'Títulos', note: 'El nivel es semántica y el tamaño es estilo: van por separado a propósito.' },
      { id: 'text', title: 'Cuerpo', note: 'La jerarquía se hace con color, no solo con tamaño.' },
      { id: 'eyebrow', title: 'Rótulo y teclas' },
    ],
  },
  {
    slug: 'icon',
    title: 'Icon',
    group: 'Contenido',
    summary: 'El envoltorio de lucide: fija tamaños, colores y accesibilidad.',
    exports: ['Icon'],
    demos: [
      { id: 'basic', title: 'Tamaños y colores' },
      { id: 'a11y', title: 'Accesibilidad', note: 'Es `aria-hidden` por defecto. El label es para el ícono que carga significado propio.' },
    ],
  },
  {
    slug: 'spinner',
    title: 'Spinner',
    group: 'Contenido',
    summary: 'Que algo está pasando y no se sabe cuánto falta.',
    exports: ['Spinner'],
    demos: [{ id: 'basic', title: 'Tamaños y anuncio', note: 'Con `label` se anuncia como `status`; sin él es decorativo.' }],
    whenNot: ['Si se sabe cuánto falta, es `Progress`. Si lo que se espera tiene forma, es `Skeleton`.'],
  },
  {
    slug: 'dialog',
    title: 'Dialog',
    group: 'Diálogos y capas',
    summary: 'Una decisión que interrumpe. Bloquea el scroll y atrapa el foco.',
    exports: ['Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogBody', 'DialogFooter', 'DialogClose'],
    demos: [
      { id: 'basic', title: 'Lo habitual', note: 'El foco entra al abrir y vuelve al disparador al cerrar.' },
      { id: 'nested', title: 'Con un select adentro', note: 'Escape cierra solo la lista, no el modal: para eso está el `FloatingTree`.' },
    ],
    whenNot: ['Si no hay que decidir nada, un `Popover` no interrumpe.'],
  },
  {
    slug: 'alert-dialog',
    title: 'AlertDialog',
    group: 'Diálogos y capas',
    summary: 'La confirmación. Una forma fija, porque una confirmación siempre tiene la misma.',
    exports: ['AlertDialog'],
    demos: [
      { id: 'basic', title: 'Confirmar algo destructivo', note: 'El foco entra en Cancelar, que es la salida segura; un clic afuera no lo cierra.' },
      { id: 'loading', title: 'Mientras la acción viaja', note: '`loading` hila el botón y bloquea el cierre hasta que termine.' },
    ],
    when: ['Hay que responder sí o no antes de seguir, y equivocarse cuesta.'],
    whenNot: [
      'Si no hay una decisión, no interrumpas: un `Alert` en la página alcanza.',
      'Si la confirmación tiene campos, es un `Dialog`: esto no es un formulario.',
    ],
  },
  {
    slug: 'drawer',
    title: 'Drawer',
    group: 'Diálogos y capas',
    summary: 'Un panel pegado a un borde. El mismo modal, entrando de costado.',
    exports: ['Drawer', 'DrawerTrigger', 'DrawerContent', 'DrawerHeader', 'DrawerTitle', 'DrawerDescription', 'DrawerBody', 'DrawerFooter', 'DrawerClose'],
    demos: [
      { id: 'basic', title: 'Lo habitual', note: 'Las partes son las mismas del `Dialog`: la cabecera, el cuerpo y el pie de un panel no son otra cosa.' },
      { id: 'sides', title: 'De qué borde entra', note: 'Derecha por defecto. `bottom` es el que sirve en el teléfono.' },
    ],
    when: [
      'El contenido acompaña a lo que hay atrás y conviene poder mirar las dos cosas: editar algo de una lista, un filtro largo.',
      'Es más alto que ancho, o más ancho que alto, y un modal centrado lo desperdicia.',
    ],
    whenNot: ['Si hay que decidir antes de seguir, interrumpí de verdad: `Dialog` o `AlertDialog`.'],
  },
  {
    slug: 'dropdown',
    title: 'DropdownMenu',
    group: 'Diálogos y capas',
    summary: 'Acciones sobre algo. `MoreMenu` es el de tres puntos, ya armado.',
    exports: ['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuCheckboxItem', 'DropdownMenuLabel', 'DropdownMenuSeparator', 'DropdownMenuGroup', 'MoreMenu'],
    demos: [
      { id: 'more', title: 'El de tres puntos', note: 'Una lista de opciones y listo: es el caso del 90 %.' },
      { id: 'custom', title: 'Armado a mano', note: 'Cuando el disparador no es un botón de tres puntos.' },
    ],
    whenNot: ['Si las opciones eligen algo en un formulario, es un `Select`.'],
  },
  {
    slug: 'popover',
    title: 'Popover',
    group: 'Diálogos y capas',
    summary: 'Contenido al lado de algo, sin interrumpir.',
    exports: ['Popover', 'PopoverAnchor', 'PopoverTrigger', 'PopoverContent', 'PopoverClose'],
    demos: [
      { id: 'basic', title: 'Lo habitual' },
      { id: 'anchor', title: 'Anclado a otra cosa', note: 'Cuando lo que abre no es lo mismo que lo que ancla.' },
    ],
  },
  {
    slug: 'tooltip',
    title: 'Tooltip',
    group: 'Diálogos y capas',
    summary: 'Una aclaración corta al pasar el mouse o al enfocar.',
    exports: ['Tooltip', 'TooltipTrigger', 'TooltipContent'],
    demos: [{ id: 'basic', title: 'Lo habitual', note: 'Aparece a los 200 ms y también con foco de teclado.' }],
    whenNot: ['No es el lugar de una información necesaria: en touch no existe.'],
  },
  {
    slug: 'portal',
    title: 'Portal',
    group: 'Diálogos y capas',
    summary: 'Sacar algo del árbol del DOM sin sacarlo del de React.',
    exports: ['Portal'],
    demos: [{ id: 'basic', title: 'Lo habitual', note: 'Lo usan por dentro el modal, el menú y el popover; casi nunca hace falta a mano.' }],
  },
  {
    slug: 'tabs',
    title: 'Tabs',
    group: 'Navegación',
    summary: 'Vistas hermanas del mismo nivel, una a la vez.',
    exports: ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'],
    demos: [{ id: 'basic', title: 'De línea y de píldora' }],
    whenNot: ['Si el contenido de cada pestaña merece su URL, son rutas.'],
  },
  {
    slug: 'feedback',
    title: 'Alert y compañía',
    group: 'Estado',
    summary: 'Avisos, progreso, esqueletos, vacíos y la línea que separa.',
    exports: ['Alert', 'Separator', 'Skeleton', 'Progress', 'EmptyState'],
    demos: [
      { id: 'alert', title: 'Alert', note: 'El tono dice qué pasó; la acción dice qué hacer.' },
      { id: 'progress', title: 'Progress' },
      { id: 'skeleton', title: 'Skeleton', note: 'Con la forma de lo que viene, no un rectángulo cualquiera.' },
      { id: 'empty', title: 'EmptyState', note: 'Siempre dice qué falta y qué se puede hacer. El vacío enseña el producto.' },
      { id: 'separator', title: 'Separator' },
    ],
  },
  {
    slug: 'charts',
    title: 'Sparkline, ProgressRing y Counter',
    group: 'Datos',
    summary: 'Tres piezas de datos dibujadas a mano, sin librería.',
    exports: ['Sparkline', 'ProgressRing', 'Counter'],
    demos: [
      { id: 'sparkline', title: 'Sparkline', note: 'Una tendencia, no un gráfico: sin ejes, sin leyenda, sin tooltip.' },
      { id: 'ring', title: 'ProgressRing', note: 'Un porcentaje que se mira de lejos.' },
      { id: 'counter', title: 'Counter', note: 'El número sube al aparecer. Para que un logro se note.' },
    ],
    whenNot: ['Si hace falta leer valores exactos o comparar series, no alcanza: eso es una tabla o una librería de gráficos.'],
  },
  {
    slug: 'brand',
    title: 'La marca',
    group: 'Marca',
    summary: 'El logo, el subrayado, el marco de foto y los doodles.',
    exports: [
      'Logo', 'Logomark', 'Squiggle', 'PhotoFrame',
      'DoodleWave', 'DoodleGroup', 'DoodleBulb', 'DoodleBridge', 'DoodleMap',
      'DoodleRobot', 'DoodleKitchen', 'DoodleLock', 'DoodleBook', 'DoodleSprout',
    ],
    demos: [
      { id: 'logo', title: 'Logo y logomark', note: 'El logomark solo cuando el nombre ya está dicho al lado.' },
      { id: 'squiggle', title: 'Squiggle', note: 'Una vez por página, en el título. Dos ya no subrayan nada.' },
      { id: 'photo', title: 'PhotoFrame' },
      { id: 'doodles', title: 'Doodles', note: 'Los diez, también en el objeto `DOODLES` para recorrerlos.' },
    ],
    when: ['La marca entra al sistema aunque no sea reusable fuera de melu: está dibujada contra los mismos tokens que todo lo demás.'],
  },
  {
    slug: 'slot',
    title: 'Slot',
    group: 'Primitivas',
    summary: 'El mecanismo detrás de `asChild`: prestarle el estilo a otro elemento.',
    exports: ['Slot', 'Slottable'],
    demos: [
      { id: 'basic', title: 'Cómo lo usa un componente', note: 'Casi nunca se usa a mano: se usa la prop `asChild` del componente.' },
    ],
    when: ['Al escribir un componente nuevo del sistema que tenga que aceptar `asChild`.'],
    whenNot: [
      'Para consumir el kit no hace falta: alcanza con `asChild`.',
      'Si el componente dibuja adornos alrededor del contenido, `Slottable` no es opcional: sin la marca el slot toma el primer elemento, que es el adorno.',
    ],
  },
]

export const GROUPS: Group[] = ['Acciones', 'Formulario', 'Contenido', 'Diálogos y capas', 'Navegación', 'Estado', 'Datos', 'Marca', 'Primitivas']

export const bySlug = new Map(REGISTRY.map((e) => [e.slug, e]))

/** El id del ancla de un grupo: sin acentos ni espacios, que es lo que acepta una URL. */
export const groupId = (group: Group) =>
  group.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
