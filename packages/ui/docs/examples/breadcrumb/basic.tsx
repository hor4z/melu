import { Breadcrumb, BreadcrumbItem, BreadcrumbPage, Card, Heading, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Card padding="md" className="w-full gap-3">
      {/* En la app cada paso es un <Link> del router: `asChild` le presta los estilos. */}
      <Breadcrumb>
        <BreadcrumbItem href="#">Grupos</BreadcrumbItem>
        <BreadcrumbItem href="#">Taller de robótica</BreadcrumbItem>
        <BreadcrumbPage>El robot que cuenta</BreadcrumbPage>
      </Breadcrumb>
      <Heading level={2} size="lg">El robot que cuenta</Heading>
      <Text size="sm" variant="muted">Achicá la ventana: abajo de sm la miga deja de ser un camino y queda la vuelta al grupo.</Text>
    </Card>
  )
}
