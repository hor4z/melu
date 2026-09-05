import { Button, Field, Form, FormActions, FormRow, Input, NativeSelect, Textarea } from '@melu/ui'

export default function Demo() {
  return (
    <Form className="w-full" onSubmit={(e) => e.preventDefault()}>
      <FormRow>
        <Field label="Nombre del grupo" required><Input placeholder="4° A · Matemática" /></Field>
        <Field label="Nivel">
          <NativeSelect defaultValue="2">
            <option value="1">Primer ciclo</option>
            <option value="2">Segundo ciclo</option>
            <option value="3">Secundaria</option>
          </NativeSelect>
        </Field>
      </FormRow>
      <Field label="Consigna" description="Lo que van a leer al abrir la misión." optional>
        <Textarea autoGrow placeholder="Un puente que aguante un vaso de agua…" />
      </Field>
      <FormActions>
        <Button type="submit">Guardar</Button>
        <Button variant="ghost">Cancelar</Button>
      </FormActions>
    </Form>
  )
}
