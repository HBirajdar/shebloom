import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly code?: string;
  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const logData = { message: err.message, path: req.path, method: req.method, ip: req.ip };

  if (err instanceof AppError) {
    logger.warn({ ...logData, statusCode: err.statusCode });
    res.status(err.statusCode).json({ success: false, error: err.message, ...(err.code && { code: err.code }) });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: 'Validation failed', details: err.flatten().fieldErrors });
    return;
  }
  // Duck-type check for PrismaClientKnownRequestError (avoids import issues across Prisma versions)
  const anyErr = err as any;
  if (anyErr.code && typeof anyErr.code === 'string' && anyErr.code.match(/^P\d{4}$/)) {
    const map: Record<string, [number, string]> = {
      P2002: [409, 'Record already exists'], P2025: [404, 'Record not found'], P2003: [400, 'Related record not found'],
    };
    const [status, msg] = map[anyErr.code] || [400, 'Database error'];
    res.status(status).json({ success: false, error: msg });
    return;
  }
  logger.error({ ...logData, stack: err.stack });
  res.status(500).json({ success: false, error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
