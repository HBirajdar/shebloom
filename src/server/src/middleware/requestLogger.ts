import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const startTime = Date.now();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const data = { requestId, method: req.method, path: req.originalUrl, status: res.statusCode, duration: `${duration}ms`, ip: req.ip };
    if (res.statusCode >= 500) logger.error(data);
    else if (res.statusCode >= 400) logger.warn(data);
    else logger.info(data);
  });
  next();
};
