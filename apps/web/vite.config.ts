import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // strictPort: fail loudly instead of silently moving to 5174, which the API's
  // WEB_ORIGIN and the e2e tests would not expect.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
