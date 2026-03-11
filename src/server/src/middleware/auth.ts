import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[Auth] No Bearer token in Authorization header');
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const token = authHeader.slice(7);
    console.log('[Auth] Token received:', token ? token.substring(0, 20) + '...' : 'NONE');

    const isBlacklisted = await cacheGet(`blacklist:${token}`);
    if (isBlacklisted) { res.status(401).json({ success: false, error: 'Token revoked' }); return; }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; id: string; role: string };
    console.log('[Auth] Decoded payload:', JSON.stringify(decoded));

    const uid = decoded.userId || decoded.id;
    let user = await cacheGet<any>(`user:${uid}:basic`);
    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, role: true, email: true, isActive: true },
      });
      if (!dbUser) {
        console.log('[Auth] User not found for id:', uid);
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }
      user = dbUser;
      await cacheSet(`user:${uid}:basic`, user, 300);
    }
    console.log('[Auth] User found:', user?.email || 'NOT FOUND');
    if (!user.isActive) { res.status(403).json({ success: false, error: 'Account deactivated' }); return; }
    req.user = { id: user.id, role: user.role, email: user.email || undefined };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) { res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' }); return; }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('[Auth] Invalid token error:', (error as Error).message);
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    logger.error('Auth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

export const authorize = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ success: false, error: 'Insufficient permissions' }); return; }
  next();
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) {
      const d = jwt.verify(h.slice(7), process.env.JWT_SECRET!) as { userId: string; id: string; role: string };
      req.user = { id: d.userId || d.id, role: d.role };
    }
  } catch {}
  next();
};
