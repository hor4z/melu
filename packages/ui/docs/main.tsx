import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { FloatingTree } from '@floating-ui/react'
import '../src/theme.css'
import { Layout } from './Layout'
import { Overview } from './pages/Overview'
import { Goals } from './pages/Goals'
import { Guidelines } from './pages/Guidelines'
import { Theme } from './pages/Theme'
import { Icons } from './pages/Icons'
import { Components, SECTIONS } from './pages/Components'

// FloatingTree igual que en la app: sin él, un menú dentro de un modal cierra el modal, y el
// sitio no reflejaría el entorno donde estos componentes viven de verdad.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FloatingTree>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Overview /></Layout>} />
          <Route path="/goals" element={<Layout sections={Goals.sections}><Goals /></Layout>} />
          <Route path="/guidelines" element={<Layout sections={Guidelines.sections}><Guidelines /></Layout>} />
          <Route path="/theme" element={<Layout sections={Theme.sections}><Theme /></Layout>} />
          <Route path="/icons" element={<Layout sections={Icons.sections}><Icons /></Layout>} />
          <Route path="/components" element={<Layout sections={SECTIONS}><Components /></Layout>} />
        </Routes>
      </BrowserRouter>
    </FloatingTree>
  </StrictMode>,
)
