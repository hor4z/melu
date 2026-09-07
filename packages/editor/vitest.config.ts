import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// El core no necesita DOM y los tests de la capa React sí. Un solo entorno jsdom para los dos:
// los del core no lo tocan, y separarlos en dos proyectos cuesta más de lo que ahorra.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
})
