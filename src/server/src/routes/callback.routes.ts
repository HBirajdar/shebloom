import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const router = Router();

// HTML escape to prevent XSS in email notifications
const escapeHtml = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// POST /api/v1/callbacks — user submits callback request (no auth required)
// Rate-limited to prevent abuse as email/SMS relay
const callbackRateMap = new Map<string, { count: number; resetAt: number }>();
const CALLBACK_RATE_LIMIT = 5; // max 5 requests per 15 min per IP
const CALLBACK_RATE_WINDOW = 15 * 60 * 1000;

router.post('/', async (req: Request, res: Response) => {
  try {
    // Rate limit by IP to prevent relay abuse
    const clientIp = (req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const entry = callbackRateMap.get(clientIp);
    if (entry && now < entry.resetAt) {
      if (entry.count >= CALLBACK_RATE_LIMIT) {
        return errorResponse(res, 'Too many callback requests. Please try again later.', 429);
      }
      entry.count++;
    } else {
      callbackRateMap.set(clientIp, { count: 1, resetAt: now + CALLBACK_RATE_WINDOW });
    }

    const { userId, productId, userName, userPhone, userEmail, productName, message } = req.body;
    if (!userName || !userPhone || !productName) {
      return errorResponse(res, 'Name, phone and product name are required', 400);
    }

    // Validate phone format (basic check)
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(userPhone.replace(/[\s-]/g, ''))) {
      return errorResponse(res, 'Invalid phone number format', 400);
    }

    // SECURITY: Never accept ownerEmail/ownerPhone from the client — look up from product in DB
    let ownerEmail: string | null = null;
    let ownerPhone: string | null = null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { ownerEmail: true, ownerPhone: true } as any,
      });
      if (product) {
        ownerEmail = (product as any).ownerEmail || null;
        ownerPhone = (product as any).ownerPhone || null;
      }
    }

    const callback = await prisma.callbackRequest.create({
      data: { userId, productId, userName, userPhone, userEmail, productName, ownerEmail, ownerPhone, message, status: 'PENDING' }
    });

    // Send notification email to owner if ownerEmail exists
    if (ownerEmail) {
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        await sgMail.send({
          to: ownerEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@vedaclue.com',
          subject: `New Callback Request for ${productName}`,
          html: `
            <h2>New Callback Request</h2>
            <p><strong>Product:</strong> ${escapeHtml(productName)}</p>
            <p><strong>Customer Name:</strong> ${escapeHtml(userName)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(userPhone)}</p>
            ${userEmail ? `<p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>` : ''}
            ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
            <p><strong>Requested At:</strong> ${new Date().toLocaleString('en-IN')}</p>
            <hr>
            <p style="color:#666;font-size:12px">This notification was sent by VedaClue.</p>
          `
        });
      } catch (emailErr: any) {
        console.error('[Callback] Email notification failed:', emailErr.message);
      }
    }

    // Send Twilio SMS/WhatsApp to ownerPhone if exists
    if (ownerPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const smsBody = `VedaClue: New callback request for ${productName} from ${userName} (${userPhone})${message ? '. Message: ' + message : ''}`;
        // Try WhatsApp first, fall back to SMS
        const toNumber = ownerPhone.startsWith('+') ? ownerPhone : '+91' + ownerPhone;
        if (process.env.TWILIO_WHATSAPP_FROM) {
          await client.messages.create({
            body: smsBody,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
            to: `whatsapp:${toNumber}`
          });
        } else if (process.env.TWILIO_PHONE_FROM) {
          await client.messages.create({
            body: smsBody,
            from: process.env.TWILIO_PHONE_FROM,
            to: toNumber
          });
        }
      } catch (smsErr: any) {
        console.error('[Callback] SMS notification failed:', smsErr.message);
      }
    }

    return successResponse(res, callback, 'Callback request submitted successfully', 201);
  } catch (err: any) {
    return errorResponse(res, err.message, 500);
  }
});

export default router;
