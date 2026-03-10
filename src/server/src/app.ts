// ══════════════════════════════════════════════════════
// src/server/src/app.ts — Express Application Setup
// ══════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
import aiRoutes from './routes/ai.routes';
import cartRoutes from './routes/cart.routes';
import achievementsRoutes from './routes/achievements.routes';

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
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // If CORS_ORIGINS explicitly set, use that list
    if (allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Always allow Railway and localhost regardless
      if (origin.includes('railway.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    // Default: allow all (safe since auth is handled by JWT)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Ensure OPTIONS preflight is handled before any other middleware
app.options('*', cors());

// ─── Body Parsing ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

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
  max: 20,
  message: { error: 'Too many auth attempts. Please try after 15 minutes.' },
});

app.use('/api/', generalLimiter);
app.use('/api/v1/auth/', authLimiter);

// ─── Health Check ───────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
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
  customSiteTitle: 'SheBloom API Documentation',
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
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/achievements', achievementsRoutes);
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
