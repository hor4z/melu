import { Field, Input } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-full max-w-sm">
      <Field label="Nombre del grupo" description="Como lo van a ver los chicos." required>
        <Input placeholder="4° A · Matemática" />
      </Field>
    </div>
  )
}
