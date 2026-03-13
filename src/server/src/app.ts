// ══════════════════════════════════════════════════════
// src/server/src/app.ts — Express Application Setup
// ══════════════════════════════════════════════════════

import express from 'express';
// compression removed — Railway CDN handles gzip; double-compression causes ERR_CONTENT_DECODING_FAILED
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
import prisma from './config/database';

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
import callbackRoutes from './routes/callback.routes';
import prescriptionRoutes from './routes/prescription.routes';
import paymentRoutes from './routes/payment.routes';
import doctorDashboardRoutes from './routes/doctor-dashboard.routes';
import doshaRoutes from './routes/dosha.routes';
import weatherRoutes from './routes/weather.routes';
import financeRoutes from './routes/finance.routes';
import programRoutes from './routes/program.routes';
import sellerRoutes from './routes/seller.routes';

// ─── Startup security checks ─────────────────────────
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32 || jwtSecret.includes('change-this')) {
    console.error('FATAL: JWT_SECRET is weak or default. Set a strong random secret in production.');
    process.exit(1);
  }
}

const app = express();

// ─── Canonical domain (www → non-www) ───────────────
// Prevents localStorage isolation between www.vedaclue.com and vedaclue.com
app.use((req, res, next) => {
  const host = req.hostname;
  if (host.startsWith('www.')) {
    return res.redirect(301, `${req.protocol}://${host.slice(4)}${req.originalUrl}`);
  }
  next();
});

// ─── Security ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ───────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://shebloom.vercel.app',
  'https://shebloom.netlify.app',
  'https://vedaclue.com',
  'https://www.vedaclue.com',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Railway deployment URL should be set via CLIENT_URL env var
    // Log but don't crash — return false instead of Error so the response
    // still reaches the browser (otherwise browser gets opaque network error)
    console.warn(`CORS: origin ${origin} not in allowed list`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Handle preflight explicitly
app.options('*', cors(corsOptions));

// ─── Body Parsing ───────────────────────────────────
// Raw body for Razorpay webhook — must be before express.json()
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ─── Static file serving for uploads ────────────────
const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Debug request logger (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Logging ────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
  app.use(requestLogger);
}

// ─── Rate Limiting ──────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // increased from 20 — allows normal testing without hitting limit
  message: { error: 'Too many auth attempts. Please try after 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
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

// ─── Versioned Health Check ─────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    message: 'VedaClue API running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── DB Test Route ───────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/v1/test-db', async (_req, res) => {
    try {
      const [products, doctors, articles, users] = await Promise.all([
        prisma.product.count(),
        prisma.doctor.count(),
        prisma.article.count(),
        prisma.user.count(),
      ]);
      res.json({ success: true, products, doctors, articles, users });
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });
}

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
app.use('/api/v1/callbacks', callbackRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/doctor', doctorDashboardRoutes);
app.use('/api/v1/dosha', doshaRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/programs', programRoutes);
app.use('/api/v1/sellers', sellerRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/debug', debugRoutes);
}

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

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') console.error('[Global Error]', err.message, err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File too large. Max 5MB for images.' });
  }
  return res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error') });
});

export default app;
