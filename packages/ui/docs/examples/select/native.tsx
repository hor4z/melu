import { NativeSelect } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-64">
      <NativeSelect defaultValue="2">
        <option value="1">Primer ciclo</option>
        <option value="2">Segundo ciclo</option>
        <option value="3">Secundaria</option>
      </NativeSelect>
    </div>
  )
}
