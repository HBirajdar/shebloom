import { Router, Response, NextFunction, Request } from 'express';
import prisma from '../config/database';
const r = Router();

r.get('/', async (_q: Request, s: Response, _n: NextFunction) => {
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
