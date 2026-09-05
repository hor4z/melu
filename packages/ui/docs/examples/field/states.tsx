import { Field, Input } from '@melu/ui'

export default function Demo() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <Field label="Email" status={{ type: 'error', message: 'Ese email ya está invitado.' }}>
        <Input type="email" defaultValue="ana@escuela" />
      </Field>
      <Field label="Consigna" status={{ type: 'success', message: 'Se guarda solo.' }}>
        <Input defaultValue="Un puente que aguante un vaso" />
      </Field>
    </div>
  )
}
