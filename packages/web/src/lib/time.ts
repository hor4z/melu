// Cuánto hace que pasó algo. En una lista de lo último que llegó, "hace 2 h" ubica mejor que una
// fecha completa, y a partir de la semana la fecha vuelve a ser lo más claro.
export function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `hace ${d} ${d === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
