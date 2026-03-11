import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['ADMIN', 'admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'Super admin only' });
    return;
  }
  next();
};
