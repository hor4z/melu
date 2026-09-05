import { Slot, Slottable, cn } from '@melu/ui'

// Así se ve por dentro un componente que acepta `asChild`: el adorno queda afuera de la marca
// y el hijo de verdad, adentro. Sin `Slottable`, el slot se quedaría con el punto.
function Pill({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const Cmp = asChild ? Slot : 'span'
  return (
    <Cmp className={cn('inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm')}>
      <span className="size-1.5 rounded-full bg-accent" />
      <Slottable>{children}</Slottable>
    </Cmp>
  )
}

export default function Demo() {
  return (
    <>
      <Pill>Soy un span</Pill>
      <Pill asChild><a href="#examples">Soy un enlace</a></Pill>
    </>
  )
}
