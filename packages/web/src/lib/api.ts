// Minimal client. A single place where fetch lives.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText)
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  get: <T>(p: string) => req<T>('GET', p),
  post: <T>(p: string, b?: unknown) => req<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => req<T>('PUT', p, b),
}

// ---- types mirroring the Go domain ----
export type Person = { ID: string; Email: string; Name: string }
export type Space = { id: string; name: string; slug: string; type: string }
export type Role = 'guide' | 'learner' | 'companion' | 'coordinator'
export type Membership = { spaceId: string; groupId: string | null; role: Role }
export type Group = { id: string; spaceId: string; name: string; code: string; tags: Record<string, string>; learners: number }
export type Phase = { key: string; name: string; asks: string }
export type Lens = { key: string; name: string; description: string; phases: Phase[] }
export type Me = { person: Person; mode: 'guide' | 'learner' | 'new'; spaces: Space[]; memberships: Membership[]; profile: boolean }
export type AuthOptions = { google: boolean; dev: boolean }

export type BlockType =
  | 'paragraph' | 'heading' | 'list' | 'callout'
  | 'question' | 'choice' | 'check' | 'multi' | 'number' | 'fill_in' | 'order' | 'match'
  | 'game' | 'manipulative'
  | 'evidence' | 'self_report'

export type Block = {
  id: string
  type: BlockType
  text: string
  options?: string[]          // opciones / varias
  correct?: number            // opciones (y el viejo chequeo)
  correctMulti?: number[]         // varias
  answer?: number           // numerico
  tolerance?: number          // numerico
  unit?: string              // numerico
  blanks?: string[]            // completar: lo que va en cada {{hueco}}
  items?: string[]             // ordenar: en el orden correcto
  pairs?: { left: string; right: string }[]  // emparejar y memoria
  // ---- juego ----
  engine?: GameEngine
  categories?: { name: string; items: string[] }[]        // clasificar
  questions?: { text: string; options: string[]; correct: number }[]  // contrarreloj
  seconds?: number                                         // contrarreloj
  // ---- manipulative: figures you drag ----
  figure?: ManipulativeFigure
  min?: number; max?: number; step?: number                 // recta numérica
  parts?: number                                           // barra de fracción
  coefA?: number; coefB?: number; coefC?: number            // balanza: a·x + b = c
  explanation?: string         // se muestra después de responder
  hint?: string               // se puede pedir antes
  media?: 'photo' | 'audio' | 'file'  // evidencia
}

/** What happened in each block: the signal that counts, richer than the final answer. */
export type GameEngine = 'sort' | 'memory' | 'time_attack'
export type ManipulativeFigure = 'number_line' | 'fraction_bar' | 'balance'

export type StepResult = { attempts: number; ok: boolean | null; ms: number }
export type Steps = Record<string, StepResult>
export type PhaseDoc = { key: string; name: string; asks?: string; blocks: Block[] }
export type Document = { phases: PhaseDoc[] }
export type Composition = {
  experience?: string; lens?: string; disciplines?: string[]
  setting?: string[]; social?: string; evidence?: string[]
}
export type Criterion = { id: string; label: string; levels: string[]; discipline?: string }
export type Activity = {
  id: string; spaceId: string | null; title: string; isRecipe: boolean
  composition: Composition; document: Document; rubric: Criterion[]; authors: string[]; updatedAt: string
}
export type Assignment = {
  id: string; activityId: string; groupId: string; title: string; composition: Composition
  document?: Document; rubric?: Criterion[]; opensAt: string; closesAt: string | null
  submissions: number; submissionsTotal: number; groupName?: string; myStatus: 'in_progress' | 'submitted' | 'graded' | null
}
export type AnswerValue = string | number | number[] | string[]
export type Answers = Record<string, AnswerValue>
export type Score = { id: string; level: number }
export type Submission = {
  id: string; assignmentId: string; learnerId: string; learner?: string
  status: 'in_progress' | 'submitted' | 'graded'; answers: Answers; artifacts: unknown[]; steps: Steps; scores: Score[]
  submittedAt: string | null; updatedAt: string
}
export type Room = { group: Group; missions: Assignment[] }
export type Mission = { assignment: Assignment; submission: Submission }
export type Learner = { id: string; name: string }
export type GroupDetail = { group: Group; assignments: Assignment[]; learners: Learner[] }

export const newId = () => Math.random().toString(36).slice(2, 10)

// ---- dashboard and progress ----
export type Signal = { learnerId: string; learner: string; groupId: string; group: string; kind: 'dropout' | 'misses' | 'slow' | 'shines'; detail: string; suggestion: string; recipeTitle?: string; recipeId?: string }
export type ByKind = { experience: string; submissions: number; avgMinutes: number; accuracy: number }
export type DaySeries = { day: string; opened: number; submitted: number }
export type SubmissionSummary = { submissionId: string; assignmentId: string; learner?: string; title: string; group: string; status: 'in_progress' | 'submitted' | 'graded'; minutes: number; accuracy: number; when: string }
export type Dashboard = { spaces: number; groups: number; learners: number; toReview: number; avgMinutes: number; accuracy: number; weekSeries: DaySeries[]; signals: Signal[]; byKind: ByKind[]; checklist: Record<string, boolean>; recentSubmissions: SubmissionSummary[] }
export type Progress = { done: number; inProgress: number; minutes: number; accuracy: number; streak: number; missions: SubmissionSummary[]; experiences: Record<string, number> }
export type Invite = { code: string; link: string; qr: string; group: string }
