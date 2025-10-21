import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin para redirigir '/' a '/index.html' en desarrollo
function redirectRootPlugin() {
  return {
    name: 'redirect-root',
    configureServer(server: { middlewares: { use: (arg0: (req: any, res: any, next: any) => void) => void; }; }) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/") {
          res.statusCode = 302;
          res.setHeader("Location", "/index.html");
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), redirectRootPlugin()],
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
