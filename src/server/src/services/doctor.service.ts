import prisma from '../config/database';

export class DoctorService {
  async search(params: any) {
    const { specialization, minRating, maxFee, search, page = 1, limit = 20 } = params;
    const where: any = { isAvailable: true, isVerified: true };
    if (specialization) where.specialization = { contains: specialization, mode: 'insensitive' };
    if (minRating) where.rating = { gte: parseFloat(minRating) };
    if (maxFee) where.consultationFee = { lte: parseFloat(maxFee) };
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { specialization: { contains: search, mode: 'insensitive' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({ where, skip, take: Number(limit), orderBy: { rating: 'desc' }, include: { hospital: { select: { name: true, city: true } } } }),
      prisma.doctor.count({ where }),
    ]);
    return { doctors, pagination: { page: Number(page), total, pages: Math.ceil(total / Number(limit)) } };
  }

  async getById(id: string) {
    return prisma.doctor.findUnique({
      where: { id },
      include: { hospital: true, reviews: { take: 10, orderBy: { createdAt: 'desc' } }, availableSlots: { where: { isActive: true } } },
    });
  }
}
