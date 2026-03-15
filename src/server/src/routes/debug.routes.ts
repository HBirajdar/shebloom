import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
const r = Router();

// Health check — public (no auth), but only returns status, no counts
r.get('/health', async (_q: Request, s: Response, _n: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    s.json({ status: 'ok', db: 'connected', version: '2.2', timestamp: new Date().toISOString() });
  } catch {
    s.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Full debug info — admin only
r.get('/', authenticate, async (q: AuthRequest, s: Response, _n: NextFunction) => {
  if (q.user!.role !== 'ADMIN') { s.status(403).json({ error: 'Admin only' }); return; }
  try {
    const userCount = await prisma.user.count();
    const cycleCount = await prisma.cycle.count();
    const appointmentCount = await prisma.appointment.count();
    const doctorCount = await prisma.doctor.count();
    s.json({ status: 'ok', db: 'connected', counts: { users: userCount, cycles: cycleCount, appointments: appointmentCount, doctors: doctorCount }, version: '2.2', timestamp: new Date().toISOString() });
  } catch (e: any) {
    s.status(500).json({ status: 'error', db: 'disconnected', error: e.message });
  }
});

export default r;
