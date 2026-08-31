// El formulario de programar una actividad: cuándo aparece, cuándo se entrega, y si se repite.
//
// Fechas y horas con los inputs nativos, a propósito: sin vista de mes no hay ninguna razón para
// construir un calendario propio, y el nativo trae el teclado numérico y el calendario del
// sistema en el celular, que es mejor que cualquier cosa que escribamos acá.
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Text, cn } from '@/kit'
import { api, type Asignacion, type Grupo } from '../lib/api'
import { Modal } from './Modal'
import { DIAS_SEMANA, describirRepeticion, diasEntre, expandir, formatearDia, hoyDia, sumarDias, type Dia, type Repeticion } from '../lib/fechas'

/** Siete botones. Sin ninguno elegido, no se repite: cero campos extra para el caso común. */
export function DiasDeLaSemana({ valor, onCambio }: { valor: number[]; onCambio: (v: number[]) => void }) {
  return (
    <div className="flex gap-1.5">
      {DIAS_SEMANA.map((d) => {
        const on = valor.includes(d.n)
        return (
          <button key={d.n} type="button" role="checkbox" aria-checked={on} aria-label={d.nombre}
            onClick={() => onCambio(on ? valor.filter((x) => x !== d.n) : [...valor, d.n])}
            className={cn('size-9 rounded border-2 text-sm font-semibold transition',
              on ? 'border-ink bg-ink text-white' : 'border-line text-ink-muted hover:border-ink/40')}>
            {d.inicial}
          </button>
        )
      })}
    </div>
  )
}

const proximaMediaHora = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Props = {
  abierto: boolean
  onCerrar: () => void
  actividadId: string
  grupoIdInicial?: string
  diaInicial?: Dia
  onListo?: (as: Asignacion[]) => void
}

export function Programar({ abierto, onCerrar, actividadId, grupoIdInicial, diaInicial, onListo }: Props) {
  const qc = useQueryClient()
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos'), enabled: abierto })
  const [grupoId, setGrupoId] = useState(grupoIdInicial ?? '')
  const [dia, setDia] = useState<Dia>(diaInicial ?? hoyDia())
  const [hora, setHora] = useState(proximaMediaHora())
  const [conCierre, setConCierre] = useState(false)
  const [diaCierre, setDiaCierre] = useState<Dia>(sumarDias(diaInicial ?? hoyDia(), 7))
  const [horaCierre, setHoraCierre] = useState('23:59')
  const [dias, setDias] = useState<number[]>([])
  const [hasta, setHasta] = useState<Dia>(sumarDias(diaInicial ?? hoyDia(), 60))

  const repite = dias.length > 0
  const regla: Repeticion = useMemo(() => ({ dias, hora, plazo: conCierre ? Math.max(0, diasEntre(dia, diaCierre)) : null, desde: dia, hasta }), [dias, hora, conCierre, dia, diaCierre, hasta])
  const fechas = useMemo(() => (repite ? expandir(regla) : []), [repite, regla])

  const listaGrupos = grupos.data ?? []
  const elegido = grupoId || listaGrupos[0]?.id || ''

  const guardar = useMutation({
    mutationFn: () => api.post<Asignacion[]>(`/api/actividades/${actividadId}/asignar`, {
      grupoId: elegido,
      abre: new Date(`${dia}T${hora}:00`).toISOString(),
      cierra: conCierre && !repite ? new Date(`${diaCierre}T${horaCierre}:00`).toISOString() : null,
      repetir: repite ? { dias, hora, plazo: regla.plazo, desde: dia, hasta } : null,
    }),
    onSuccess: (as) => {
      qc.invalidateQueries({ queryKey: ['programacion'] })
      qc.invalidateQueries({ queryKey: ['grupo'] })
      onListo?.(as)
      onCerrar()
    },
  })

  const demasiadas = repite && fechas.length > 200
  const puede = Boolean(elegido) && Boolean(dia) && Boolean(hora) && (!repite || (fechas.length > 0 && !demasiadas))

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} ancho={520} titulo="Programar"
      descripcion="Cuándo aparece, cuándo se entrega, y si se repite."
      pie={<><Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
        <Button onClick={() => guardar.mutate()} loading={guardar.isPending} disabled={!puede}>
          {repite && fechas.length > 0 ? `Programar ${fechas.length} fechas` : 'Programar'}
        </Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Grupo">
          <Select value={elegido} onValueChange={setGrupoId}>
            <SelectTrigger><SelectValue placeholder="Elegir grupo…" /></SelectTrigger>
            <SelectContent>
              {listaGrupos.map((g) => <SelectItem key={g.id} value={g.id} description={`${g.aprendices} aprendices`}>{g.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Aparece el"><Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Field>
          <Field label="A las"><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></Field>
        </div>

        {/* Detrás de un switch porque el 80 % de los casos no vence, y dos campos de fecha
            visibles a la vez invitan a confundir «aparece» con «se entrega». */}
        <Switch checked={conCierre} onCheckedChange={setConCierre}>Poner fecha de entrega</Switch>
        {conCierre && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3">
            <Field label="Se entrega el"><Input type="date" value={diaCierre} min={dia} onChange={(e) => setDiaCierre(e.target.value)} /></Field>
            <Field label="A las"><Input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} disabled={repite} /></Field>
            {repite && <Text size="xs" variant="subtle" className="col-span-2">Al repetirse, cada fecha se entrega {regla.plazo} {regla.plazo === 1 ? 'día' : 'días'} después, a la misma hora.</Text>}
          </div>
        )}

        <Field label="Se repite" description="Sin días elegidos, no se repite." asGroup>
          <div className="flex flex-col gap-3">
            <DiasDeLaSemana valor={dias} onCambio={setDias} />
            {repite && (
              <>
                <Field label="Hasta"><Input type="date" value={hasta} min={dia} onChange={(e) => setHasta(e.target.value)} /></Field>
                {/* La previa es el control de calidad del formulario: hace visible el error
                    antes de guardar. */}
                <div className="rounded-lg bg-muted p-3">
                  {fechas.length === 0 ? <Text size="sm" variant="danger">Ninguna fecha cae en ese rango.</Text>
                    : demasiadas ? <Text size="sm" variant="danger">Son más de 200 fechas. Acortá el «hasta».</Text>
                    : <>
                        <Text size="sm" weight="semibold">{fechas.length} {fechas.length === 1 ? 'fecha' : 'fechas'}</Text>
                        <Text size="xs" variant="muted">{fechas.slice(0, 5).map(formatearDia).join(' · ')}{fechas.length > 5 ? ' …' : ''}</Text>
                        <Text size="xs" variant="subtle" className="mt-1">{describirRepeticion(regla)}</Text>
                      </>}
                </div>
              </>
            )}
          </div>
        </Field>

        {guardar.isError && <Text size="sm" variant="danger">No se pudo programar. Revisá las fechas.</Text>}
      </div>
    </Modal>
  )
}
