import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@melu/ui'
import { useMe } from './lib/session'
import { api, type Group } from './lib/api'
import { GuideShell, LearnerShell } from './Shell'
import { SpaceProvider } from './lib/space'
import { SignIn } from './screens/SignIn'
import { Welcome } from './screens/Welcome'
import { Home } from './screens/Home'
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
import { Kit } from './screens/Kit'
import { Start } from './screens/Start'

// If someone arrives with an invite code and already has a session, they join and go on to Today.
function Join() {
  const { code } = useParams()
  const qc = useQueryClient()
  const nav = useNavigate()
  useEffect(() => { if (code) api.post<Group>('/api/join', { code }).finally(async () => { await qc.invalidateQueries({ queryKey: ['me'] }); nav('/today', { replace: true }) }) }, [code, qc, nav])
  return <div className="grid min-h-screen place-items-center"><Spinner /></div>
}

export function App() {
  const me = useMe()
  // With `window.location.pathname` this misses router navigations: the URL changes and the
  // screen stays where it was. We have to listen to the real location.
  const { pathname } = useLocation()
  const mode = me.data?.mode
  useEffect(() => { if (mode === 'learner') document.documentElement.dataset.mode = 'learner'; else delete document.documentElement.dataset.mode }, [mode])

  if (pathname.startsWith('/kit')) return <Kit />

  if (me.isPending) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (!me.data) return <Routes><Route path="/join/:code" element={<SignIn />} /><Route path="*" element={<SignIn />} /></Routes>

  const inJoin = pathname.startsWith('/join/')
  if (inJoin) return <Routes><Route path="/join/:code" element={<Join />} /><Route path="*" element={<Navigate to="/today" replace />} /></Routes>

  // The welcome walkthrough lives outside the modes: it takes the whole screen and anyone can
  // enter. A learner redoes it whenever they want; a teacher goes through it to see the same
  // thing the kids will see, which is the only honest way to have an opinion about it.
  if (pathname.startsWith('/start')) return <Start />

  if (me.data.mode === 'new') return <Welcome me={me.data} />

  if (me.data.mode === 'learner') {
    // First things first: if they never went through the onboarding, that is where they start.
    if (!me.data.profile) return <Start />
    return (
      <Routes>
        <Route path="/mission/:id" element={<MissionScreen />} />
        <Route path="*" element={
          <LearnerShell me={me.data}>
            <Routes>
              <Route path="/today" element={<Today me={me.data} />} />
              <Route path="/progress" element={<Progress />} />
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
        <Route path="/home" element={<Home me={me.data} />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/activities" element={<Library />} />
        <Route path="/activities/new" element={<NewActivity />} />
        <Route path="/activities/:id" element={<Editor />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="/lenses" element={<Lenses />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </GuideShell>
    </SpaceProvider>
  )
}
