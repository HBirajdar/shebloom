// ══════════════════════════════════════════════════════
// Email Campaign Routes — Drip/Automation + Manual Campaigns
// ══════════════════════════════════════════════════════
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles.middleware';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';
import sgMail from '@sendgrid/mail';

const API_KEY = process.env.SENDGRID_API_KEY || '';
if (API_KEY) sgMail.setApiKey(API_KEY);

const FROM = { email: 'noreply@vedaclue.com', name: 'VedaClue' };

const r = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_TRIGGERS = ['welcome', 'trial_expiring', 'inactive_7d', 'abandoned_checkout', 'manual'] as const;
const VALID_SEGMENTS = ['all', 'active', 'inactive', 'subscribers', 'free', 'trial'] as const;
const VALID_STATUSES = ['draft', 'active', 'paused', 'completed'] as const;

async function sendCampaignEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!API_KEY) {
    console.warn('[EmailCampaign] SENDGRID_API_KEY not set — skipping email to', to);
    return false;
  }
  try {
    await sgMail.send({ to, from: FROM, subject, html });
    console.log('[EmailCampaign] Sent:', subject, '->', to);
    return true;
  } catch (err: any) {
    console.error('[EmailCampaign] Failed:', err?.response?.body || err?.message || err);
    return false;
  }
}

/**
 * Resolve a segment string to a list of users with email addresses.
 */
async function getUsersBySegment(segment: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (segment) {
    case 'active': {
      // Users with at least one event in the last 30 days
      const events = await prisma.userEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const userIds = events.map(e => e.userId).filter(Boolean) as string[];
      if (userIds.length === 0) return [];
      return prisma.user.findMany({
        where: { id: { in: userIds }, email: { not: null }, isActive: true },
        select: { id: true, email: true, fullName: true },
      });
    }

    case 'inactive': {
      // Users with NO events in the last 30 days
      const activeEvents = await prisma.userEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const activeIds = activeEvents.map(e => e.userId).filter(Boolean) as string[];
      return prisma.user.findMany({
        where: {
          email: { not: null },
          isActive: true,
          ...(activeIds.length > 0 ? { id: { notIn: activeIds } } : {}),
        },
        select: { id: true, email: true, fullName: true },
      });
    }

    case 'subscribers': {
      // Users with an active subscription
      const subs = await prisma.userSubscription.findMany({
        where: { status: 'ACTIVE' },
        select: { userId: true },
        distinct: ['userId'],
      });
      const userIds = subs.map(s => s.userId);
      if (userIds.length === 0) return [];
      return prisma.user.findMany({
        where: { id: { in: userIds }, email: { not: null }, isActive: true },
        select: { id: true, email: true, fullName: true },
      });
    }

    case 'free': {
      // Users without any active subscription
      const subs = await prisma.userSubscription.findMany({
        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const subUserIds = subs.map(s => s.userId);
      return prisma.user.findMany({
        where: {
          email: { not: null },
          isActive: true,
          ...(subUserIds.length > 0 ? { id: { notIn: subUserIds } } : {}),
        },
        select: { id: true, email: true, fullName: true },
      });
    }

    case 'trial': {
      // Users on trial subscriptions
      const subs = await prisma.userSubscription.findMany({
        where: { status: 'TRIAL' },
        select: { userId: true },
        distinct: ['userId'],
      });
      const userIds = subs.map(s => s.userId);
      if (userIds.length === 0) return [];
      return prisma.user.findMany({
        where: { id: { in: userIds }, email: { not: null }, isActive: true },
        select: { id: true, email: true, fullName: true },
      });
    }

    case 'all':
    default:
      return prisma.user.findMany({
        where: { email: { not: null }, isActive: true },
        select: { id: true, email: true, fullName: true },
      });
  }
}

// ═══════════════════════════════════════════════════════
// 1. GET / — List all email campaigns with stats
// ═══════════════════════════════════════════════════════
r.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const withRates = campaigns.map(c => ({
      ...c,
      openRate: c.sentCount > 0 ? Math.round((c.openCount / c.sentCount) * 10000) / 100 : 0,
      clickRate: c.sentCount > 0 ? Math.round((c.clickCount / c.sentCount) * 10000) / 100 : 0,
    }));

    return successResponse(res, withRates);
  } catch (err: any) {
    console.error('[EmailCampaign] List error:', err.message);
    return errorResponse(res, 'Failed to list campaigns', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 8. GET /stats — Overall email campaign stats
// ═══════════════════════════════════════════════════════
r.get('/stats', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const agg = await prisma.emailCampaign.aggregate({
      _sum: { sentCount: true, openCount: true, clickCount: true },
      _count: { id: true },
    });

    const totalSent = agg._sum.sentCount || 0;
    const totalOpens = agg._sum.openCount || 0;
    const totalClicks = agg._sum.clickCount || 0;

    const byStatus = await prisma.emailCampaign.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    byStatus.forEach(s => { statusCounts[s.status] = s._count.id; });

    return successResponse(res, {
      totalCampaigns: agg._count.id,
      totalSent,
      totalOpens,
      totalClicks,
      openRate: totalSent > 0 ? Math.round((totalOpens / totalSent) * 10000) / 100 : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicks / totalSent) * 10000) / 100 : 0,
      byStatus: statusCounts,
    });
  } catch (err: any) {
    console.error('[EmailCampaign] Stats error:', err.message);
    return errorResponse(res, 'Failed to fetch stats', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 2. POST / — Create new email campaign
// ═══════════════════════════════════════════════════════
r.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject, body, trigger, segment } = req.body;

    if (!name || !subject || !body || !trigger) {
      return errorResponse(res, 'name, subject, body, and trigger are required', 400);
    }
    if (!VALID_TRIGGERS.includes(trigger)) {
      return errorResponse(res, `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`, 400);
    }
    if (segment && !VALID_SEGMENTS.includes(segment)) {
      return errorResponse(res, `Invalid segment. Must be one of: ${VALID_SEGMENTS.join(', ')}`, 400);
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        body,
        trigger,
        segment: segment || 'all',
      },
    });

    res.status(201);
    return successResponse(res, campaign);
  } catch (err: any) {
    console.error('[EmailCampaign] Create error:', err.message);
    return errorResponse(res, 'Failed to create campaign', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 3. PUT /:id — Update campaign
// ═══════════════════════════════════════════════════════
r.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, body, trigger, segment, status } = req.body;

    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Campaign not found', 404);

    if (trigger && !VALID_TRIGGERS.includes(trigger)) {
      return errorResponse(res, `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`, 400);
    }
    if (segment && !VALID_SEGMENTS.includes(segment)) {
      return errorResponse(res, `Invalid segment. Must be one of: ${VALID_SEGMENTS.join(', ')}`, 400);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(body && { body }),
        ...(trigger && { trigger }),
        ...(segment && { segment }),
        ...(status && { status }),
      },
    });

    return successResponse(res, campaign);
  } catch (err: any) {
    console.error('[EmailCampaign] Update error:', err.message);
    return errorResponse(res, 'Failed to update campaign', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 4. DELETE /:id — Delete campaign
// ═══════════════════════════════════════════════════════
r.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) return errorResponse(res, 'Campaign not found', 404);

    await prisma.emailCampaign.delete({ where: { id } });

    return successResponse(res, { message: 'Campaign deleted' });
  } catch (err: any) {
    console.error('[EmailCampaign] Delete error:', err.message);
    return errorResponse(res, 'Failed to delete campaign', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 5. POST /:id/toggle — Toggle status (draft<->active, active<->paused)
// ═══════════════════════════════════════════════════════
r.post('/:id/toggle', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return errorResponse(res, 'Campaign not found', 404);

    let newStatus: string;
    switch (campaign.status) {
      case 'draft':
        newStatus = 'active';
        break;
      case 'active':
        newStatus = 'paused';
        break;
      case 'paused':
        newStatus = 'active';
        break;
      case 'completed':
        return errorResponse(res, 'Cannot toggle a completed campaign', 400);
      default:
        return errorResponse(res, 'Unknown campaign status', 400);
    }

    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: { status: newStatus },
    });

    return successResponse(res, updated);
  } catch (err: any) {
    console.error('[EmailCampaign] Toggle error:', err.message);
    return errorResponse(res, 'Failed to toggle campaign status', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 6. POST /:id/send-test — Send test email to admin's own email
// ═══════════════════════════════════════════════════════
r.post('/:id/send-test', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return errorResponse(res, 'Campaign not found', 404);

    const adminEmail = req.user?.email;
    if (!adminEmail) return errorResponse(res, 'Admin email not found on account', 400);

    const sent = await sendCampaignEmail(
      adminEmail,
      `[TEST] ${campaign.subject}`,
      campaign.body,
    );

    if (!sent) return errorResponse(res, 'Failed to send test email — check SendGrid config', 500);

    return successResponse(res, { message: `Test email sent to ${adminEmail}` });
  } catch (err: any) {
    console.error('[EmailCampaign] Send-test error:', err.message);
    return errorResponse(res, 'Failed to send test email', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 7. POST /:id/send — Trigger manual send to matching segment
// ═══════════════════════════════════════════════════════
r.post('/:id/send', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) return errorResponse(res, 'Campaign not found', 404);

    // Atomic conditional update to prevent double-send race condition
    // Only transition if status is NOT already 'sending' or 'completed'
    const guard = await prisma.emailCampaign.updateMany({
      where: { id, status: { notIn: ['completed', 'sending'] as any[] } },
      data: { status: 'sending' as any },
    });
    if (guard.count === 0) {
      return errorResponse(res, 'Campaign is already sending or completed', 400);
    }

    const users = await getUsersBySegment(campaign.segment);
    if (users.length === 0) {
      // Restore status since we didn't actually send
      await prisma.emailCampaign.update({ where: { id }, data: { status: campaign.status } });
      return successResponse(res, { message: 'No users found for this segment', sentCount: 0 });
    }

    let sentCount = 0;
    try {
      for (const user of users) {
        if (!user.email) continue;
        const sent = await sendCampaignEmail(user.email, campaign.subject, campaign.body);
        if (sent) sentCount++;
      }

      await prisma.emailCampaign.update({
        where: { id },
        data: {
          sentCount: { increment: sentCount },
          lastSentAt: new Date(),
          status: campaign.trigger === 'manual' ? 'completed' : 'active',
        },
      });
    } catch (sendErr) {
      // Restore status on failure so campaign can be retried
      await prisma.emailCampaign.update({
        where: { id },
        data: { status: campaign.status },
      }).catch(() => {});
      throw sendErr;
    }

    return successResponse(res, {
      message: `Campaign sent to ${sentCount} of ${users.length} users`,
      sentCount,
      totalUsers: users.length,
    });
  } catch (err: any) {
    console.error('[EmailCampaign] Send error:', err.message);
    return errorResponse(res, 'Failed to send campaign', 500);
  }
});

// ═══════════════════════════════════════════════════════
// 9. POST /trigger/:trigger — Manually trigger a specific automation
// ═══════════════════════════════════════════════════════
r.post('/trigger/:trigger', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { trigger } = req.params;

    if (!VALID_TRIGGERS.includes(trigger as any)) {
      return errorResponse(res, `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`, 400);
    }

    if (trigger === 'manual') {
      return errorResponse(res, 'Use the /send endpoint for manual campaigns', 400);
    }

    // Find active campaigns for this trigger
    const campaigns = await prisma.emailCampaign.findMany({
      where: { trigger, status: 'active' },
    });

    if (campaigns.length === 0) {
      return errorResponse(res, `No active campaigns found for trigger "${trigger}"`, 404);
    }

    const now = new Date();
    let totalSent = 0;
    const results: Array<{ campaignId: string; name: string; sent: number; targetUsers: number }> = [];

    for (const campaign of campaigns) {
      let users: Array<{ id: string; email: string | null; fullName: string }> = [];

      switch (trigger) {
        case 'welcome': {
          // Users created in the last 24h
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          users = await prisma.user.findMany({
            where: {
              createdAt: { gte: twentyFourHoursAgo },
              email: { not: null },
              isActive: true,
            },
            select: { id: true, email: true, fullName: true },
          });
          break;
        }

        case 'trial_expiring': {
          // Users whose trial ends within the next 2 days
          const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
          const trialSubs = await prisma.userSubscription.findMany({
            where: {
              status: 'TRIAL',
              trialEndDate: { gte: now, lte: twoDaysFromNow },
            },
            select: { userId: true },
            distinct: ['userId'],
          });
          const userIds = trialSubs.map(s => s.userId);
          if (userIds.length > 0) {
            users = await prisma.user.findMany({
              where: { id: { in: userIds }, email: { not: null }, isActive: true },
              select: { id: true, email: true, fullName: true },
            });
          }
          break;
        }

        case 'inactive_7d': {
          // Users with no UserEvent in the last 7 days (exclude users created less than 7 days ago)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentEvents = await prisma.userEvent.findMany({
            where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
            select: { userId: true },
            distinct: ['userId'],
          });
          const activeIds = recentEvents.map(e => e.userId).filter(Boolean) as string[];
          users = await prisma.user.findMany({
            where: {
              email: { not: null },
              isActive: true,
              createdAt: { lte: sevenDaysAgo }, // Only target users who have been around 7+ days
              ...(activeIds.length > 0 ? { id: { notIn: activeIds } } : {}),
            },
            select: { id: true, email: true, fullName: true },
          });
          break;
        }

        case 'abandoned_checkout': {
          // Users who have checkout_started but no checkout_completed in last 48h
          const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

          const startedEvents = await prisma.userEvent.findMany({
            where: {
              event: 'checkout_started',
              createdAt: { gte: fortyEightHoursAgo },
              userId: { not: null },
            },
            select: { userId: true },
            distinct: ['userId'],
          });
          const startedIds = startedEvents.map(e => e.userId).filter(Boolean) as string[];

          if (startedIds.length === 0) break;

          const completedEvents = await prisma.userEvent.findMany({
            where: {
              event: 'checkout_completed',
              createdAt: { gte: fortyEightHoursAgo },
              userId: { in: startedIds },
            },
            select: { userId: true },
            distinct: ['userId'],
          });
          const completedIds = completedEvents.map(e => e.userId).filter(Boolean) as string[];

          const abandonedIds = startedIds.filter(id => !completedIds.includes(id));
          if (abandonedIds.length > 0) {
            users = await prisma.user.findMany({
              where: { id: { in: abandonedIds as string[] }, email: { not: null }, isActive: true },
              select: { id: true, email: true, fullName: true },
            });
          }
          break;
        }
      }

      // Also filter by campaign segment
      if (users.length > 0 && campaign.segment !== 'all') {
        const segmentUsers = await getUsersBySegment(campaign.segment);
        const segmentIds = new Set(segmentUsers.map(u => u.id));
        users = users.filter(u => segmentIds.has(u.id));
      }

      let sentCount = 0;
      for (const user of users) {
        if (!user.email) continue;
        const sent = await sendCampaignEmail(user.email, campaign.subject, campaign.body);
        if (sent) sentCount++;
      }

      if (sentCount > 0) {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            sentCount: { increment: sentCount },
            lastSentAt: new Date(),
          },
        });
      }

      totalSent += sentCount;
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        sent: sentCount,
        targetUsers: users.length,
      });
    }

    return successResponse(res, {
      trigger,
      totalSent,
      campaigns: results,
    });
  } catch (err: any) {
    console.error('[EmailCampaign] Trigger error:', err.message);
    return errorResponse(res, 'Failed to trigger automation', 500);
  }
});

export default r;
