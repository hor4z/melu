import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { propsPlugin } from './docs/props-plugin.ts'

// El sitio del design system. No se buildea todavía: se mira en local con `make ui`.
export default defineConfig({
  plugins: [react(), tailwindcss(), propsPlugin()],
  server: { port: 5174 },
})
