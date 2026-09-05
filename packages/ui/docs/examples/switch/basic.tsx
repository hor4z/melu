import { useState } from 'react'
import { Switch } from '@melu/ui'

export default function Demo() {
  const [on, setOn] = useState(true)
  return (
    <div className="flex w-full flex-col gap-4">
      <Switch checked={on} onCheckedChange={setOn}>Avisarme de cada entrega</Switch>
      <div className="w-full max-w-md rounded-xl border border-line p-4">
        {/* `spread` empuja el control al borde: es la forma de una lista de ajustes. */}
        <Switch spread defaultChecked>
          <span className="block font-medium">Notificaciones por email</span>
          <span className="block text-[13px] text-ink-muted">Un resumen por día, no uno por entrega.</span>
        </Switch>
      </div>
    </div>
  )
}
