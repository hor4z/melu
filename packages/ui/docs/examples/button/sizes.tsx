import { Button, Icon } from '@melu/ui'
import { Plus, Send } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <Button size="sm">Chico</Button>
      <Button>Mediano</Button>
      <Button size="lg">Grande</Button>
      <Button startIcon={<Icon icon={Plus} />}>Crear actividad</Button>
      <Button variant="secondary" endIcon={<Icon icon={Send} size="sm" />}>Enviar</Button>
    </>
  )
}
