import { Camera, Mic, Paperclip } from 'lucide-react'
import { Icon, Textarea } from '@/ui'
import type { Bloque, Respuestas } from '../lib/api'
import { Rotulo } from './Chips'

const ICONO = { foto: Camera, audio: Mic, archivo: Paperclip }

// Cómo se ve un bloque cuando un aprendiz hace la actividad.
export function BloqueRunner({ b, r, onChange, soloLectura }: { b: Bloque; r: Respuestas; onChange: (id: string, v: string | number) => void; soloLectura?: boolean }) {
  const v = r[b.id]
  switch (b.tipo) {
    case 'titulo': return <h3 className="text-xl font-semibold">{b.texto}</h3>
    case 'parrafo': return <p className="leading-relaxed text-ink">{b.texto}</p>
    case 'lista': return <ul className="list-disc space-y-1 pl-6">{b.texto.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
    case 'destacado':
      return <div className="rounded-md border-l-4 border-brand bg-brand-subtle px-4 py-3"><Rotulo className="mb-1 block">Consigna</Rotulo><p className="font-medium text-brand-text">{b.texto}</p></div>
    case 'pregunta':
      return (
        <div className="rounded-lg border border-line bg-surface p-4">
          <Rotulo className="mb-1 block">Pregunta</Rotulo>
          <p className="mb-3 font-medium">{b.texto}</p>
          <Textarea value={String(v ?? '')} onChange={(e) => onChange(b.id, e.target.value)} rows={3} disabled={soloLectura} placeholder="Escribí acá…" aria-label={b.texto} />
        </div>
      )
    case 'chequeo':
      return (
        <div className="rounded-lg border border-line bg-surface p-4">
          <Rotulo className="mb-1 block">Chequeo</Rotulo>
          <p className="mb-3 font-medium">{b.texto}</p>
          <div className="flex flex-col gap-2">
            {(b.opciones ?? []).map((o, i) => (
              <label key={i} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${v === i ? 'border-brand bg-brand-subtle' : 'border-line hover:bg-hover'} ${soloLectura ? '' : 'cursor-pointer'}`}>
                <input type="radio" className="accent-(--accent)" name={b.id} checked={v === i} disabled={soloLectura} onChange={() => onChange(b.id, i)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
      )
    case 'autoreporte':
      return (
        <div className="rounded-lg border border-line bg-surface p-4">
          <Rotulo className="mb-1 block">Cómo te fue</Rotulo>
          <p className="mb-3 font-medium">{b.texto}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" disabled={soloLectura} onClick={() => onChange(b.id, n)}
                className={`size-11 rounded-md border text-sm font-semibold transition-colors ${v === n ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-hover'}`}>{n}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">Solo lo ves vos y tu guía. Nunca es una nota.</p>
        </div>
      )
    case 'evidencia':
      return (
        <div className="rounded-lg border border-dashed border-line-strong bg-muted p-4">
          <div className="mb-2 flex items-center gap-2"><Icon icon={ICONO[b.kind ?? 'foto']} color="accent" /><Rotulo>Evidencia · {b.kind}</Rotulo></div>
          <p className="mb-3 font-medium">{b.texto}</p>
          <Textarea value={String(v ?? '')} onChange={(e) => onChange(b.id, e.target.value)} rows={2} disabled={soloLectura} placeholder="Mientras no se pueden subir archivos, contá qué mostrarías" aria-label={b.texto} />
        </div>
      )
  }
}
