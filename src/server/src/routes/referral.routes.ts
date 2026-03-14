// ══════════════════════════════════════════════════════
// Referral & Gamification Routes — Referral System + Badge System
// ══════════════════════════════════════════════════════
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';
import crypto from 'crypto';

const r = Router();

// ═══════════════════════════════════════════════════════
// Helper: Generate random 8-char alphanumeric code
// ═══════════════════════════════════════════════════════
function generateReferralCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
}

// ═══════════════════════════════════════════════════════
// REFERRAL: Get or create user's referral code
// ═══════════════════════════════════════════════════════

// GET /my-code — Get or create user's referral code
r.get('/my-code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check if user already has a referral code (a referral row where they are the referrer with no referred person yet — their "master" code)
    let existing = await prisma.referral.findFirst({
      where: { referrerId: userId, referredEmail: null, referredPhone: null, referredId: null },
      select: { referralCode: true },
    });

    if (existing) {
      return successResponse(res, { referralCode: existing.referralCode });
    }

    // Also check if they have ANY referral as referrer — reuse that code
    const anyExisting = await prisma.referral.findFirst({
      where: { referrerId: userId },
      select: { referralCode: true },
    });

    if (anyExisting) {
      return successResponse(res, { referralCode: anyExisting.referralCode });
    }

    // Generate a new unique code
    let code = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.referral.findUnique({ where: { referralCode: code } });
      if (!exists) break;
      code = generateReferralCode();
      attempts++;
    }

    // Create a "template" referral row for this user's code
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: code,
        status: 'pending',
      },
    });

    return successResponse(res, { referralCode: referral.referralCode });
  } catch (err: any) {
    console.error('[Referral] my-code error:', err.message);
    return errorResponse(res, 'Failed to get referral code', 500);
  }
});

// ═══════════════════════════════════════════════════════
// REFERRAL: List user's referrals
// ═══════════════════════════════════════════════════════

// GET /my-referrals — List user's referrals with status
r.get('/my-referrals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referralCode: true,
        referredEmail: true,
        referredPhone: true,
        status: true,
        rewardType: true,
        rewardApplied: true,
        createdAt: true,
        convertedAt: true,
        referred: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'pending').length,
      signedUp: referrals.filter(r => r.status === 'signed_up').length,
      converted: referrals.filter(r => r.status === 'converted').length,
      rewarded: referrals.filter(r => r.status === 'rewarded').length,
    };

    return successResponse(res, { referrals, stats });
  } catch (err: any) {
    console.error('[Referral] my-referrals error:', err.message);
    return errorResponse(res, 'Failed to fetch referrals', 500);
  }
});

// ═══════════════════════════════════════════════════════
// REFERRAL: Send invite
// ═══════════════════════════════════════════════════════

// POST /invite — Send referral invite (store email/phone of invited person)
r.post('/invite', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return errorResponse(res, 'Email or phone is required', 400);
    }

    // Validate email format if provided
    if (email && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return errorResponse(res, 'Invalid email format', 400);
    }

    // Validate phone format if provided
    if (phone && (typeof phone !== 'string' || phone.length > 20 || !/^[+\d\s()-]{6,20}$/.test(phone))) {
      return errorResponse(res, 'Invalid phone format', 400);
    }

    // Get user's referral code (or create one)
    let existingRef = await prisma.referral.findFirst({
      where: { referrerId: userId },
      select: { referralCode: true },
    });

    let code: string;
    if (existingRef) {
      code = existingRef.referralCode;
    } else {
      code = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const exists = await prisma.referral.findUnique({ where: { referralCode: code } });
        if (!exists) break;
        code = generateReferralCode();
        attempts++;
      }
    }

    // Check if already invited this email/phone
    const alreadyInvited = await prisma.referral.findFirst({
      where: {
        referrerId: userId,
        ...(email ? { referredEmail: email } : { referredPhone: phone }),
      },
    });

    if (alreadyInvited) {
      return errorResponse(res, 'This person has already been invited', 400);
    }

    // Create a new referral invite entry
    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: code,
        referredEmail: email || null,
        referredPhone: phone || null,
        status: 'pending',
      },
    });

    return successResponse(res, {
      referral: {
        id: referral.id,
        referralCode: referral.referralCode,
        referredEmail: referral.referredEmail,
        referredPhone: referral.referredPhone,
        status: referral.status,
      },
    }, 'Invitation sent');
  } catch (err: any) {
    console.error('[Referral] invite error:', err.message);
    return errorResponse(res, 'Failed to send invite', 500);
  }
});

// ═══════════════════════════════════════════════════════
// REFERRAL: Apply referral code during signup
// ═══════════════════════════════════════════════════════

// POST /apply — Apply a referral code (link referredId, update status to 'signed_up')
r.post('/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length > 20) {
      return errorResponse(res, 'Referral code is required', 400);
    }

    const upperCode = code.trim().toUpperCase();

    // Use a serializable transaction to prevent race conditions (double-apply)
    const result = await prisma.$transaction(async (tx) => {
      // Check if user has already been referred (inside transaction)
      const alreadyReferred = await tx.referral.findFirst({
        where: { referredId: userId },
      });
      if (alreadyReferred) {
        return { error: 'You have already used a referral code' };
      }

      // Find a referral with this code — prefer the "template" row (no referredId yet)
      const referral = await tx.referral.findFirst({
        where: {
          referralCode: upperCode,
          status: 'pending',
          referredId: null,
        },
      });

      if (!referral) {
        return { error: 'Invalid or already used referral code' };
      }

      // Prevent self-referral
      if (referral.referrerId === userId) {
        return { error: 'Cannot use your own referral code' };
      }

      // Ensure user signed up within the last 7 days
      const user = await tx.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
      const daysSinceSignup = (Date.now() - user!.createdAt.getTime()) / 86400000;
      if (daysSinceSignup > 7) {
        return { success: false, error: 'Referral code can only be applied within 7 days of signup' };
      }

      // Update the referral atomically
      const updated = await tx.referral.update({
        where: { id: referral.id },
        data: {
          referredId: userId,
          status: 'signed_up',
        },
      });

      return { success: true, referralId: updated.id, status: updated.status };
    }, { isolationLevel: 'Serializable' });

    if ('error' in result) {
      return errorResponse(res, result.error as string, 400);
    }

    return successResponse(res, {
      referralId: result.referralId,
      status: result.status,
    }, 'Referral code applied successfully');
  } catch (err: any) {
    console.error('[Referral] apply error:', err.message);
    return errorResponse(res, 'Failed to apply referral code', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: List all referrals with pagination
// ═══════════════════════════════════════════════════════

// GET /admin/all — Admin: list all referrals with pagination
r.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query as any;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const take = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const skip = (pageNum - 1) * take;

    const validStatuses = ['pending', 'signed_up', 'converted', 'rewarded'];
    const where: any = {};
    if (status && validStatuses.includes(status)) where.status = status;

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { select: { id: true, fullName: true, email: true } },
          referred: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.referral.count({ where }),
    ]);

    return successResponse(res, {
      referrals,
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (err: any) {
    console.error('[Referral] admin/all error:', err.message);
    return errorResponse(res, 'Failed to fetch referrals', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Referral stats
// ═══════════════════════════════════════════════════════

// GET /admin/stats — Admin: referral stats (total, conversion rate, top referrers)
r.get('/admin/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [total, byStatus, topReferrers] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.referral.groupBy({
        by: ['referrerId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Build status map
    const statusMap: Record<string, number> = {};
    byStatus.forEach(s => { statusMap[s.status] = s._count.id; });

    const converted = (statusMap['converted'] || 0) + (statusMap['rewarded'] || 0);
    const signedUp = statusMap['signed_up'] || 0;
    const pending = statusMap['pending'] || 0;
    const conversionRate = total > 0 ? Math.round(((converted + signedUp) / total) * 1000) / 10 : 0;

    // Resolve top referrer details
    const referrerIds = topReferrers.map(r => r.referrerId);
    const referrerUsers = await prisma.user.findMany({
      where: { id: { in: referrerIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(referrerUsers.map(u => [u.id, u]));

    return successResponse(res, {
      total,
      statusBreakdown: statusMap,
      conversionRate,
      converted,
      signedUp,
      pending,
      topReferrers: topReferrers.map(r => ({
        user: userMap.get(r.referrerId) || { id: r.referrerId },
        count: r._count.id,
      })),
    });
  } catch (err: any) {
    console.error('[Referral] admin/stats error:', err.message);
    return errorResponse(res, 'Failed to fetch referral stats', 500);
  }
});

// ═══════════════════════════════════════════════════════
// BADGES: Available badge definitions
// ═══════════════════════════════════════════════════════

const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string }> = {
  first_cycle: { name: 'First Cycle', description: 'Logged your first cycle', icon: '🌙' },
  streak_7: { name: '7-Day Streak', description: '7 consecutive days of logging in', icon: '🔥' },
  streak_30: { name: '30-Day Streak', description: '30 consecutive days of logging in', icon: '💎' },
  community_contributor: { name: 'Community Contributor', description: 'Made 5+ community posts', icon: '💬' },
  wellness_warrior: { name: 'Wellness Warrior', description: 'Logged wellness activities 10+ times', icon: '🧘' },
  dosha_explorer: { name: 'Dosha Explorer', description: 'Completed a dosha assessment', icon: '🔮' },
  social_butterfly: { name: 'Social Butterfly', description: 'Referred 3+ friends', icon: '🦋' },
  early_adopter: { name: 'Early Adopter', description: 'Signed up in the first month', icon: '⭐' },
  mood_tracker: { name: 'Mood Tracker', description: 'Logged mood 30+ times', icon: '😊' },
  hydration_hero: { name: 'Hydration Hero', description: 'Logged water intake 20+ times', icon: '💧' },
};

// ═══════════════════════════════════════════════════════
// Helper: Check badge eligibility for a user
// ═══════════════════════════════════════════════════════

async function checkBadgeEligibility(userId: string): Promise<string[]> {
  const earned: string[] = [];

  // Parallel counts for efficiency
  const [
    cycleCount,
    communityPostCount,
    doshaCount,
    referralCount,
    moodLogCount,
    waterLogCount,
    user,
    wellnessEventCount,
    loginEvents,
  ] = await Promise.all([
    // first_cycle: Logged first cycle
    prisma.cycle.count({ where: { userId } }),
    // community_contributor: Made 5+ community posts
    prisma.communityPost.count({ where: { userId } }),
    // dosha_explorer: Completed dosha assessment
    prisma.doshaAssessment.count({ where: { userId } }),
    // social_butterfly: Referred 3+ friends (signed_up, converted, or rewarded)
    prisma.referral.count({
      where: {
        referrerId: userId,
        status: { in: ['signed_up', 'converted', 'rewarded'] },
      },
    }),
    // mood_tracker: Logged mood 30+ times
    prisma.moodLog.count({ where: { userId } }),
    // hydration_hero: Logged water 20+ times
    prisma.waterLog.count({ where: { userId } }),
    // early_adopter: Need user's createdAt
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    // wellness_warrior: Logged wellness 10+ times (tracked via UserEvent)
    prisma.userEvent.count({
      where: { userId, event: 'feature_used', category: 'wellness' },
    }),
    // streak: Get login events for streak calculation (limit to last 90 days)
    prisma.userEvent.findMany({
      where: {
        userId,
        event: { in: ['session_start', 'page_view'] },
        createdAt: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // first_cycle
  if (cycleCount >= 1) earned.push('first_cycle');

  // community_contributor
  if (communityPostCount >= 5) earned.push('community_contributor');

  // dosha_explorer
  if (doshaCount >= 1) earned.push('dosha_explorer');

  // social_butterfly
  if (referralCount >= 3) earned.push('social_butterfly');

  // mood_tracker
  if (moodLogCount >= 30) earned.push('mood_tracker');

  // hydration_hero
  if (waterLogCount >= 20) earned.push('hydration_hero');

  // wellness_warrior
  if (wellnessEventCount >= 10) earned.push('wellness_warrior');

  // early_adopter: Check if user signed up within first month of the platform
  if (user?.createdAt) {
    const earliestUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    if (earliestUser) {
      const cutoff = new Date(earliestUser.createdAt);
      cutoff.setDate(cutoff.getDate() + 30);
      if (user.createdAt <= cutoff) {
        earned.push('early_adopter');
      }
    }
  }

  // streak_7 and streak_30: Calculate from login events
  if (loginEvents.length > 0) {
    const uniqueDays = new Set<string>();
    for (const e of loginEvents) {
      uniqueDays.add(e.createdAt.toISOString().slice(0, 10));
    }
    const sortedDays = Array.from(uniqueDays).sort().reverse();

    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diffMs = prev.getTime() - curr.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 0.5 && diffDays < 1.5) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 1;
      }
    }

    if (maxStreak >= 7) earned.push('streak_7');
    if (maxStreak >= 30) earned.push('streak_30');
  }

  return earned;
}

// ═══════════════════════════════════════════════════════
// BADGES: Get user's earned badges
// ═══════════════════════════════════════════════════════

// GET /badges/my — Get user's earned badges
r.get('/badges/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const badges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    const enriched = badges.map(b => ({
      ...b,
      ...(BADGE_DEFINITIONS[b.badge] || { name: b.badge, description: '', icon: '' }),
    }));

    return successResponse(res, { badges: enriched });
  } catch (err: any) {
    console.error('[Badges] my error:', err.message);
    return errorResponse(res, 'Failed to fetch badges', 500);
  }
});

// ═══════════════════════════════════════════════════════
// BADGES: Get all available badges with earned status
// ═══════════════════════════════════════════════════════

// GET /badges/all — Get all available badges with earned status for current user
r.get('/badges/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const earnedBadges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badge: true, earnedAt: true },
    });

    const earnedMap = new Map(earnedBadges.map(b => [b.badge, b.earnedAt]));

    const allBadges = Object.entries(BADGE_DEFINITIONS).map(([key, def]) => ({
      key,
      ...def,
      earned: earnedMap.has(key),
      earnedAt: earnedMap.get(key) || null,
    }));

    return successResponse(res, {
      badges: allBadges,
      earnedCount: earnedBadges.length,
      totalCount: Object.keys(BADGE_DEFINITIONS).length,
    });
  } catch (err: any) {
    console.error('[Badges] all error:', err.message);
    return errorResponse(res, 'Failed to fetch badges', 500);
  }
});

// ═══════════════════════════════════════════════════════
// BADGES: Check and award new badges
// ═══════════════════════════════════════════════════════

// POST /badges/check — Check and award any new badges the user has earned
r.post('/badges/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get already earned badges
    const alreadyEarned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badge: true },
    });
    const earnedSet = new Set(alreadyEarned.map(b => b.badge));

    // Check eligibility
    const eligible = await checkBadgeEligibility(userId);

    // Find newly earned badges
    const newBadges = eligible.filter(b => !earnedSet.has(b));

    // Award new badges
    const awarded: Array<{ badge: string; name: string; description: string; icon: string }> = [];
    for (const badge of newBadges) {
      try {
        await prisma.userBadge.create({
          data: { userId, badge },
        });
        const def = BADGE_DEFINITIONS[badge];
        awarded.push({
          badge,
          name: def?.name || badge,
          description: def?.description || '',
          icon: def?.icon || '',
        });
      } catch (dupErr: any) {
        // Unique constraint violation — badge already exists, skip
        if (dupErr.code !== 'P2002') throw dupErr;
      }
    }

    return successResponse(res, {
      newBadges: awarded,
      totalEarned: earnedSet.size + awarded.length,
      totalAvailable: Object.keys(BADGE_DEFINITIONS).length,
    }, awarded.length > 0 ? `You earned ${awarded.length} new badge(s)!` : 'No new badges earned');
  } catch (err: any) {
    console.error('[Badges] check error:', err.message);
    return errorResponse(res, 'Failed to check badges', 500);
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN: Badge leaderboard
// ═══════════════════════════════════════════════════════

// GET /admin/badges — Admin: badge leaderboard
r.get('/admin/badges', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query as any;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const take = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const skip = (pageNum - 1) * take;

    // Get badge counts per user
    const leaderboard = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip,
      take,
    });

    const totalUsers = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: { id: true },
    });

    // Get user details
    const userIds = leaderboard.map(l => l.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // Get badge distribution
    const badgeDist = await prisma.userBadge.groupBy({
      by: ['badge'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Total badges awarded
    const totalBadges = await prisma.userBadge.count();

    return successResponse(res, {
      leaderboard: leaderboard.map(l => ({
        user: userMap.get(l.userId) || { id: l.userId },
        badgeCount: l._count.id,
      })),
      badgeDistribution: badgeDist.map(b => ({
        badge: b.badge,
        ...(BADGE_DEFINITIONS[b.badge] || { name: b.badge }),
        count: b._count.id,
      })),
      totalBadgesAwarded: totalBadges,
      totalUsersWithBadges: totalUsers.length,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(totalUsers.length / take),
    });
  } catch (err: any) {
    console.error('[Badges] admin error:', err.message);
    return errorResponse(res, 'Failed to fetch badge leaderboard', 500);
  }
});

export default r;
