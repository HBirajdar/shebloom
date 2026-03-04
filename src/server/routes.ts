// ══════════════════════════════════════════════════════
// ALL API ROUTES & CONTROLLERS
// ══════════════════════════════════════════════════════

// ── routes/cycle.routes.ts ───────────────────────────
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';

const cycleRouter = Router();
cycleRouter.use(authenticate);

// GET /cycles — Get user's cycle history
cycleRouter.get('/', async (req, res, next) => {
  try {
    const cycles = await prisma.cycle.findMany({
      where: { userId: req.user!.id },
      orderBy: { startDate: 'desc' },
      take: 12,
    });
    res.json({ success: true, data: cycles });
  } catch (e) { next(e); }
});

// POST /cycles/log — Log period start/end
cycleRouter.post('/log', async (req, res, next) => {
  try {
    const { startDate, endDate, notes } = req.body;
    const cycle = await prisma.cycle.create({
      data: { userId: req.user!.id, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, notes },
    });
    res.status(201).json({ success: true, data: cycle });
  } catch (e) { next(e); }
});

// GET /cycles/predict — Get cycle predictions
cycleRouter.get('/predict', async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
    const lastCycle = await prisma.cycle.findFirst({
      where: { userId: req.user!.id },
      orderBy: { startDate: 'desc' },
    });

    if (!lastCycle || !profile) {
      return res.json({ success: true, data: { message: 'Not enough data for prediction' } });
    }

    const cycleLength = profile.cycleLength || 28;
    const periodLength = profile.periodLength || 5;
    const lastStart = new Date(lastCycle.startDate);
    const nextPeriod = new Date(lastStart.getTime() + cycleLength * 86400000);
    const ovulationDate = new Date(nextPeriod.getTime() - 14 * 86400000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);
    const cycleDay = Math.floor((Date.now() - lastStart.getTime()) / 86400000) + 1;
    let phase = 'luteal';
    if (cycleDay <= periodLength) phase = 'menstrual';
    else if (cycleDay <= cycleLength - 14 - 3) phase = 'follicular';
    else if (cycleDay <= cycleLength - 14 + 2) phase = 'ovulation';

    res.json({
      success: true,
      data: {
        cycleDay, phase, cycleLength, periodLength,
        nextPeriodDate: nextPeriod, ovulationDate, fertileStart, fertileEnd,
        daysUntilPeriod: Math.max(0, cycleLength - cycleDay),
      },
    });
  } catch (e) { next(e); }
});

// POST /cycles/symptoms — Log symptoms
cycleRouter.post('/symptoms', async (req, res, next) => {
  try {
    const { symptoms, severity, notes } = req.body;
    const log = await prisma.symptomLog.create({
      data: { userId: req.user!.id, symptoms, severity, notes },
    });
    res.status(201).json({ success: true, data: log });
  } catch (e) { next(e); }
});

export { cycleRouter };


// ── routes/mood.routes.ts ────────────────────────────
const moodRouter = Router();
moodRouter.use(authenticate);

moodRouter.post('/', async (req, res, next) => {
  try {
    const { mood, notes } = req.body;
    const log = await prisma.moodLog.create({
      data: { userId: req.user!.id, mood, notes },
    });
    res.status(201).json({ success: true, data: log });
  } catch (e) { next(e); }
});

moodRouter.get('/history', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 86400000);
    const logs = await prisma.moodLog.findMany({
      where: { userId: req.user!.id, logDate: { gte: since } },
      orderBy: { logDate: 'desc' },
    });
    res.json({ success: true, data: logs });
  } catch (e) { next(e); }
});

export { moodRouter };


// ── routes/doctor.routes.ts ──────────────────────────
const doctorRouter = Router();

// Public: List/search doctors
doctorRouter.get('/', async (req, res, next) => {
  try {
    const { specialization, city, minRating, maxFee, page = '1', limit = '20', search } = req.query;
    const where: any = { isAvailable: true, isVerified: true };
    if (specialization) where.specialization = { contains: specialization as string, mode: 'insensitive' };
    if (minRating) where.rating = { gte: parseFloat(minRating as string) };
    if (maxFee) where.consultationFee = { lte: parseFloat(maxFee as string) };
    if (search) where.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { specialization: { contains: search as string, mode: 'insensitive' } },
    ];

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { rating: 'desc' },
        include: { hospital: { select: { name: true, city: true } } },
      }),
      prisma.doctor.count({ where }),
    ]);

    res.json({ success: true, data: doctors, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (e) { next(e); }
});

// GET doctor by ID
doctorRouter.get('/:id', async (req, res, next) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        hospital: true,
        reviews: { take: 10, orderBy: { createdAt: 'desc' } },
        availableSlots: { where: { isActive: true } },
        articles: { where: { status: 'PUBLISHED' }, take: 5 },
      },
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (e) { next(e); }
});

export { doctorRouter };


// ── routes/hospital.routes.ts ────────────────────────
const hospitalRouter = Router();

hospitalRouter.get('/', async (req, res, next) => {
  try {
    const { city, category, minRating, search, page = '1', limit = '20' } = req.query;
    const where: any = { isActive: true };
    if (city) where.city = { contains: city as string, mode: 'insensitive' };
    if (category) where.category = category;
    if (minRating) where.rating = { gte: parseFloat(minRating as string) };
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { rating: 'desc' },
        include: { prices: true, _count: { select: { doctors: true } } },
      }),
      prisma.hospital.count({ where }),
    ]);

    res.json({ success: true, data: hospitals, pagination: { page: parseInt(page as string), total } });
  } catch (e) { next(e); }
});

hospitalRouter.get('/:id', async (req, res, next) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: {
        prices: true,
        doctors: { where: { isAvailable: true }, take: 10 },
      },
    });
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (e) { next(e); }
});

// Compare hospital prices
hospitalRouter.get('/compare/prices', async (req, res, next) => {
  try {
    const { service, city } = req.query;
    const prices = await prisma.hospitalPrice.findMany({
      where: {
        serviceName: { contains: service as string, mode: 'insensitive' },
        hospital: { city: { contains: city as string, mode: 'insensitive' }, isActive: true },
      },
      include: { hospital: { select: { name: true, city: true, rating: true } } },
      orderBy: { minPrice: 'asc' },
    });
    res.json({ success: true, data: prices });
  } catch (e) { next(e); }
});

export { hospitalRouter };


// ── routes/article.routes.ts ─────────────────────────
const articleRouter = Router();

articleRouter.get('/', async (req, res, next) => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query;
    const where: any = { status: 'PUBLISHED' };
    if (category) where.category = category;
    if (search) where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { tags: { has: search as string } },
    ];

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { publishedAt: 'desc' },
        include: { doctor: { select: { fullName: true, specialization: true } } },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({ success: true, data: articles, pagination: { page: parseInt(page as string), total } });
  } catch (e) { next(e); }
});

// Personalized recommendations based on user profile
articleRouter.get('/recommended', authenticate, async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
    const interests = profile?.interests || [];

    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { tags: { hasSome: interests } },
          { isFeatured: true },
        ],
      },
      take: 10,
      orderBy: { publishedAt: 'desc' },
      include: { doctor: { select: { fullName: true } } },
    });

    res.json({ success: true, data: articles });
  } catch (e) { next(e); }
});

articleRouter.get('/:slug', async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: { doctor: { select: { fullName: true, specialization: true, avatarUrl: true } } },
    });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    // Increment view count
    await prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } });
    res.json({ success: true, data: article });
  } catch (e) { next(e); }
});

export { articleRouter };


// ── routes/appointment.routes.ts ─────────────────────
const appointmentRouter = Router();
appointmentRouter.use(authenticate);

appointmentRouter.post('/', async (req, res, next) => {
  try {
    const { doctorId, scheduledAt, type, notes } = req.body;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const appointment = await prisma.appointment.create({
      data: {
        userId: req.user!.id, doctorId, scheduledAt: new Date(scheduledAt),
        type: type || 'consultation', notes, amountPaid: doctor.consultationFee,
      },
      include: { doctor: { select: { fullName: true, specialization: true } } },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: 'Appointment Booked',
        body: `Your appointment with ${doctor.fullName} is confirmed.`,
        type: 'appointment',
        data: { appointmentId: appointment.id },
      },
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (e) { next(e); }
});

appointmentRouter.get('/', async (req, res, next) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user!.id },
      orderBy: { scheduledAt: 'desc' },
      include: { doctor: { select: { fullName: true, specialization: true, consultationFee: true } } },
    });
    res.json({ success: true, data: appointments });
  } catch (e) { next(e); }
});

appointmentRouter.patch('/:id/cancel', async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: { status: 'CANCELLED', cancellationReason: req.body.reason },
    });
    res.json({ success: true, data: appointment });
  } catch (e) { next(e); }
});

export { appointmentRouter };


// ── routes/wellness.routes.ts ────────────────────────
const wellnessRouter = Router();

wellnessRouter.get('/', async (req, res, next) => {
  try {
    const { category, difficulty, phase } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (phase) where.cyclePhases = { has: phase };

    const activities = await prisma.wellnessActivity.findMany({
      where,
      orderBy: { title: 'asc' },
    });
    res.json({ success: true, data: activities });
  } catch (e) { next(e); }
});

export { wellnessRouter };


// ── routes/pregnancy.routes.ts ───────────────────────
const pregnancyRouter = Router();
pregnancyRouter.use(authenticate);

pregnancyRouter.get('/current', async (req, res, next) => {
  try {
    const pregnancy = await prisma.pregnancy.findFirst({
      where: { userId: req.user!.id, isActive: true },
      include: { checklistItems: { orderBy: { week: 'asc' } } },
    });
    res.json({ success: true, data: pregnancy });
  } catch (e) { next(e); }
});

pregnancyRouter.post('/', async (req, res, next) => {
  try {
    const { dueDate, conceptionDate } = req.body;
    const pregnancy = await prisma.pregnancy.create({
      data: { userId: req.user!.id, dueDate: new Date(dueDate), conceptionDate: conceptionDate ? new Date(conceptionDate) : undefined },
    });
    await prisma.userProfile.update({ where: { userId: req.user!.id }, data: { isPregnant: true } });
    res.status(201).json({ success: true, data: pregnancy });
  } catch (e) { next(e); }
});

pregnancyRouter.patch('/checklist/:itemId', async (req, res, next) => {
  try {
    const item = await prisma.pregnancyChecklist.update({
      where: { id: req.params.itemId },
      data: { isCompleted: req.body.isCompleted, completedAt: req.body.isCompleted ? new Date() : null },
    });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});

export { pregnancyRouter };


// ── routes/user.routes.ts ────────────────────────────
const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, fullName: true, email: true, phone: true, avatarUrl: true,
        dateOfBirth: true, role: true, language: true, createdAt: true,
        profile: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

userRouter.put('/me', async (req, res, next) => {
  try {
    const { fullName, dateOfBirth, language, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { fullName, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, language, avatarUrl },
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, language: true },
    });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

userRouter.put('/me/profile', async (req, res, next) => {
  try {
    const { cycleLength, periodLength, lastPeriodDate, primaryGoal, interests, height, weight } = req.body;
    const profile = await prisma.userProfile.update({
      where: { userId: req.user!.id },
      data: {
        cycleLength, periodLength,
        lastPeriodDate: lastPeriodDate ? new Date(lastPeriodDate) : undefined,
        primaryGoal, interests, height, weight,
      },
    });
    res.json({ success: true, data: profile });
  } catch (e) { next(e); }
});

// GDPR/DPDPA: Data export
userRouter.get('/me/export', async (req, res, next) => {
  try {
    const data = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true, cycles: true, moodLogs: true, symptomLogs: true, pregnancies: true, appointments: true },
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GDPR/DPDPA: Account deletion
userRouter.delete('/me', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (e) { next(e); }
});

export { userRouter };


// ── routes/notification.routes.ts ────────────────────
const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (e) { next(e); }
});

notificationRouter.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

notificationRouter.post('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export { notificationRouter };
