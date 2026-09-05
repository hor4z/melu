import { Card, CardContent, CardDescription, CardHeader, CardTitle, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Card variant="elevated" interactive asChild className="w-full max-w-sm">
      <button type="button">
        <CardHeader>
          <CardTitle>Tarjeta clickeable</CardTitle>
          <CardDescription>Toda la caja responde</CardDescription>
        </CardHeader>
        <CardContent><Text size="sm" variant="muted">Con asChild pasa a ser un botón de verdad, sin perder el estilo.</Text></CardContent>
      </button>
    </Card>
  )
}
