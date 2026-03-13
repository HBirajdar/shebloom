import webpush from 'web-push';
import prisma from '../config/database';
import { logger } from '../config/logger';

// VAPID keys — generate once with: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:support@vedaclue.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * Send push notification to a specific user
 * Also creates a DB notification record
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'general',
  data?: any
): Promise<boolean> {
  // Always save to DB
  await prisma.notification.create({
    data: { userId, title, body, type, data: data || undefined },
  }).catch(e => logger.error('[Push] DB notification create failed:', e.message));

  // Try sending push if user has a subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken || !VAPID_PUBLIC || !VAPID_PRIVATE) return false;

  try {
    const subscription = JSON.parse(user.fcmToken);
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data?.url || '/', ...data },
    }));
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — clean it up
      await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } }).catch(() => {});
      logger.info(`[Push] Cleaned expired subscription for user ${userId}`);
    } else {
      logger.error(`[Push] Send failed for user ${userId}:`, err.message);
    }
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToMany(
  userIds: string[],
  title: string,
  body: string,
  type: string = 'general',
  data?: any
): Promise<void> {
  await Promise.allSettled(
    userIds.map(uid => sendPushNotification(uid, title, body, type, data))
  );
}

/** Get the VAPID public key for client subscription */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC;
}
