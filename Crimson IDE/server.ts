import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { githubRouter } from './server/githubRouter';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', name: 'CsCode Crimson Code' });
  });

  // Mount GitHub OAuth & Git Remote API Router
  app.use(githubRouter);

  // Serve offline PWA service worker with explicit JS mime-type
  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    res.sendFile(swPath);
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CsCode Crimson Code] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
