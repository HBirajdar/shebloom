// ══════════════════════════════════════════════════════
// MIDDLEWARE — Authentication, Error Handling, Logging
// File: src/server/src/middleware/
// ══════════════════════════════════════════════════════

// ── middleware/auth.ts ───────────────────────────────
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, role: true, email: true, isActive: true } });

    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid or expired token' });

    req.user = { id: user.id, role: user.role, email: user.email || undefined };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ── middleware/errorHandler.ts ────────────────────────
import { logger } from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    path: _req.path,
    method: _req.method,
  });

  // Don't expose internal errors in production
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
};

// ── middleware/requestLogger.ts ──────────────────────
export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  req.headers['x-request-id'] = requestId;
  logger.info({ requestId, method: req.method, path: req.path, ip: req.ip });
  next();
};

// ── middleware/validate.ts ───────────────────────────
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    next();
  };
};
