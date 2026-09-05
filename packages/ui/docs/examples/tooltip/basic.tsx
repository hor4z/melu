import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@melu/ui'

export default function Demo() {
  return (
    <Tooltip>
      <TooltipTrigger><Button variant="ghost">Pasá el mouse o tabulá</Button></TooltipTrigger>
      <TooltipContent>Aparece a los 200 ms y también con foco de teclado</TooltipContent>
    </Tooltip>
  )
}
