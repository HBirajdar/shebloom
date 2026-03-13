import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import subscriptionService from '../services/subscription.service';

/**
 * Middleware: require active subscription for premium features.
 * Usage: router.get('/premium-endpoint', authenticate, requireSubscription('cycle:bbt'), handler)
 * If no featureKey provided, just checks for any active subscription.
 */
export const requireSubscription = (featureKey?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Admins bypass subscription checks
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const hasAccess = featureKey
      ? await subscriptionService.hasFeatureAccess(req.user.id, featureKey)
      : await subscriptionService.hasActiveSubscription(req.user.id);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Premium subscription required',
        upgrade: true,
        feature: featureKey || 'premium',
      });
      return;
    }

    next();
  };
};
