// ══════════════════════════════════════════════════════════════════
// Dosha Assessment Service — Expanded Prakriti Determination
// ══════════════════════════════════════════════════════════════════
//
// RESEARCH BASIS:
// - Charaka Samhita (Vimanasthana Ch.8) — Prakriti classification
// - Sushruta Samhita (Sharirasthana Ch.4) — Body constitution markers
// - Priyanka et al. (2020) J Ayurveda Integr Med — Prakriti & menstrual correlation
// - Rotti et al. (2014) — Prakriti phenotyping: validated 32-question instrument
// ══════════════════════════════════════════════════════════════════

import prisma from '../config/database';
import { DoshaType, AssessmentType } from '@prisma/client';

// ─── Dosha scoring result ────────────────────────────────────────
interface DoshaResult {
  primaryDosha: DoshaType;
  secondaryDosha: DoshaType | null;
  vataScore: number;
  pittaScore: number;
  kaphaScore: number;
  confidence: number;
}

// ─── Calculate dosha from answers ────────────────────────────────
function calculateDoshaFromAnswers(
  answers: { questionId: string; selectedOptionIndex: number; vataScore: number; pittaScore: number; kaphaScore: number; weight: number }[],
): DoshaResult {
  let totalVata = 0, totalPitta = 0, totalKapha = 0, totalWeight = 0;

  for (const a of answers) {
    const w = a.weight || 1;
    totalVata += a.vataScore * w;
    totalPitta += a.pittaScore * w;
    totalKapha += a.kaphaScore * w;
    totalWeight += w;
  }

  // Normalize to percentages
  const sum = totalVata + totalPitta + totalKapha;
  const vataScore = sum > 0 ? Math.round((totalVata / sum) * 100) : 33;
  const pittaScore = sum > 0 ? Math.round((totalPitta / sum) * 100) : 33;
  const kaphaScore = sum > 0 ? Math.round((totalKapha / sum) * 100) : 34;

  // Determine primary and secondary dosha
  const scores = [
    { type: 'VATA' as const, score: vataScore },
    { type: 'PITTA' as const, score: pittaScore },
    { type: 'KAPHA' as const, score: kaphaScore },
  ].sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];
  const diff = top.score - second.score;

  let primaryDosha: DoshaType;
  let secondaryDosha: DoshaType | null = null;

  // If all three within 10% — Tridoshic
  if (scores[0].score - scores[2].score <= 10) {
    primaryDosha = DoshaType.TRIDOSHIC;
  }
  // If top two within 10% — dual dosha
  else if (diff <= 10) {
    const pair = [top.type, second.type].sort().join('_');
    primaryDosha = pair as DoshaType;
    secondaryDosha = null; // dual dosha is the primary
  }
  // Clear dominant dosha
  else {
    primaryDosha = top.type as DoshaType;
    secondaryDosha = second.type as DoshaType;
  }

  // Confidence: based on number of questions and score separation
  const questionCount = answers.length;
  let confidence = Math.min(100, 20 + questionCount * 3 + diff * 0.5);
  confidence = Math.round(Math.min(100, confidence));

  return { primaryDosha, secondaryDosha, vataScore, pittaScore, kaphaScore, confidence };
}

// ─── Map DoshaType enum to display string ────────────────────────
function doshaTypeToString(dt: DoshaType): string {
  const map: Record<DoshaType, string> = {
    VATA: 'Vata',
    PITTA: 'Pitta',
    KAPHA: 'Kapha',
    VATA_PITTA: 'Vata-Pitta',
    PITTA_KAPHA: 'Pitta-Kapha',
    VATA_KAPHA: 'Vata-Kapha',
    TRIDOSHIC: 'Tridoshic',
  };
  return map[dt] || 'Vata';
}

class DoshaService {
  // ─── Get all active quiz questions ─────────────────────────────
  async getQuestions() {
    return prisma.doshaQuestion.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ─── Submit self-assessment ────────────────────────────────────
  async submitAssessment(
    userId: string,
    answers: { questionId: string; selectedOptionIndex: number }[],
    assessmentType: AssessmentType = 'SELF_FULL',
  ) {
    // Get questions to compute scores
    const questionIds = answers.map(a => a.questionId);
    const questions = await prisma.doshaQuestion.findMany({
      where: { id: { in: questionIds } },
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Build scored answers
    const scoredAnswers = answers.map(a => {
      const q = questionMap.get(a.questionId);
      if (!q) return { ...a, vataScore: 0, pittaScore: 0, kaphaScore: 0, weight: 1 };
      const opts = q.options as any[];
      const selected = opts[a.selectedOptionIndex] || opts[0];
      return {
        questionId: a.questionId,
        selectedOptionIndex: a.selectedOptionIndex,
        vataScore: selected.vataScore || 0,
        pittaScore: selected.pittaScore || 0,
        kaphaScore: selected.kaphaScore || 0,
        weight: q.weight,
      };
    });

    const result = calculateDoshaFromAnswers(scoredAnswers);

    // Get or create profile
    let profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.userProfile.create({ data: { userId } });
    }

    // Wrap all dosha DB writes in a transaction for consistency
    const doshaString = doshaTypeToString(result.primaryDosha);
    const { assessment } = await prisma.$transaction(async (tx) => {
      // Deactivate previous assessments
      await tx.doshaAssessment.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Create new assessment
      const newAssessment = await tx.doshaAssessment.create({
        data: {
          userId,
          profileId: profile.id,
          assessmentType,
          answers: scoredAnswers,
          primaryDosha: result.primaryDosha,
          secondaryDosha: result.secondaryDosha,
          vataScore: result.vataScore,
          pittaScore: result.pittaScore,
          kaphaScore: result.kaphaScore,
          confidence: result.confidence,
          isActive: true,
        },
      });

      // Update profile with latest dosha
      await tx.userProfile.update({
        where: { id: profile.id },
        data: {
          dosha: doshaString,
          doshaType: result.primaryDosha,
          vataScore: result.vataScore,
          pittaScore: result.pittaScore,
          kaphaScore: result.kaphaScore,
          doshaConfidence: result.confidence,
        },
      });

      return { assessment: newAssessment };
    });

    return {
      assessment,
      result: {
        primaryDosha: doshaString,
        primaryDoshaType: result.primaryDosha,
        secondaryDosha: result.secondaryDosha ? doshaTypeToString(result.secondaryDosha) : null,
        vataScore: result.vataScore,
        pittaScore: result.pittaScore,
        kaphaScore: result.kaphaScore,
        confidence: result.confidence,
      },
    };
  }

  // ─── Doctor clinical assessment ────────────────────────────────
  async doctorAssessment(
    doctorUserId: string,
    patientUserId: string,
    data: {
      primaryDosha: DoshaType;
      secondaryDosha?: DoshaType;
      vataScore: number;
      pittaScore: number;
      kaphaScore: number;
      notes?: string;
    },
  ) {
    // Verify doctor has had appointment with this patient
    const doctor = await prisma.doctor.findFirst({ where: { userId: doctorUserId } });
    if (!doctor) throw new Error('Doctor profile not found');

    const hasAppointment = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, userId: patientUserId },
    });
    if (!hasAppointment) throw new Error('No appointment history with this patient');

    let profile = await prisma.userProfile.findUnique({ where: { userId: patientUserId } });
    if (!profile) {
      profile = await prisma.userProfile.create({ data: { userId: patientUserId } });
    }

    // Deactivate previous assessments
    await prisma.doshaAssessment.updateMany({
      where: { userId: patientUserId, isActive: true },
      data: { isActive: false },
    });

    const doctorUser = await prisma.user.findUnique({ where: { id: doctorUserId }, select: { fullName: true } });

    // Doctor assessments get high confidence (85+)
    const assessment = await prisma.doshaAssessment.create({
      data: {
        userId: patientUserId,
        profileId: profile.id,
        assessmentType: 'DOCTOR_CLINICAL',
        answers: {}, // Doctor doesn't use question-based answers
        primaryDosha: data.primaryDosha,
        secondaryDosha: data.secondaryDosha || null,
        vataScore: data.vataScore,
        pittaScore: data.pittaScore,
        kaphaScore: data.kaphaScore,
        confidence: 85,
        isActive: true,
        assessedBy: doctorUserId,
        assessedByName: doctorUser?.fullName || 'Doctor',
        verificationNotes: data.notes,
      },
    });

    // Update profile
    const doshaString = doshaTypeToString(data.primaryDosha);
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        dosha: doshaString,
        doshaType: data.primaryDosha,
        vataScore: data.vataScore,
        pittaScore: data.pittaScore,
        kaphaScore: data.kaphaScore,
        doshaConfidence: 85,
        doshaVerified: true,
        doshaVerifiedBy: doctorUserId,
        doshaVerifiedAt: new Date(),
      },
    });

    return assessment;
  }

  // ─── Admin verify/override dosha ───────────────────────────────
  async adminVerifyDosha(
    adminUserId: string,
    targetUserId: string,
    data: {
      primaryDosha: DoshaType;
      secondaryDosha?: DoshaType;
      vataScore: number;
      pittaScore: number;
      kaphaScore: number;
      notes?: string;
    },
  ) {
    let profile = await prisma.userProfile.findUnique({ where: { userId: targetUserId } });
    if (!profile) {
      profile = await prisma.userProfile.create({ data: { userId: targetUserId } });
    }

    // Deactivate previous
    await prisma.doshaAssessment.updateMany({
      where: { userId: targetUserId, isActive: true },
      data: { isActive: false },
    });

    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId }, select: { fullName: true } });

    const assessment = await prisma.doshaAssessment.create({
      data: {
        userId: targetUserId,
        profileId: profile.id,
        assessmentType: 'ADMIN_OVERRIDE',
        answers: {},
        primaryDosha: data.primaryDosha,
        secondaryDosha: data.secondaryDosha || null,
        vataScore: data.vataScore,
        pittaScore: data.pittaScore,
        kaphaScore: data.kaphaScore,
        confidence: 90,
        isActive: true,
        assessedBy: adminUserId,
        assessedByName: adminUser?.fullName || 'Admin',
        verificationNotes: data.notes,
      },
    });

    const doshaString = doshaTypeToString(data.primaryDosha);
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        dosha: doshaString,
        doshaType: data.primaryDosha,
        vataScore: data.vataScore,
        pittaScore: data.pittaScore,
        kaphaScore: data.kaphaScore,
        doshaConfidence: 90,
        doshaVerified: true,
        doshaVerifiedBy: adminUserId,
        doshaVerifiedAt: new Date(),
      },
    });

    return assessment;
  }

  // ─── Get user's dosha profile ──────────────────────────────────
  async getDoshaProfile(userId: string) {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const activeAssessment = await prisma.doshaAssessment.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      dosha: profile?.dosha || null,
      doshaType: profile?.doshaType || null,
      vataScore: profile?.vataScore || null,
      pittaScore: profile?.pittaScore || null,
      kaphaScore: profile?.kaphaScore || null,
      confidence: profile?.doshaConfidence || null,
      verified: profile?.doshaVerified || false,
      verifiedBy: profile?.doshaVerifiedBy || null,
      verifiedAt: profile?.doshaVerifiedAt || null,
      activeAssessment: activeAssessment ? {
        id: activeAssessment.id,
        type: activeAssessment.assessmentType,
        assessedBy: activeAssessment.assessedByName,
        date: activeAssessment.createdAt,
        notes: activeAssessment.verificationNotes,
      } : null,
    };
  }

  // ─── Get assessment history for a user ─────────────────────────
  async getAssessmentHistory(userId: string) {
    return prisma.doshaAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Migrate localStorage dosha to DB assessment ───────────────
  async migrateLocalDosha(userId: string, doshaString: string) {
    const existing = await prisma.doshaAssessment.findFirst({
      where: { userId },
    });
    if (existing) return null; // Already has assessment

    const doshaMap: Record<string, DoshaType> = {
      Vata: DoshaType.VATA,
      Pitta: DoshaType.PITTA,
      Kapha: DoshaType.KAPHA,
    };

    const doshaType = doshaMap[doshaString] || DoshaType.VATA;

    let profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.userProfile.create({ data: { userId } });
    }

    const defaultScores: Record<DoshaType, [number, number, number]> = {
      VATA: [60, 25, 15],
      PITTA: [20, 60, 20],
      KAPHA: [15, 25, 60],
      VATA_PITTA: [40, 40, 20],
      PITTA_KAPHA: [20, 40, 40],
      VATA_KAPHA: [40, 20, 40],
      TRIDOSHIC: [33, 34, 33],
    };

    const [v, p, k] = defaultScores[doshaType] || [33, 34, 33];

    const assessment = await prisma.doshaAssessment.create({
      data: {
        userId,
        profileId: profile.id,
        assessmentType: 'SELF_QUICK',
        answers: { migrated: true, originalDosha: doshaString },
        primaryDosha: doshaType,
        vataScore: v,
        pittaScore: p,
        kaphaScore: k,
        confidence: 30, // Low confidence — from 3-question quiz
        isActive: true,
      },
    });

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        doshaType,
        vataScore: v,
        pittaScore: p,
        kaphaScore: k,
        doshaConfidence: 30,
      },
    });

    return assessment;
  }

  // ─── Admin: get all dosha profiles (paginated) ─────────────────
  async getAllDoshaProfiles(page = 1, limit = 20, filters?: { dosha?: string; verified?: boolean }) {
    const where: any = {};
    if (filters?.dosha) where.doshaType = filters.dosha;
    if (filters?.verified !== undefined) where.doshaVerified = filters.verified;

    const [profiles, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
          doshaAssessments: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.userProfile.count({ where }),
    ]);

    return { profiles, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Admin: dosha analytics ────────────────────────────────────
  async getDoshaAnalytics() {
    const [
      totalUsers,
      assessedUsers,
      verifiedUsers,
      doshaDistribution,
      assessmentTypeDistribution,
    ] = await Promise.all([
      prisma.userProfile.count(),
      prisma.userProfile.count({ where: { doshaType: { not: null } } }),
      prisma.userProfile.count({ where: { doshaVerified: true } }),
      prisma.userProfile.groupBy({
        by: ['doshaType'],
        _count: true,
        where: { doshaType: { not: null } },
      }),
      prisma.doshaAssessment.groupBy({
        by: ['assessmentType'],
        _count: true,
        where: { isActive: true },
      }),
    ]);

    return {
      totalUsers,
      assessedUsers,
      verifiedUsers,
      unassessedUsers: totalUsers - assessedUsers,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      doshaDistribution: doshaDistribution.map(d => ({
        dosha: d.doshaType,
        count: d._count,
        percentage: assessedUsers > 0 ? Math.round((d._count / assessedUsers) * 100) : 0,
      })),
      assessmentTypeDistribution: assessmentTypeDistribution.map(a => ({
        type: a.assessmentType,
        count: a._count,
      })),
    };
  }

  // ─── CRUD for dosha questions (admin) ──────────────────────────
  async createQuestion(data: {
    questionText: string;
    questionCategory: string;
    options: { label: string; vataScore: number; pittaScore: number; kaphaScore: number }[];
    weight?: number;
    orderIndex?: number;
  }) {
    return prisma.doshaQuestion.create({
      data: {
        questionText: data.questionText,
        questionCategory: data.questionCategory,
        options: data.options,
        weight: data.weight || 1.0,
        orderIndex: data.orderIndex || 0,
      },
    });
  }

  async updateQuestion(id: string, data: Partial<{
    questionText: string;
    questionCategory: string;
    options: any;
    weight: number;
    orderIndex: number;
    isActive: boolean;
  }>) {
    return prisma.doshaQuestion.update({ where: { id }, data });
  }

  async deleteQuestion(id: string) {
    return prisma.doshaQuestion.delete({ where: { id } });
  }
}

export const doshaService = new DoshaService();
export default doshaService;
