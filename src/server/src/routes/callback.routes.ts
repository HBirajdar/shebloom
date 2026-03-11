import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/response.utils';

const router = Router();

// POST /api/v1/callbacks — user submits callback request (no auth required)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, productId, userName, userPhone, userEmail, productName, ownerEmail, ownerPhone, message } = req.body;
    if (!userName || !userPhone || !productName) {
      return errorResponse(res, 'Name, phone and product name are required', 400);
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
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Customer Name:</strong> ${userName}</p>
            <p><strong>Phone:</strong> ${userPhone}</p>
            ${userEmail ? `<p><strong>Email:</strong> ${userEmail}</p>` : ''}
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
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
