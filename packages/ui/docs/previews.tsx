// Un vistazo de cada pieza para el índice. Son estáticos y no interactivos a propósito: la
// tarjeta entera es un enlace, así que lo que hay adentro no debe robarle el clic.
import {
  AvatarGroup, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Chip, Counter,
  Heading, Icon, IconButton, Input, Logo, Progress, ProgressRing, Slider, Sparkline, Spinner, Squiggle,
  Switch, Text,
} from '@melu/ui'
import { CircleCheck, Layers, MoreHorizontal, Search, Sparkles, Star } from 'lucide-react'

const frame = 'pointer-events-none flex flex-wrap items-center justify-center gap-2'

export const PREVIEWS: Record<string, () => React.ReactNode> = {
  button: () => (
    <div className={frame}>
      <Button size="sm">Guardar</Button>
      <Button size="sm" variant="secondary">Cancelar</Button>
      <Button size="sm" variant="ghost">Ver</Button>
    </div>
  ),
  'icon-button': () => (
    <div className={frame}>
      <IconButton label="Buscar" icon={<Icon icon={Search} />} />
      <IconButton label="Destacar" variant="subtle" icon={<Icon icon={Star} />} />
      <IconButton label="Más" variant="outline" shape="circle" icon={<Icon icon={MoreHorizontal} />} />
    </div>
  ),
  field: () => (
    <div className="pointer-events-none w-52">
      <Text size="xs" weight="medium">Nombre del grupo</Text>
      <Input placeholder="4° A · Matemática" className="mt-1" />
      <Text size="xs" variant="subtle" className="mt-1">Lo ven los aprendices.</Text>
    </div>
  ),
  input: () => <div className="pointer-events-none w-52"><Input placeholder="Buscar…" startIcon={<Icon icon={Search} size="sm" />} /></div>,
  select: () => (
    <div className="pointer-events-none w-52 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
      <span className="flex items-center justify-between"><span>Segundo ciclo</span><span className="text-ink-subtle">⌄</span></span>
    </div>
  ),
  checkbox: () => (
    <div className={frame}>
      <Checkbox checked>Listo</Checkbox><Checkbox checked="indeterminate">Mixto</Checkbox><Checkbox>Pendiente</Checkbox>
    </div>
  ),
  radio: () => (
    <div className="pointer-events-none flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-2"><span className="grid size-4 place-items-center rounded-full border-2 border-accent"><span className="size-2 rounded-full bg-accent" /></span>Individual</span>
      <span className="flex items-center gap-2 text-ink-muted"><span className="size-4 rounded-full border-2 border-border" />En parejas</span>
    </div>
  ),
  switch: () => <div className={frame}><Switch checked>Avisos</Switch><Switch>Resumen</Switch></div>,
  toggle: () => (
    <div className={frame}>
      <Chip size="sm" color="accent">Negrita</Chip><Chip size="sm">Cursiva</Chip><Chip size="sm">Subrayado</Chip>
    </div>
  ),
  segmented: () => (
    <div className="pointer-events-none inline-flex gap-1 rounded-lg bg-muted p-1 text-sm">
      <span className="rounded-md px-3 py-1 text-ink-muted">Día</span>
      <span className="rounded-md bg-surface px-3 py-1 font-medium shadow-sm">Semana</span>
      <span className="rounded-md px-3 py-1 text-ink-muted">Mes</span>
    </div>
  ),
  slider: () => <div className="pointer-events-none w-48"><Slider value={62} /></div>,
  card: () => (
    <Card className="pointer-events-none w-52 scale-90">
      <CardHeader className="pb-2"><CardTitle className="text-base">Puente de espagueti</CardTitle></CardHeader>
      <CardContent className="pt-0"><Text size="xs" variant="muted">Un reto de una hora.</Text></CardContent>
    </Card>
  ),
  chip: () => (
    <div className={frame}>
      <Chip color="accent" size="sm">Reto</Chip><Chip size="sm">Pantalla</Chip><Badge>3</Badge>
    </div>
  ),
  avatar: () => (
    <div className={frame}>
      <AvatarGroup size="sm" names={['Sofía', 'Benjamín', 'Thiago', 'Malena', 'Lucía']} />
    </div>
  ),
  text: () => (
    <div className="pointer-events-none text-center">
      <Heading size="lg">Aprender deja huella</Heading>
      <Text size="xs" variant="muted">El cuerpo del texto, un escalón abajo.</Text>
    </div>
  ),
  icon: () => (
    <div className={frame}>
      <Icon icon={Sparkles} size="xs" /><Icon icon={Sparkles} size="sm" /><Icon icon={Sparkles} size="md" /><Icon icon={Sparkles} size="lg" />
    </div>
  ),
  spinner: () => <div className={frame}><Spinner size="sm" /><Spinner /><Spinner size="lg" /></div>,
  dialog: () => (
    <div className="pointer-events-none w-48 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <Text size="sm" weight="semibold">Invitar al grupo</Text>
      <Text size="xs" variant="muted" className="mt-0.5">Entran con Google.</Text>
      <div className="mt-2 flex gap-1.5"><span className="rounded-md bg-ink px-2 py-1 text-[10px] text-white">Invitar</span></div>
    </div>
  ),
  'alert-dialog': () => (
    <div className="pointer-events-none w-52 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <Text size="sm" weight="semibold">¿Borrar la actividad?</Text>
      <div className="mt-2 flex justify-end gap-1.5 text-2xs">
        <span className="rounded-md px-2 py-1 text-ink-muted">Cancelar</span>
        <span className="rounded-md bg-danger px-2 py-1 text-white">Borrar</span>
      </div>
    </div>
  ),
  drawer: () => (
    <div className="pointer-events-none flex h-20 w-52 justify-end overflow-hidden rounded-lg border border-line bg-muted">
      <div className="h-full w-28 border-l border-line bg-surface p-2 shadow-lg">
        <Text size="2xs" weight="semibold">Editar el grupo</Text>
        <div className="mt-1.5 h-2 w-full rounded-xs bg-muted" />
        <div className="mt-1 h-2 w-2/3 rounded-xs bg-muted" />
      </div>
    </div>
  ),
  dropdown: () => (
    <div className="pointer-events-none w-40 rounded-xl border border-line bg-surface p-1.5 text-sm shadow-lg">
      <span className="block rounded-lg bg-hover px-2 py-1">Editar</span>
      <span className="block px-2 py-1 text-ink-muted">Duplicar</span>
      <span className="block px-2 py-1 text-ink-muted">Compartir</span>
    </div>
  ),
  popover: () => (
    <div className="pointer-events-none w-44 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <Text size="xs" weight="semibold">Contenido libre</Text>
      <Text size="xs" variant="muted" className="mt-0.5">Un filtro, una explicación.</Text>
    </div>
  ),
  tooltip: () => <div className="pointer-events-none rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white">Aparece a los 200 ms</div>,
  portal: () => <div className={frame}><Icon icon={Layers} size="xl" color="subtle" /></div>,
  tabs: () => (
    <div className="pointer-events-none flex gap-4 border-b border-line text-sm">
      <span className="-mb-px border-b-2 border-accent pb-1.5 font-medium text-accent">Resumen</span>
      <span className="pb-1.5 text-ink-muted">Entregas</span>
      <span className="pb-1.5 text-ink-muted">Señales</span>
    </div>
  ),
  feedback: () => (
    <div className="pointer-events-none flex w-56 flex-col gap-2">
      <span className="flex items-center gap-2 rounded-lg bg-success-subtle px-3 py-2 text-xs">
        <Icon icon={CircleCheck} size="sm" className="text-success" />Actividad asignada
      </span>
      <Progress value={62} />
    </div>
  ),
  charts: () => (
    <div className={frame}>
      <Sparkline data={[3, 5, 4, 7, 6, 9, 12]} className="text-accent" />
      <ProgressRing value={0.62} size={44} stroke={5} />
      <Text size="lg" weight="bold"><Counter to={128} /></Text>
    </div>
  ),
  slot: () => (
    <div className="pointer-events-none flex flex-col items-center gap-1 font-mono text-xs text-ink-muted">
      <span>&lt;Button asChild&gt;</span>
      <span className="text-accent">&lt;a href="…"&gt;Ir&lt;/a&gt;</span>
      <span>&lt;/Button&gt;</span>
    </div>
  ),
  brand: () => (
    <div className="pointer-events-none flex flex-col items-center gap-1">
      <Logo />
      <Text size="xs" variant="muted">con su <Squiggle>gesto</Squiggle></Text>
    </div>
  ),
}
