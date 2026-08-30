import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@astryxdesign/core/theme'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import es from '@astryxdesign/core/locales/es-ES.json'
import { matchaTheme } from '@astryxdesign/theme-matcha/built'
import './index.css'
import { App } from './App'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InternationalizationProvider locale="es-ES" messages={{ 'es-ES': es }}>
      <Theme theme={matchaTheme}>
        <QueryClientProvider client={qc}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
)
