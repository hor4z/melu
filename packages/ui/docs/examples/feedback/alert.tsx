import { Alert, Button } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Alert title="Todo en orden">Las entregas se guardan solas mientras los chicos trabajan.</Alert>
      <Alert variant="success" title="Actividad asignada">La van a ver en «Hoy» apenas entren.</Alert>
      <Alert variant="warning" title="Sin camino de retorno">Esta actividad ocurre con materiales pero no pide ninguna evidencia.</Alert>
      <Alert variant="danger" title="No se pudo guardar" actions={<Button size="sm" variant="secondary">Reintentar</Button>}>
        Revisá la conexión; el borrador quedó en tu equipo.
      </Alert>
    </div>
  )
}
