import prisma from '../config/database';

export class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, dateOfBirth: true, role: true, language: true, createdAt: true, profile: true },
    });
  }
  async updateUser(userId: string, data: any) {
    return prisma.user.update({ where: { id: userId }, data });
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
