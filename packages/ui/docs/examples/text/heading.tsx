import { Heading } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-2">
      {/* El nivel es semántica y el tamaño es estilo: un h2 puede verse chico sin romper el orden. */}
      <Heading level={1} size="display">Aprender deja huella</Heading>
      <Heading level={2} size="2xl">Un título de pantalla</Heading>
      <Heading level={3} size="xl">Un título de sección</Heading>
      <Heading level={4} size="md">Un título chico</Heading>
    </div>
  )
}
