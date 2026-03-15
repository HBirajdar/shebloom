import prisma from '../config/database';
import { cacheDel } from '../config/redis';

export class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true, authProvider: true, createdAt: true, profile: true },
    });
  }
  async updateUser(userId: string, data: any) {
    const allowed: Record<string, any> = {};
    // email & phone are NOT here — they require OTP verification via dedicated endpoints
    const safe = ['fullName', 'avatarUrl', 'photoUrl', 'dateOfBirth', 'language', 'timezone'];
    for (const k of safe) { if (data[k] !== undefined) allowed[k] = data[k]; }
    if (allowed.dateOfBirth && typeof allowed.dateOfBirth === 'string') allowed.dateOfBirth = new Date(allowed.dateOfBirth);
    // Sync photoUrl → avatarUrl for backward compat
    if (allowed.photoUrl && !allowed.avatarUrl) allowed.avatarUrl = allowed.photoUrl;
    return prisma.user.update({ where: { id: userId }, data: allowed,
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true, authProvider: true },
    });
  }
  async updateProfile(userId: string, data: any) {
    // Allowlist to prevent mass assignment (e.g., doshaVerified, doshaVerifiedBy)
    const safeFields = [
      'cycleLength', 'periodLength', 'lastPeriodDate', 'primaryGoal', 'interests',
      'height', 'weight', 'bloodGroup', 'medicalConditions', 'allergies',
      'isPregnant', 'pregnancyWeek', 'contraceptiveMethod', 'doshaType',
      'skinType', 'hairType', 'dietPreference', 'activityLevel',
    ];
    const allowed: Record<string, any> = {};
    for (const k of safeFields) { if (data[k] !== undefined) allowed[k] = data[k]; }
    if (allowed.lastPeriodDate && typeof allowed.lastPeriodDate === 'string') allowed.lastPeriodDate = new Date(allowed.lastPeriodDate);
    const result = await prisma.userProfile.upsert({ where: { userId }, update: allowed, create: { userId, ...allowed } });
    await cacheDel(`predictions:${userId}`);
    await cacheDel(`fertility:${userId}`);
    await cacheDel(`ayurveda:${userId}`);
    return result;
  }
  async exportData(userId: string) {
    const [user, appointments, notifications, prescriptions, waterLogs, communityPosts, doshaAssessments] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { profile: true, cycles: true, moodLogs: true } }),
      prisma.appointment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.prescription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.waterLog.findMany({ where: { userId }, orderBy: { logDate: 'desc' }, take: 365 }),
      prisma.communityPost.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.doshaAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { ...user, appointments, notifications, prescriptions, waterLogs, communityPosts, doshaAssessments };
  }
  async deleteAccount(userId: string) { await prisma.user.delete({ where: { id: userId } }); }
}
