import prisma from '../config/database';

export class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true, createdAt: true, profile: true },
    });
  }
  async updateUser(userId: string, data: any) {
    const allowed: Record<string, any> = {};
    // FIXED: 'email' was missing from this list — that's why email never saved
    const safe = ['fullName', 'email', 'avatarUrl', 'dateOfBirth', 'language', 'timezone'];
    for (const k of safe) { if (data[k] !== undefined) allowed[k] = data[k]; }
    if (allowed.dateOfBirth && typeof allowed.dateOfBirth === 'string') {
      allowed.dateOfBirth = new Date(allowed.dateOfBirth);
    }
    return prisma.user.update({
      where: { id: userId }, data: allowed,
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true },
    });
  }
  async updateProfile(userId: string, data: any) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
  async exportData(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, include: { profile: true, cycles: true, moodLogs: true } });
  }
  async deleteAccount(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
  }
}
