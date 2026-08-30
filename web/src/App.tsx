import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from '@astryxdesign/core/Spinner'
import { useYo } from './lib/sesion'
import { Marco } from './Marco'
import { Entrar } from './pantallas/Entrar'
import { Grupos } from './pantallas/Grupos'
import { GrupoDetalle } from './pantallas/GrupoDetalle'
import { Lentes } from './pantallas/Lentes'

export function App() {
  const yo = useYo()
  if (yo.isPending) return <div className="grid min-h-screen place-items-center"><Spinner label="Cargando" /></div>
  if (!yo.data) return <Entrar />
  return (
    <Marco yo={yo.data}>
      <Routes>
        <Route path="/" element={<Navigate to="/grupos" replace />} />
        <Route path="/grupos" element={<Grupos yo={yo.data} />} />
        <Route path="/grupos/:id" element={<GrupoDetalle />} />
        <Route path="/lentes" element={<Lentes />} />
        <Route path="*" element={<Navigate to="/grupos" replace />} />
      </Routes>
    </Marco>
  )
}
