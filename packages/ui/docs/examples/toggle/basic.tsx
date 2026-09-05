import { useState } from 'react'
import { Icon, Toggle, ToggleGroup, ToggleGroupItem } from '@melu/ui'
import { Bold, Eye, Italic, Underline } from 'lucide-react'

export default function Demo() {
  const [formats, setFormats] = useState(['bold'])
  return (
    <>
      <ToggleGroup type="multiple" value={formats} onValueChange={setFormats} variant="outline">
        <ToggleGroupItem value="bold" icon={<Icon icon={Bold} size="sm" />} aria-label="Negrita" />
        <ToggleGroupItem value="italic" icon={<Icon icon={Italic} size="sm" />} aria-label="Cursiva" />
        <ToggleGroupItem value="under" icon={<Icon icon={Underline} size="sm" />} aria-label="Subrayado" />
      </ToggleGroup>
      <Toggle icon={<Icon icon={Eye} size="sm" />}>Ver como aprendiz</Toggle>
    </>
  )
}
