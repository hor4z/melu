import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El taller del motor: la página donde se prueba a mano lo que los tests prueban solos.
export default defineConfig({
  plugins: [react()],
  root: 'playground',
  server: { port: 5175 },
})
