// ══════════════════════════════════════════════════════
// src/server/src/app.ts — Express Application Setup
// ══════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import path from 'path';
import fs from 'fs';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import debugRoutes from './routes/debug.routes';
import cycleRoutes from './routes/cycle.routes';
import moodRoutes from './routes/mood.routes';
import pregnancyRoutes from './routes/pregnancy.routes';
import doctorRoutes from './routes/doctor.routes';
import hospitalRoutes from './routes/hospital.routes';
import articleRoutes from './routes/article.routes';
import wellnessRoutes from './routes/wellness.routes';
import appointmentRoutes from './routes/appointment.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import productsRoutes from './routes/products.routes';
import aiRoutes from './routes/ai.routes';
import cartRoutes from './routes/cart.routes';
import achievementsRoutes from './routes/achievements.routes';
import reportsRoutes from './routes/reports.routes';

const app = express();

// ─── Security ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ───────────────────────────────────────────
const allowedOrigins = [
  'https://vedaclue.com',
  'https://www.vedaclue.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  process.env.RAILWAY_STATIC_URL,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app')
    ) {
      return callback(null, true);
    }
    // Log blocked origins for debugging
    console.log('[CORS] Blocked origin:', origin);
    // TEMPORARILY allow all to debug - remove after fixing
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Request-ID'],
}));

// Handle preflight explicitly
app.options('*', cors());

// ─── Body Parsing ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ─── Static file serving for uploads ────────────────
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Debug request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} Auth: ${req.headers.authorization ? 'YES' : 'NO'}`);
  next();
});

// ─── Logging ────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
  app.use(requestLogger);
}

// ─── Rate Limiting ──────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // increased from 20 — allows normal testing without hitting limit
  message: { error: 'Too many auth attempts. Please try after 15 minutes.' },
  skip: (req) => process.env.NODE_ENV !== 'production', // no limit in dev
});

app.use('/api/', generalLimiter);
app.use('/api/v1/auth/', authLimiter);

// ─── Health Check ───────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'VedaClue API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
  });
});

app.get('/api/ready', async (_req, res) => {
  try {
    // Could add DB and Redis ping checks here
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// ─── API Documentation ──────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VedaClue API Documentation',
}));

// ─── API Routes (v1) ────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/cycles', cycleRoutes);
app.use('/api/v1/mood', moodRoutes);
app.use('/api/v1/pregnancy', pregnancyRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/articles', articleRoutes);
app.use('/api/v1/wellness', wellnessRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/achievements', achievementsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/debug', debugRoutes);

// ─── Serve React Client (production) ────────────────
// Path from compiled server (src/server/dist/) to client build (src/client/dist/)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Error Handling ─────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
