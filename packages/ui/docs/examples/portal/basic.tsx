import { Portal, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <Text size="sm" variant="muted">Lo de abajo se rinde al final del &lt;body&gt;, no acá.</Text>
      <Portal>
        <span className="fixed bottom-4 right-4 z-50 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg">
          Salí del árbol del DOM, no del de React
        </span>
      </Portal>
    </>
  )
}
