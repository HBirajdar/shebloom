import prisma from '../config/database';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { AppError } from '../middleware/errorHandler';

export class CycleService {
  async getCycles(userId: string, limit = 12) {
    const cacheKey = `cycles:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
    const cycles = await prisma.cycle.findMany({ where: { userId }, orderBy: { startDate: 'desc' }, take: limit });
    await cacheSet(cacheKey, cycles, 600);
    return cycles;
  }

  async logPeriod(userId: string, data: { startDate: string; endDate?: string; notes?: string }) {
    const cycle = await prisma.cycle.create({
      data: { userId, startDate: new Date(data.startDate), endDate: data.endDate ? new Date(data.endDate) : undefined, notes: data.notes },
    });
    await cacheDel(`cycles:${userId}`);
    return cycle;
  }

  async getPredictions(userId: string) {
    const cacheKey = `predictions:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const lastCycles = await prisma.cycle.findMany({ where: { userId }, orderBy: { startDate: 'desc' }, take: 6 });

    if (!lastCycles.length || !profile) return { message: 'Not enough data for prediction' };

    // Calculate average cycle length from history
    let avgCycleLength = profile.cycleLength || 28;
    if (lastCycles.length >= 2) {
      const lengths: number[] = [];
      for (let i = 0; i < lastCycles.length - 1; i++) {
        const diff = Math.floor((lastCycles[i].startDate.getTime() - lastCycles[i+1].startDate.getTime()) / 86400000);
        if (diff > 15 && diff < 50) lengths.push(diff);
      }
      if (lengths.length) avgCycleLength = Math.round(lengths.reduce((a,b) => a+b, 0) / lengths.length);
    }

    const periodLength = profile.periodLength || 5;
    const lastStart = lastCycles[0].startDate;
    const cycleDay = Math.floor((Date.now() - lastStart.getTime()) / 86400000) + 1;
    const nextPeriod = new Date(lastStart.getTime() + avgCycleLength * 86400000);
    const ovulationDay = avgCycleLength - 14;
    const ovulationDate = new Date(lastStart.getTime() + ovulationDay * 86400000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 86400000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 86400000);

    let phase = 'luteal';
    if (cycleDay <= periodLength) phase = 'menstrual';
    else if (cycleDay <= ovulationDay - 3) phase = 'follicular';
    else if (cycleDay <= ovulationDay + 2) phase = 'ovulation';

    const result = {
      cycleDay, phase, cycleLength: avgCycleLength, periodLength,
      nextPeriodDate: nextPeriod, ovulationDate, fertileStart, fertileEnd,
      daysUntilPeriod: Math.max(0, avgCycleLength - cycleDay),
      daysUntilOvulation: Math.max(0, ovulationDay - cycleDay),
      confidence: lastCycles.length >= 3 ? 'high' : lastCycles.length >= 2 ? 'medium' : 'low',
    };

    await cacheSet(cacheKey, result, 3600);
    return result;
  }

  async logSymptoms(userId: string, data: { symptoms: string[]; severity?: number; notes?: string }) {
    return prisma.symptomLog.create({ data: { userId, ...data } });
  }

  async logMood(userId: string, data: { mood: any; notes?: string }) {
    return prisma.moodLog.create({ data: { userId, mood: data.mood, notes: data.notes } });
  }

  async getMoodHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.moodLog.findMany({ where: { userId, logDate: { gte: since } }, orderBy: { logDate: 'desc' } });
  }

  async getSymptomHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return prisma.symptomLog.findMany({ where: { userId, logDate: { gte: since } }, orderBy: { logDate: 'desc' } });
  }
}
