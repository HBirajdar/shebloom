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
    // FIX: Added 'email' to the whitelist so profile email updates actually persist
    const safe = ['fullName', 'email', 'avatarUrl', 'dateOfBirth', 'language', 'timezone'];
    for (const k of safe) { if (data[k] !== undefined) allowed[k] = data[k]; }
    // Handle dateOfBirth conversion
    if (allowed.dateOfBirth && typeof allowed.dateOfBirth === 'string') {
      allowed.dateOfBirth = new Date(allowed.dateOfBirth);
    }
    return prisma.user.update({
      where: { id: userId }, data: allowed,
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true },
    });
  }
  async updateProfile(userId: string, data: any) {
    // Upsert profile in case it doesn't exist yet
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
