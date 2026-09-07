import { useEffect } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import { Spinner } from '@melu/ui'
import { useMe } from './lib/session'
import { GuideShell, LearnerShell } from './Shell'
import { SpaceProvider } from './lib/space'
import { SignIn } from './screens/SignIn'
import { Welcome } from './screens/Welcome'
import { Home } from './screens/Home'
import { Focus } from './screens/Focus'
import { Groups } from './screens/Groups'
import { GroupDetail } from './screens/GroupDetail'
import { Library } from './screens/Library'
import { NewActivity } from './screens/NewActivity'
import { Editor } from './screens/Editor'
import { Review } from './screens/Review'
import { Lenses } from './screens/Lenses'
import { Today } from './screens/Today'
import { MissionScreen } from './screens/Mission'
import { Progress } from './screens/Progress'
import { Profile } from './screens/Profile'
import { Submissions } from './screens/Submissions'

/** Manda una ruta vieja a la nueva conservando el id: `/mission/7` sale por `/missions/7`. */
function VieneDe({ to }: { to: string }) {
  const { id } = useParams()
  return <Navigate to={`${to}/${id}`} replace />
}

export function App() {
  const me = useMe()
  const mode = me.data?.mode
  useEffect(() => { if (mode === 'learner') document.documentElement.dataset.mode = 'learner'; else delete document.documentElement.dataset.mode }, [mode])

  if (me.isPending) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  // Sin sesión, cualquier ruta muestra la entrada. La URL no cambia: después de Google se
  // vuelve a ella, que es a donde la persona iba.
  if (!me.data) return <SignIn />

  if (me.data.mode === 'new') return <Welcome me={me.data} />

  if (me.data.mode === 'learner') {
    return (
      <Routes>
        {/* Una misión se abre a pantalla completa, sin riel ni cabecera: es la única pantalla
            del aprendiz donde hay algo que hacer y no algo que mirar. */}
        <Route path="/missions/:id" element={<MissionScreen />} />
        <Route path="/mission/:id" element={<VieneDe to="/missions" />} />
        <Route path="*" element={
          <LearnerShell me={me.data}>
            <Routes>
              <Route path="/today" element={<Today me={me.data} />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile me={me.data} />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Routes>
          </LearnerShell>
        } />
      </Routes>
    )
  }

  return (
    <SpaceProvider me={me.data}>
    <GuideShell me={me.data}>
      {/* El árbol dice de qué es cada id, y cada nivel existe como pantalla: se puede subir uno
          y llegar a algo. Lo que se corrige es una actividad asignada a un grupo, así que vive
          adentro del grupo y no en una raíz suelta ("/review/:id" no decía qué era ese id, y
          la misma actividad está asignada a varios grupos con entregas distintas). */}
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/progress" element={<Focus />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/groups/:groupId/missions/:id" element={<Review />} />
        <Route path="/activities" element={<Library />} />
        <Route path="/activities/new" element={<NewActivity />} />
        <Route path="/activities/:id" element={<Editor />} />
        <Route path="/lenses" element={<Lenses />} />
        <Route path="/profile" element={<Profile me={me.data} />} />
        {/* Las de antes siguen andando. Un enlace guardado o pegado en un chat no tiene por qué
            enterarse de que acá adentro se reordenó nada; "/review/:id" ni sabe de qué grupo es,
            así que esa la manda la pantalla cuando la respuesta se lo dice. */}
        <Route path="/focus" element={<Navigate to="/progress" replace />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </GuideShell>
    </SpaceProvider>
  )
}
