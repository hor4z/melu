import { Tabs, TabsContent, TabsList, TabsTrigger, Text } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-8">
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="submissions">Entregas</TabsTrigger>
          <TabsTrigger value="signals">Señales</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><Text size="sm" variant="muted">Cómo va el grupo en una mirada.</Text></TabsContent>
        <TabsContent value="submissions"><Text size="sm" variant="muted">Lo que entregaron, con lo que falta arriba.</Text></TabsContent>
        <TabsContent value="signals"><Text size="sm" variant="muted">Quién brilla, quién se traba, quién se cayó.</Text></TabsContent>
      </Tabs>

      <Tabs defaultValue="week" variant="pill">
        <TabsList>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
