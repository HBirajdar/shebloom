import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'DOCTOR')) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Super admin access required' });
    return;
  }
  next();
};
