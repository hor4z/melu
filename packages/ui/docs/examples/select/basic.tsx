import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-64">
      <Select defaultValue="mat">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="mat">Matemática</SelectItem>
          <SelectItem value="len">Lengua</SelectItem>
          <SelectItem value="soc">Sociales</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
