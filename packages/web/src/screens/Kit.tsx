import { useState, type ReactNode } from 'react'
import {
  Bell, Bold, Camera, Check, Copy, Download, Eye, Italic, Mail, Pencil, Plus, Search, Send, Share2, Sparkles, Trash2, Underline, Users,
} from 'lucide-react'
import {
  Alert, Avatar, AvatarGroup, Badge, Button, ButtonGroup, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Checkbox, Chip, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  EmptyState, Eyebrow, Field, Form, FormActions, FormRow, Heading, Icon, IconButton, Input, Kbd, MoreMenu, NativeSelect,
  Popover, PopoverContent, PopoverTrigger, Progress, RadioCard, RadioGroup, RadioGroupItem, SegmentedControl, SegmentedControlItem,
  Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, Separator, Skeleton, Slider,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger, Text, Textarea, Toggle, ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger,
} from '@melu/ui'
import { Logo } from '@melu/ui'

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-4 border-t border-line pt-8">
      <div><Eyebrow>{id}</Eyebrow><Heading size="xl" className="mt-1">{title}</Heading>{note && <Text variant="muted" className="mt-1 max-w-2xl">{note}</Text>}</div>
      {children}
    </section>
  )
}
function Row({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {title && <Text size="sm" variant="subtle" weight="medium">{title}</Text>}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-5">{children}</div>
    </div>
  )
}

const SECTIONS: [string, string][] = [
  ['buttons', 'Botones'], ['icons', 'Íconos'], ['typography', 'Tipografía'], ['forms', 'Formularios'],
  ['selection', 'Selección'], ['slider', 'Slider'], ['chips', 'Chips y avatares'], ['cards', 'Tarjetas'],
  ['menus', 'Menús'], ['modals', 'Modales y capas'], ['navigation', 'Navegación'], ['feedback', 'Estados'],
]

export function Kit() {
  const [sw, setSw] = useState(true)
  const [check, setCheck] = useState<boolean | 'indeterminate'>('indeterminate')
  const [radio, setRadio] = useState('cpa')
  const [plan, setPlan] = useState('grupo')
  const [sec, setSec] = useState('semana')
  const [one, setOne] = useState(40)
  const [range, setRange] = useState<[number, number]>([20, 70])
  const [text, setText] = useState('')
  const [subject, setSubject] = useState('mat')
  const [formats, setFormats] = useState<string[]>(['bold'])
  const [tab, setTab] = useState('resumen')

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3"><Logo /><Chip color="accent" size="sm">UI kit</Chip></div>
          <Text size="sm" variant="muted">Componentes compuestos sobre los tokens del tema</Text>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav className="sticky top-24 hidden h-fit flex-col gap-0.5 lg:flex">
          {SECTIONS.map(([id, t]) => <a key={id} href={`#${id}`} className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:bg-hover hover:text-ink">{t}</a>)}
        </nav>

        <main className="flex min-w-0 flex-col gap-10">
          <div>
            <Heading level={1} size="display">El kit</Heading>
            <Text variant="muted" className="mt-2 max-w-2xl">Cada componente se compone de piezas, se le puede prestar el estilo a otro elemento con <Kbd>asChild</Kbd>, y funciona controlado o no. Los colores salen de los tokens: cambiás el tema y cambia todo.</Text>
          </div>

          <Section id="buttons" title="Botones" note="Un solo primario por vista. El secundario lleva borde de 2px, como en la referencia.">
            <Row title="Variantes">
              <Button>Primario</Button><Button variant="secondary">Secundario</Button><Button variant="outline">Contorno</Button>
              <Button variant="subtle">Suave</Button><Button variant="ghost">Fantasma</Button><Button variant="accent">Acento</Button>
              <Button variant="destructive">Destructivo</Button><Button variant="link">Enlace</Button>
            </Row>
            <Row title="Tamaños, íconos y estados">
              <Button size="sm">Chico</Button><Button>Mediano</Button><Button size="lg">Grande</Button>
              <Button startIcon={<Icon icon={Plus} />}>Con ícono</Button>
              <Button variant="secondary" endIcon={<Icon icon={Send} size="sm" />}>Enviar</Button>
              <Button loading>Guardando</Button><Button disabled>Deshabilitado</Button>
              <Button asChild variant="link"><a href="#buttons">Soy un enlace</a></Button>
            </Row>
            <Row title="Grupo y botones de ícono">
              <ButtonGroup>
                <Button variant="outline" startIcon={<Icon icon={Pencil} size="sm" />}>Editar</Button>
                <Button variant="outline" startIcon={<Icon icon={Copy} size="sm" />}>Duplicar</Button>
                <Button variant="outline" startIcon={<Icon icon={Share2} size="sm" />}>Compartir</Button>
              </ButtonGroup>
              <Separator orientation="vertical" className="h-8" />
              <IconButton label="Buscar" icon={<Icon icon={Search} size="lg" />} />
              <IconButton label="Notificaciones" variant="subtle" icon={<Icon icon={Bell} size="lg" />} />
              <IconButton label="Editar" variant="outline" icon={<Icon icon={Pencil} size="lg" />} />
              <IconButton label="Guardar" variant="primary" shape="circle" icon={<Icon icon={Check} size="lg" />} />
              <IconButton label="Borrar" variant="destructive" icon={<Icon icon={Trash2} size="lg" />} />
              <IconButton label="Cargando" loading icon={<Icon icon={Download} size="lg" />} />
            </Row>
          </Section>

          <Section id="icons" title="Íconos" note="Set único: lucide-react. Tamaños xs a xl y colores semánticos.">
            <Row>
              {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => <span key={s} className="flex flex-col items-center gap-1"><Icon icon={Camera} size={s} /><Text size="xs" variant="subtle">{s}</Text></span>)}
              <Separator orientation="vertical" className="h-8" />
              {(['ink', 'muted', 'subtle', 'accent', 'success', 'warning', 'danger'] as const).map((c) => <Icon key={c} icon={Sparkles} size="lg" color={c} label={c} />)}
            </Row>
          </Section>

          <Section id="typography" title="Tipografía" note="Inter para el cuerpo, Inter Tight para títulos. El rótulo en mayúsculas ordena la página.">
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
              <Eyebrow>Rótulo de sección</Eyebrow>
              <Heading level={2} size="display">Título de display</Heading>
              <Heading level={3} size="xl">Título de sección</Heading>
              <Text size="lg">Texto grande para una entrada o bajada.</Text>
              <Text>Texto normal, el que se usa en todos lados.</Text>
              <Text variant="muted">Texto apagado para lo secundario.</Text>
              <Text size="sm" variant="subtle">Texto chico y sutil, para pistas.</Text>
              <Text mono size="sm">Mono para códigos: DEMO4A</Text>
              <Text size="sm" variant="muted">Atajo: <Kbd>⌘K</Kbd> abre la búsqueda.</Text>
            </div>
          </Section>

          <Section id="forms" title="Formularios" note="Field arma etiqueta, descripción, estado y aria. Los controles adentro se cablean solos.">
            <div className="rounded-xl border border-line bg-surface p-6">
              <Form onSubmit={(e) => e.preventDefault()}>
                <FormRow>
                  <Field label="Nombre del grupo" description="Como lo van a ver los chicos." required>
                    <Input placeholder="4° A · Matemática" />
                  </Field>
                  <Field label="Email" status={{ type: 'error', message: 'Ese email ya está invitado.' }}>
                    <Input type="email" defaultValue="ana@escuela" startIcon={<Icon icon={Mail} size="sm" />} />
                  </Field>
                </FormRow>
                <FormRow>
                  <Field label="Buscar" optional>
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí para probar la X" clearable onClear={() => setText('')} startIcon={<Icon icon={Search} size="sm" />} />
                  </Field>
                  <Field label="Materia" description="Con búsqueda cuando la lista es larga.">
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent searchable>
                        <SelectLabel>Exactas</SelectLabel>
                        <SelectItem value="mat" description="Números, medida, patrones">Matemática</SelectItem>
                        <SelectItem value="fis" description="Fuerzas, energía">Física</SelectItem>
                        <SelectSeparator />
                        <SelectLabel>Humanas</SelectLabel>
                        <SelectItem value="len">Lengua</SelectItem>
                        <SelectItem value="soc">Sociales</SelectItem>
                        <SelectItem value="art" disabled>Arte (próximamente)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FormRow>
                <Field label="Consigna" description="Lo que van a leer al abrir la misión." status={{ type: 'success', message: 'Se guarda solo.' }}>
                  <Textarea autoGrow placeholder="Un puente que aguante un vaso de agua…" />
                </Field>
                <Field label="Nivel" description="Un select nativo cuando la lista es simple.">
                  <NativeSelect defaultValue="2"><option value="1">Primer ciclo</option><option value="2">Segundo ciclo</option><option value="3">Secundaria</option></NativeSelect>
                </Field>
                <FormActions><Button type="submit">Guardar</Button><Button variant="ghost">Cancelar</Button></FormActions>
              </Form>
            </div>
          </Section>

          <Section id="selection" title="Selección" note="Switch, checkbox, radios y toggles. Todo navegable con teclado.">
            <Row title="Switch y checkbox">
              <Switch checked={sw} onCheckedChange={setSw}>Avisarme de cada entrega</Switch>
              <Separator orientation="vertical" className="h-8" />
              <Checkbox checked={check} onCheckedChange={(v) => setCheck(v)} description="Marca mixta incluida">Seleccionar todo</Checkbox>
              <Checkbox defaultChecked>Simple</Checkbox>
              <Checkbox disabled>Deshabilitado</Checkbox>
            </Row>
            <div className="rounded-xl border border-line bg-surface p-5">
              <Switch spread checked={sw} onCheckedChange={setSw}>
                <span className="block font-medium">Notificaciones por email</span>
                <span className="block text-[13px] text-ink-muted">Un resumen por día, no uno por entrega.</span>
              </Switch>
            </div>
            <Row title="Radios">
              <Field asGroup label="Lente" description="Cómo se recorre la actividad.">
                <RadioGroup value={radio} onValueChange={setRadio} orientation="horizontal">
                  <RadioGroupItem value="cpa">CPA</RadioGroupItem>
                  <RadioGroupItem value="polya">Polya</RadioGroupItem>
                  <RadioGroupItem value="dt" description="Necesita un usuario real">Design thinking</RadioGroupItem>
                </RadioGroup>
              </Field>
            </Row>
            <RadioGroup value={plan} onValueChange={setPlan} className="grid gap-3 sm:grid-cols-3">
              <RadioCard value="alone" description="Cada uno con su ritmo.">Individual</RadioCard>
              <RadioCard value="pair" description="De a dos, se explican entre sí.">En pareja</RadioCard>
              <RadioCard value="whole_group" description="Equipos de cuatro.">En equipo</RadioCard>
            </RadioGroup>
            <Row title="Toggles y control segmentado">
              <ToggleGroup type="multiple" value={formats} onValueChange={setFormats} variant="outline">
                <ToggleGroupItem value="bold" icon={<Icon icon={Bold} size="sm" />} aria-label="Negrita" />
                <ToggleGroupItem value="italic" icon={<Icon icon={Italic} size="sm" />} aria-label="Cursiva" />
                <ToggleGroupItem value="under" icon={<Icon icon={Underline} size="sm" />} aria-label="Subrayado" />
              </ToggleGroup>
              <Toggle icon={<Icon icon={Eye} size="sm" />}>Ver como aprendiz</Toggle>
              <Separator orientation="vertical" className="h-8" />
              <SegmentedControl value={sec} onValueChange={setSec} label="Período">
                <SegmentedControlItem value="day">Día</SegmentedControlItem>
                <SegmentedControlItem value="semana">Semana</SegmentedControlItem>
                <SegmentedControlItem value="mes">Mes</SegmentedControlItem>
              </SegmentedControl>
            </Row>
          </Section>

          <Section id="slider" title="Slider" note="Valor único o rango, con marcas y teclado (flechas, Inicio/Fin, ±10 con Shift).">
            <div className="grid gap-8 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2">
              <Field label="Dificultad" description="Un solo valor, con globo al pasar.">
                <Slider value={one} onValueChange={(v) => setOne(v as number)} marks={[{ value: 0, label: 'Suave' }, { value: 50 }, { value: 100, label: 'Duro' }]} />
              </Field>
              <Field label="Minutos por misión" description="Rango, con formato propio.">
                <Slider value={range} onValueChange={(v) => setRange(v as [number, number])} min={0} max={120} step={5} minStepsBetweenThumbs={1} valueDisplay="text" formatValue={(v) => `${v} min`} />
              </Field>
            </div>
          </Section>

          <Section id="chips" title="Chips y avatares" note="Los chips usan los tintes del tema; los avatares derivan color e iniciales del nombre.">
            <Row title="Chips">
              {(['default', 'outline', 'solid', 'accent', 'teal', 'yellow', 'blue', 'lilac', 'orange', 'cyan', 'green', 'pink', 'success', 'warning', 'danger'] as const).map((c) => <Chip key={c} color={c}>{c}</Chip>)}
            </Row>
            <Row title="Tamaños, ícono, quitable y contador">
              <Chip size="sm">Chico</Chip><Chip>Mediano</Chip><Chip size="lg">Grande</Chip>
              <Chip color="teal" icon={<Icon icon={Sparkles} size="xs" />}>Con ícono</Chip>
              <Chip color="lilac" onRemove={() => {}}>Design thinking</Chip>
              <Badge>3</Badge><Badge color="success">Nuevo</Badge>
            </Row>
            <Row title="Avatares">
              {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => <Avatar key={s} name="Sofía Ramírez" size={s} />)}
              <Avatar name="Nico" shape="rounded" />
              <Avatar name="Valentina" status="online" />
              <Separator orientation="vertical" className="h-8" />
              <AvatarGroup names={['Sofía', 'Nico', 'Valentina', 'Mateo', 'Lucía', 'Benjamín']} />
            </Row>
          </Section>

          <Section id="cards" title="Tarjetas" note="Cabecera, contenido y pie; variantes con tinte para portadas y destacados.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader><CardTitle>Puente de espagueti</CardTitle><CardDescription>Reto · Design thinking</CardDescription></CardHeader>
                <CardContent><Text size="sm" variant="muted">Un puente que aguante un vaso lleno de agua entre dos mesas.</Text></CardContent>
                <CardFooter><Button size="sm" variant="secondary">Usar</Button><Button size="sm" variant="ghost">Ver</Button></CardFooter>
              </Card>
              <Card variant="elevated" interactive asChild>
                <button type="button">
                  <CardHeader><CardTitle>Tarjeta clickeable</CardTitle><CardDescription>Toda la caja responde</CardDescription></CardHeader>
                  <CardContent><Text size="sm" variant="muted">Con <Kbd>asChild</Kbd> pasa a ser un botón sin perder el estilo.</Text></CardContent>
                </button>
              </Card>
              <Card variant="yellow" padding="md">
                <Eyebrow>Código del grupo</Eyebrow>
                <Text mono size="xl" weight="bold" className="mt-1 tracking-[0.25em]">DEMO4A</Text>
                <Text size="sm" variant="muted" className="mt-2">Entran con Google y escriben esto.</Text>
              </Card>
            </div>
          </Section>

          <Section id="menus" title="Menús" note="Menú de tres puntos, menú de avatar y popover. Teclado, tecleo para buscar y cierre por Escape.">
            <Row>
              <MoreMenu items={[
                { label: 'Editar', icon: <Icon icon={Pencil} size="sm" /> },
                { label: 'Duplicar', icon: <Icon icon={Copy} size="sm" /> },
                { label: 'Compartir', icon: <Icon icon={Share2} size="sm" /> },
                { label: 'Eliminar', icon: <Icon icon={Trash2} size="sm" />, destructive: true, separatorBefore: true },
              ]} />
              <MoreMenu orientation="vertical" variant="outline" items={[{ label: 'Ver detalle' }, { label: 'Archivar' }]} />
              <Separator orientation="vertical" className="h-8" />
              <DropdownMenu placement="bottom-end">
                <DropdownMenuTrigger>
                  <button type="button" className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-hover">
                    <Avatar name="Horacio Rivero" size="sm" />
                    <span className="text-left text-sm leading-tight"><span className="block font-medium">Horacio</span><span className="block text-xs text-ink-subtle">Docente</span></span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent minWidth={220}>
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuItem icon={<Icon icon={Users} size="sm" />}>Mi perfil</DropdownMenuItem>
                  <DropdownMenuItem icon={<Icon icon={Copy} size="sm" />} shortcut="⌘E">Cambiar de espacio</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem icon={<Icon icon={Trash2} size="sm" />} destructive>Salir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger><Button variant="outline">Popover</Button></PopoverTrigger>
                <PopoverContent className="w-72">
                  <Heading size="md">Contenido libre</Heading>
                  <Text size="sm" variant="muted" className="mt-1">Un popover acepta cualquier cosa: un formulario chico, un filtro, una explicación.</Text>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger><Button variant="ghost">Pasá el mouse</Button></TooltipTrigger>
                <TooltipContent>Aparece a los 200 ms y también con foco de teclado</TooltipContent>
              </Tooltip>
            </Row>
          </Section>

          <Section id="modals" title="Modales" note="Bloquean el scroll, atrapan el foco y lo devuelven al cerrar.">
            <Row>
              <Dialog>
                <DialogTrigger><Button>Abrir modal</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invitar al grupo</DialogTitle><DialogDescription>Entran con Google y escriben el código.</DialogDescription></DialogHeader>
                  <DialogBody>
                    <Card variant="yellow" padding="md"><Eyebrow>Código</Eyebrow><Text mono size="xl" weight="bold" className="tracking-[0.3em]">DEMO4A</Text></Card>
                    <Field label="O mandá el link por email" className="mt-4"><Input placeholder="alguien@escuela.edu" startIcon={<Icon icon={Mail} size="sm" />} /></Field>
                    <Field label="Grupo" description="Un select adentro del modal: Escape cierra solo la lista." className="mt-4">
                      <Select defaultValue="a">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a">4° A · Matemática</SelectItem>
                          <SelectItem value="b">Taller de robótica</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </DialogBody>
                  <DialogFooter><Button variant="ghost" asChild><button type="button">Cancelar</button></Button><Button>Enviar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog purpose="required">
                <DialogTrigger><Button variant="destructive">Confirmación</Button></DialogTrigger>
                <DialogContent size="sm">
                  <DialogHeader showClose={false}><DialogTitle>¿Eliminar la actividad?</DialogTitle><DialogDescription>Se borra para vos y para los grupos donde está asignada. No se puede deshacer.</DialogDescription></DialogHeader>
                  <DialogFooter><Button variant="ghost">Cancelar</Button><Button variant="destructive">Eliminar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </Row>
          </Section>

          <Section id="navigation" title="Navegación" note="Pestañas de línea o de píldora, con flechas para moverse.">
            <div className="rounded-xl border border-line bg-surface p-6">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="missions">Misiones <Badge color="default">4</Badge></TabsTrigger>
                  <TabsTrigger value="people">Aprendices</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen"><Text variant="muted">Las señales y el avance del grupo.</Text></TabsContent>
                <TabsContent value="missions"><Text variant="muted">Lo asignado, con cuántos entregaron.</Text></TabsContent>
                <TabsContent value="people"><AvatarGroup names={['Sofía', 'Nico', 'Valentina', 'Mateo']} size="md" /></TabsContent>
              </Tabs>
            </div>
          </Section>

          <Section id="feedback" title="Estados" note="Avisos, progreso, esqueletos y vacíos que explican qué hacer.">
            <div className="flex flex-col gap-3">
              <Alert title="Todo en orden">Las entregas se guardan solas mientras los chicos trabajan.</Alert>
              <Alert variant="success" title="Actividad asignada">La van a ver en «Hoy» apenas entren.</Alert>
              <Alert variant="warning" title="Sin camino de retorno">Esta actividad ocurre con materiales pero no pide ninguna evidencia.</Alert>
              <Alert variant="danger" title="No se pudo guardar" actions={<Button size="sm" variant="secondary">Reintentar</Button>}>Revisá la conexión; el borrador quedó en tu equipo.</Alert>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card padding="md"><Progress value={7} max={12} label="Entregas" showValue /><Progress value={62} label="Aciertos" className="mt-4" /></Card>
              <Card padding="md"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div></Card>
            </div>
            <EmptyState icon={<Icon icon={Users} size={40} color="subtle" />} title="Todavía nadie se unió"
              description="Compartí el código del grupo o el QR. Entran con Google y aparecen acá."
              actions={<><Button>Invitar</Button><Button variant="ghost">Ver el código</Button></>} />
          </Section>
        </main>
      </div>
    </div>
  )
}
