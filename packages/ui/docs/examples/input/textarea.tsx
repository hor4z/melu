import { Textarea } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-full max-w-md">
      <Textarea autoGrow placeholder="Escribí varias líneas y mirá cómo crece…" />
    </div>
  )
}
