// ═══ routes/user.routes.ts ═══
import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { UserService } from '../services/user.service';

const router = Router();
const svc = new UserService();
router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getProfile(req.user!.id) }); } catch (e) { next(e); }
});
router.put('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.updateUser(req.user!.id, req.body) }); } catch (e) { next(e); }
});
router.put('/me/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.updateProfile(req.user!.id, req.body) }); } catch (e) { next(e); }
});
router.get('/me/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.exportData(req.user!.id) }); } catch (e) { next(e); }
});
router.delete('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await svc.deleteAccount(req.user!.id); res.json({ success: true, message: 'Account deleted' }); } catch (e) { next(e); }
});
export default router;
