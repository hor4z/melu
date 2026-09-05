import { Button, Icon } from '@melu/ui'
import { ArrowRight } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <Button asChild variant="link">
        <a href="#examples">Soy un enlace de verdad</a>
      </Button>
      <Button asChild endIcon={<Icon icon={ArrowRight} size="sm" />}>
        <a href="#examples">Con ícono, y sigue siendo un &lt;a&gt;</a>
      </Button>
    </>
  )
}
