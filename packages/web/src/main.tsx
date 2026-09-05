import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FloatingTree } from '@floating-ui/react'
import './index.css'
import { App } from './App'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        {/* El árbol relaciona los flotantes anidados: cerrar un menú dentro de un modal no cierra el modal. */}
        <FloatingTree>
          <App />
        </FloatingTree>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
