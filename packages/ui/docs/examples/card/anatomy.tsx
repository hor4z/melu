import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Puente de espagueti</CardTitle>
        <CardDescription>Reto · Design thinking</CardDescription>
      </CardHeader>
      <CardContent>
        <Text size="sm" variant="muted">Un puente que aguante un vaso lleno de agua entre dos mesas.</Text>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="secondary">Usar</Button>
        <Button size="sm" variant="ghost">Ver</Button>
      </CardFooter>
    </Card>
  )
}
