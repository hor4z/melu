import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FloatingTree } from '@melu/ui'
import './index.css'
import { App } from './App'
import { onSessionExpired } from './lib/api'
import { forgetEverything } from './lib/session'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000 } } })

// Una sesión vencida vuelve a la pantalla de entrada de una vez, en vez de dejar cada pantalla
// rota por su cuenta. Se define acá porque es el único lugar que conoce el cliente de queries.
onSessionExpired(() => forgetEverything(qc))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        {/* The tree relates nested floating elements: closing a menu inside a modal does not close the modal. */}
        <FloatingTree>
          <App />
        </FloatingTree>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
