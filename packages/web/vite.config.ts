import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// El build no queda acá: va a packages/api/internal/web/dist, que es el directorio
// que el binario embebe (ver packages/api/internal/web/embed.go).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // `@melu/ui` se consume como fuente, no como paquete publicado. Sin esto Vite lo pre-empaqueta
  // igual —está en node_modules, aunque sea un symlink del workspace— y ese pre-empaquetado no se
  // invalida al editar el kit: la app se queda con el barril viejo y la pantalla sale en blanco
  // con un «does not provide an export named …» que no tiene nada que ver con el código de hoy.
  optimizeDeps: { exclude: ['@melu/ui'] },
  build: {
    outDir: fileURLToPath(new URL('../api/internal/web/dist', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
})
