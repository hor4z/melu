import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from '@astryxdesign/core/Spinner'
import { useYo } from './lib/sesion'
import { ShellGuia, ShellAprendiz } from './Shell'
import { Entrar } from './pantallas/Entrar'
import { Bienvenida } from './pantallas/Bienvenida'
import { Grupos } from './pantallas/Grupos'
import { GrupoDetalle } from './pantallas/GrupoDetalle'
import { Biblioteca } from './pantallas/Biblioteca'
import { Editor } from './pantallas/Editor'
import { Corregir } from './pantallas/Corregir'
import { Lentes } from './pantallas/Lentes'
import { Hoy } from './pantallas/Hoy'
import { MisionPantalla } from './pantallas/Mision'

export function App() {
  const yo = useYo()
  if (yo.isPending) return <div className="grid min-h-screen place-items-center"><Spinner label="Cargando" /></div>
  if (!yo.data) return <Entrar />
  if (yo.data.modo === 'nuevo') return <Bienvenida yo={yo.data} />

  if (yo.data.modo === 'aprendiz') {
    return (
      <ShellAprendiz yo={yo.data}>
        <Routes>
          <Route path="/hoy" element={<Hoy />} />
          <Route path="/mision/:id" element={<MisionPantalla />} />
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </ShellAprendiz>
    )
  }

  return (
    <ShellGuia yo={yo.data}>
      <Routes>
        <Route path="/grupos" element={<Grupos yo={yo.data} />} />
        <Route path="/grupos/:id" element={<GrupoDetalle />} />
        <Route path="/actividades" element={<Biblioteca yo={yo.data} />} />
        <Route path="/actividades/:id" element={<Editor />} />
        <Route path="/corregir/:id" element={<Corregir />} />
        <Route path="/lentes" element={<Lentes />} />
        <Route path="*" element={<Navigate to="/grupos" replace />} />
      </Routes>
    </ShellGuia>
  )
}
