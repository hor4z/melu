import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
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
        <Route path="/mission/:id" element={<MissionScreen />} />
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
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/activities" element={<Library />} />
        <Route path="/activities/new" element={<NewActivity />} />
        <Route path="/activities/:id" element={<Editor />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/lenses" element={<Lenses />} />
        <Route path="/profile" element={<Profile me={me.data} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </GuideShell>
    </SpaceProvider>
  )
}
