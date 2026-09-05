import { Card, CardContent, CardHeader, CardMedia, CardTitle, DoodleBridge, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Card className="w-full max-w-xs overflow-hidden">
      <CardMedia className="h-32 bg-teal"><DoodleBridge size={110} className="text-ink" /></CardMedia>
      <CardHeader className="pb-2"><CardTitle>Construir un puente</CardTitle></CardHeader>
      <CardContent><Text size="sm" variant="muted">La portada va a sangre: toca los bordes de la tarjeta.</Text></CardContent>
    </Card>
  )
}
