import prisma from '../config/database';

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
    return prisma.userProfile.upsert({ where: { userId }, update: allowed, create: { userId, ...allowed } });
  }
  async exportData(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, include: { profile: true, cycles: true, moodLogs: true } });
  }
  async deleteAccount(userId: string) { await prisma.user.delete({ where: { id: userId } }); }
}
