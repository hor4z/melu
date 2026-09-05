import { Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-64">
      <Select defaultValue="mat">
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
    </div>
  )
}
