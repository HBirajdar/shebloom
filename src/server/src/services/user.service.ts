import prisma from '../config/database';

export class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true, createdAt: true, profile: true },
    });
  }
  async updateUser(userId: string, data: any) {
    // Whitelist allowed fields to prevent mass assignment (e.g. role escalation)
    const allowed: Record<string, any> = {};
    const safe = ['fullName', 'avatarUrl', 'dateOfBirth', 'language', 'timezone'];
    for (const k of safe) { if (data[k] !== undefined) allowed[k] = data[k]; }
    return prisma.user.update({ where: { id: userId }, data: allowed });
  }
  async updateProfile(userId: string, data: any) {
    return prisma.userProfile.update({ where: { userId }, data });
  }
  async exportData(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, include: { profile: true, cycles: true, moodLogs: true } });
  }
  async deleteAccount(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
  }
}
