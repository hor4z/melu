import type { Bloque, Respuestas } from '../lib/api'
import { TextArea } from '@astryxdesign/core/TextArea'

// Cómo se ve un bloque cuando un aprendiz hace la actividad.
export function BloqueRunner({ b, r, onChange, soloLectura }: { b: Bloque; r: Respuestas; onChange: (id: string, v: string | number) => void; soloLectura?: boolean }) {
  const v = r[b.id]
  switch (b.tipo) {
    case 'titulo': return <h3 className="font-heading text-xl font-semibold">{b.texto}</h3>
    case 'parrafo': return <p className="text-base leading-relaxed">{b.texto}</p>
    case 'lista': return <ul className="list-disc space-y-1 pl-6">{b.texto.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
    case 'destacado': return <div className="rounded-lg border-l-4 border-accent-bg bg-accent-muted px-4 py-3">{b.texto}</div>
    case 'pregunta':
      return (
        <div className="rounded-lg border border-default bg-card p-4">
          <TextArea label={b.texto} value={String(v ?? '')} onChange={(t) => onChange(b.id, t)} rows={3} isDisabled={soloLectura} placeholder="Escribí acá…" />
        </div>
      )
    case 'chequeo':
      return (
        <div className="rounded-lg border border-default bg-card p-4">
          <p className="mb-3 font-medium">{b.texto}</p>
          <div className="flex flex-col gap-2">
            {(b.opciones ?? []).map((o, i) => (
              <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 ${v === i ? 'border-accent-bg bg-accent-muted' : 'border-default'} ${soloLectura ? 'cursor-default' : ''}`}>
                <input type="radio" className="accent-current" name={b.id} checked={v === i} disabled={soloLectura} onChange={() => onChange(b.id, i)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
      )
    case 'autoreporte':
      return (
        <div className="rounded-lg border border-default bg-card p-4">
          <p className="mb-3 font-medium">{b.texto}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" disabled={soloLectura} onClick={() => onChange(b.id, n)}
                className={`size-10 rounded-full border text-sm font-medium transition ${v === n ? 'border-accent-bg bg-accent-bg text-on-accent' : 'border-default hover:bg-muted'}`}>{n}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-secondary">Solo lo ves vos y tu guía. Nunca es una nota.</p>
        </div>
      )
    case 'evidencia':
      return (
        <div className="rounded-lg border border-dashed border-strong bg-muted p-4">
          <p className="font-medium">{{ foto: '📷', audio: '🎙️', archivo: '📎' }[b.kind ?? 'foto']} {b.texto}</p>
          <TextArea label="Mientras no se pueden subir archivos, contá qué mostrarías" value={String(v ?? '')} onChange={(t) => onChange(b.id, t)} rows={2} isDisabled={soloLectura} />
        </div>
      )
  }
}
