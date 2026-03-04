// ═══ services/hospital.service.ts ═══
import prisma from '../config/database';

export class HospitalService {
  async search(params: any) {
    const { city, category, minRating, search, page = 1, limit = 20 } = params;
    const where: any = { isActive: true };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (category) where.category = category;
    if (minRating) where.rating = { gte: parseFloat(minRating) };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const skip = (Number(page) - 1) * Number(limit);
    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({ where, skip, take: Number(limit), orderBy: { rating: 'desc' }, include: { prices: true, _count: { select: { doctors: true } } } }),
      prisma.hospital.count({ where }),
    ]);
    return { hospitals, pagination: { page: Number(page), total } };
  }
  async getById(id: string) {
    return prisma.hospital.findUnique({ where: { id }, include: { prices: true, doctors: { where: { isAvailable: true }, take: 10 } } });
  }
  async comparePrices(service: string, city: string) {
    return prisma.hospitalPrice.findMany({
      where: { serviceName: { contains: service, mode: 'insensitive' }, hospital: { city: { contains: city, mode: 'insensitive' } } },
      include: { hospital: { select: { name: true, city: true, rating: true } } }, orderBy: { minPrice: 'asc' },
    });
  }
}
