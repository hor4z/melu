import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Aparte del `vite.config.ts` del sitio a propósito: ese carga el plugin de props, que levanta
// un programa de TypeScript entero, y los tests no lo necesitan.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Los tests viven fuera de `src` porque el `@source` del theme escanea ese directorio: una
    // clase escrita en un test terminaría en el CSS de la app.
    css: false,
  },
})
