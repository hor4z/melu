import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Los tests viven al lado del archivo que prueban, así que se buscan en `src`. El core no necesita
// DOM y la capa de vista sí: un solo entorno jsdom para los dos, porque separarlos en dos
// proyectos cuesta más de lo que ahorra.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
