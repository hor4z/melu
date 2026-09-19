// Sumar gente a un grupo, escribiendo emails. Es lo que reemplazó al código de seis letras:
// en vez de darle algo al chico para que lo tipee, el guía escribe lo único que ya sabe de él.
//
// Vive acá y no en el design system porque sabe de grupos y de aprendices, que son de melu.
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertBody, AlertTitle, Button, Field, Textarea } from '@milo/ui'
import { api } from '../lib/api'

type Result = { added: string[]; already: string[] }

export function AddLearners({ groupId, groupName, onDone }: { groupId: string; groupName?: string; onDone?: () => void }) {
  const qc = useQueryClient()
  const [raw, setRaw] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  // Se aceptan comas, punto y coma, espacios o un email por línea: el guía pega lo que tiene,
  // que suele venir de una planilla, y no de un formato que le pidamos nosotros.
  const emails = raw.split(/[\s,;]+/).map((e) => e.trim()).filter((e) => e.includes('@'))

  const add = useMutation({
    mutationFn: () => api.post<Result>(`/api/groups/${groupId}/members`, { emails }),
    onSuccess: async (r) => {
      setResult(r)
      setRaw('')
      await qc.invalidateQueries({ queryKey: ['group', groupId] })
      onDone?.()
    },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
      <Field
        label={groupName ? `Sumá a los chicos de "${groupName}"` : 'Sumá a los chicos'}
        hint="Un email por línea, o separados por comas. Entran con Google y el grupo ya los está esperando."
      >
        <Textarea
          rows={4} value={raw} onChange={(e) => setRaw(e.target.value)}
          placeholder={'sofia@escuela.edu\nbenjamin@escuela.edu'}
        />
      </Field>

      {add.isError && <span className="text-body text-bad-ink">No se pudieron sumar. Probá de nuevo.</span>}

      {result && (result.added.length > 0 || result.already.length > 0) && (
        <Alert tone="ok">
          <AlertTitle>{result.added.length} {result.added.length === 1 ? 'sumado' : 'sumados'}</AlertTitle>
          <AlertBody>
            {result.added.join(', ')}
            {result.already.length > 0 && <span className="block text-text-muted">Ya estaban: {result.already.join(', ')}</span>}
          </AlertBody>
        </Alert>
      )}

      <div>
        <Button type="submit" icon="person_add" disabled={add.isPending || emails.length === 0}>
          {emails.length > 1 ? `Sumar ${emails.length}` : 'Sumar'}
        </Button>
      </div>
    </form>
  )
}
