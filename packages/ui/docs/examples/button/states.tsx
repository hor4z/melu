import { Button } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <Button loading>Guardando</Button>
      <Button disabled>Deshabilitado</Button>
      <Button variant="secondary" loading>También el secundario</Button>
    </>
  )
}
