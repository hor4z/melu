import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/ui'
import { useYo } from './lib/sesion'
import { api, type Grupo } from './lib/api'
import { ShellGuia, ShellAprendiz } from './Shell'
import { Entrar } from './pantallas/Entrar'
import { Bienvenida } from './pantallas/Bienvenida'
import { Inicio } from './pantallas/Inicio'
import { Grupos } from './pantallas/Grupos'
import { GrupoDetalle } from './pantallas/GrupoDetalle'
import { Biblioteca } from './pantallas/Biblioteca'
import { NuevaActividad } from './pantallas/NuevaActividad'
import { Editor } from './pantallas/Editor'
import { Corregir } from './pantallas/Corregir'
import { Lentes } from './pantallas/Lentes'
import { Hoy } from './pantallas/Hoy'
import { MisionPantalla } from './pantallas/Mision'
import { Progreso } from './pantallas/Progreso'
import { Kit } from './pantallas/Kit'

// Si alguien llega con un código de invitación y ya tiene sesión, se une solo y sigue a Hoy.
function Unirme() {
  const { codigo } = useParams()
  const qc = useQueryClient()
  const nav = useNavigate()
  useEffect(() => { if (codigo) api.post<Grupo>('/api/unirme', { codigo }).finally(async () => { await qc.invalidateQueries({ queryKey: ['yo'] }); nav('/hoy', { replace: true }) }) }, [codigo, qc, nav])
  return <div className="grid min-h-screen place-items-center"><Spinner /></div>
}

export function App() {
  const yo = useYo()
  const modo = yo.data?.modo
  useEffect(() => { if (modo === 'aprendiz') document.documentElement.dataset.mode = 'aprendiz'; else delete document.documentElement.dataset.mode }, [modo])

  if (window.location.pathname.startsWith('/kit')) return <Kit />

  if (yo.isPending) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (!yo.data) return <Routes><Route path="/unirme/:codigo" element={<Entrar />} /><Route path="*" element={<Entrar />} /></Routes>

  const enUnirme = window.location.pathname.startsWith('/unirme/')
  if (enUnirme) return <Routes><Route path="/unirme/:codigo" element={<Unirme />} /><Route path="*" element={<Navigate to="/hoy" replace />} /></Routes>
  if (yo.data.modo === 'nuevo') return <Bienvenida yo={yo.data} />

  if (yo.data.modo === 'aprendiz') {
    return (
      <ShellAprendiz yo={yo.data}>
        <Routes>
          <Route path="/hoy" element={<Hoy yo={yo.data} />} />
          <Route path="/mision/:id" element={<MisionPantalla />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="*" element={<Navigate to="/hoy" replace />} />
        </Routes>
      </ShellAprendiz>
    )
  }

  return (
    <ShellGuia yo={yo.data}>
      <Routes>
        <Route path="/inicio" element={<Inicio yo={yo.data} />} />
        <Route path="/grupos" element={<Grupos yo={yo.data} />} />
        <Route path="/grupos/:id" element={<GrupoDetalle />} />
        <Route path="/actividades" element={<Biblioteca yo={yo.data} />} />
        <Route path="/actividades/nueva" element={<NuevaActividad yo={yo.data} />} />
        <Route path="/actividades/:id" element={<Editor />} />
        <Route path="/corregir/:id" element={<Corregir />} />
        <Route path="/lentes" element={<Lentes />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </ShellGuia>
  )
}
