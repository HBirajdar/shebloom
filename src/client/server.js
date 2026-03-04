import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');

// Health check for Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check if dist folder exists
if (!existsSync(DIST)) {
  console.error('ERROR: dist/ directory not found. Run "npm run build" first.');
  console.error('Looking in:', DIST);
}

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files with caching
app.use(express.static(DIST, {
  maxAge: '7d',
  etag: true,
  immutable: true,
  index: false,
}));

// SPA fallback — serve index.html for all non-file routes
app.get('*', (_req, res) => {
  const indexPath = join(DIST, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Application build pending. Please wait for deployment to complete.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SheBloom client running on port ${PORT}`);
  console.log(`  Serving from: ${DIST}`);
  console.log(`  Health: http://0.0.0.0:${PORT}/health`);
});
