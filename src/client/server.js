import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// ─── API Proxy ─────────────────────────────────────────
// When client and server are separate Railway services, the React app sends
// API calls to the same origin (BASE = '').  This proxy forwards /api requests
// to the backend service so they don't 404 on the client server.
//
// Set BACKEND_URL in Railway (e.g. https://shebloom-server-production.up.railway.app)
// or use Railway private networking (http://<service>.railway.internal:<port>).
const BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_API_URL || '';

if (BACKEND_URL) {
  // Proxy all /api/* requests to the backend service
  app.use('/api', async (req, res) => {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    try {
      // Read the request body for non-GET requests
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);

      const headers = { ...req.headers, host: new URL(BACKEND_URL).host };
      delete headers['content-length']; // let fetch recalculate

      const resp = await fetch(url, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      });

      // Forward status and headers
      res.status(resp.status);
      for (const [key, value] of resp.headers.entries()) {
        // Skip hop-by-hop headers
        if (['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) continue;
        res.setHeader(key, value);
      }

      // Stream the response body
      const respBody = await resp.arrayBuffer();
      res.end(Buffer.from(respBody));
    } catch (err) {
      console.error('API proxy error:', err.message);
      res.status(502).json({ error: 'Backend unavailable', detail: err.message });
    }
  });
  console.log(`API proxy enabled → ${BACKEND_URL}`);
} else {
  console.warn(
    'WARNING: BACKEND_URL not set. /api requests will fail.\n' +
    'Set BACKEND_URL env var to the backend Railway service URL.'
  );
  // Return a clear JSON error instead of falling through to the SPA catch-all
  app.use('/api', (_req, res) => {
    res.status(503).json({
      error: 'Backend not configured. Set BACKEND_URL environment variable on the client Railway service.',
    });
  });
}

// Hashed JS/CSS assets → cache forever (content hash changes on rebuild)
// HTML files → NEVER cache (must always load fresh to pick up new JS bundles)
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  },
}));

// SPA fallback — always no-cache so new deploys take effect immediately
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => console.log(`SheBloom client v2.3 on port ${port}`));
