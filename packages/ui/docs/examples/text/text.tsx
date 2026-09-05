import { Text } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-1">
      <Text size="lg">Una bajada, un escalón arriba del cuerpo</Text>
      <Text>El cuerpo del texto, que es lo que más se lee</Text>
      <Text variant="muted">Un texto secundario: la jerarquía se hace con color</Text>
      <Text size="sm" variant="subtle">Un pie, una aclaración</Text>
      <Text mono size="sm">Y el monoespaciado, para lo que es código</Text>
    </div>
  )
}
