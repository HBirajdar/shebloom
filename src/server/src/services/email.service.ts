/**
 * VedaClue Email Service — powered by SendGrid
 * Sender: noreply@vedaclue.com
 * Brand: #059669 (green) header, #F43F5E (rose) accent
 * Rule: Never throw — always try/catch so app never crashes on email failure.
 */

import sgMail from '@sendgrid/mail';

const API_KEY = process.env.SENDGRID_API_KEY || '';
if (API_KEY) sgMail.setApiKey(API_KEY);

const FROM = { email: 'noreply@vedaclue.com', name: 'VedaClue' };

// ─── Shared HTML shell ──────────────────────────────────────────────────────

function buildHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#059669,#047857);padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🌿 VedaClue</p>
          <p style="margin:0;font-size:12px;color:#a7f3d0;letter-spacing:1.5px;text-transform:uppercase;">Ancient Wisdom. Modern Wellness.</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">
          ${bodyHtml}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">You're receiving this email from <strong>VedaClue</strong> — your women's health companion.</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} VedaClue · vedaclue.com · noreply@vedaclue.com</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#111827;">${text}</h1>`;
}
function p(text: string, style = '') {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;${style}">${text}</p>`;
}
function btn(text: string, url: string) {
  return `<p style="margin:24px 0 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;">${text}</a>
  </p>`;
}
function divider() {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>`;
}
function infoBox(html: string) {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:20px 0;">${html}</div>`;
}
function warnBox(html: string) {
  return `<div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:20px 24px;margin:20px 0;">${html}</div>`;
}

async function send(msg: sgMail.MailDataRequired): Promise<void> {
  if (!API_KEY) {
    console.warn('[VedaClue Email] SENDGRID_API_KEY not set — skipping email to', msg.to);
    return;
  }
  try {
    await sgMail.send(msg);
    console.log('[VedaClue Email] Sent:', msg.subject, '→', msg.to);
  } catch (err: any) {
    console.error('[VedaClue Email] Failed to send:', err?.response?.body || err?.message || err);
    // Never re-throw — email failure must not crash the app
  }
}

// ─── 1. Welcome Email ───────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const body =
    h1(`Welcome to VedaClue, ${name}! 🌸`) +
    p('We\'re so glad you\'re here. VedaClue is your personal space for period tracking, wellness insights, Ayurvedic wisdom, and women\'s health — all in one beautiful app.') +
    infoBox(
      `<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#065f46;">Here's what you can do:</p>` +
      `<ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:2;">` +
      `<li>📅 Track your menstrual cycle & predict future periods</li>` +
      `<li>😊 Log moods, symptoms, and energy levels daily</li>` +
      `<li>👩‍⚕️ Book appointments with trusted women's health doctors</li>` +
      `<li>🌿 Explore Ayurvedic remedies tailored to your body</li>` +
      `<li>📊 Get personalized health insights & cycle analytics</li>` +
      `</ul>`
    ) +
    btn('Open VedaClue', 'https://vedaclue.com/dashboard') +
    divider() +
    p('If you have any questions, just reply to this email — we\'re always here to help.', 'font-size:13px;color:#6b7280;') +
    p('With love & care,<br/><strong>The VedaClue Team</strong>', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: `Welcome to VedaClue, ${name}! 🌿`,
    html: buildHtml('Welcome to VedaClue', body),
    text: `Welcome to VedaClue, ${name}!\n\nWe're glad you're here. Start tracking your cycle, booking doctors, and exploring Ayurvedic wellness at https://vedaclue.com/dashboard`,
  });
}

// ─── 2. OTP / Verification Email ───────────────────────────────────────────

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const body =
    h1('Your Verification Code') +
    p('Use the one-time code below to verify your identity. It expires in <strong>10 minutes</strong>.') +
    `<div style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;background:#f0fdf4;border:2px dashed #059669;border-radius:16px;padding:18px 40px;font-size:40px;font-weight:900;color:#059669;letter-spacing:10px;">${otp}</span>
    </div>` +
    warnBox(p('🔒 <strong>Never share this code with anyone</strong>, including VedaClue support. We will never ask for your OTP.', 'margin:0;font-size:13px;')) +
    divider() +
    p('If you didn\'t request this code, you can safely ignore this email.', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: `${otp} is your VedaClue verification code`,
    html: buildHtml('VedaClue OTP', body),
    text: `Your VedaClue verification code is: ${otp}\n\nThis code expires in 10 minutes. Never share it with anyone.`,
  });
}

// ─── 3. Appointment Confirmation (Patient) ─────────────────────────────────

export interface BookingDetails {
  patientName: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  appointmentId: string;
  notes?: string;
}

export async function sendBookingConfirmation(email: string, details: BookingDetails): Promise<void> {
  const { patientName, doctorName, specialization, date, time, appointmentId, notes } = details;

  const body =
    h1('Appointment Confirmed! ✅') +
    p(`Hi <strong>${patientName}</strong>, your appointment has been successfully booked. Here are the details:`) +
    infoBox(
      `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
        <tr><td style="padding:6px 0;font-weight:600;width:140px;">Doctor</td><td>Dr. ${doctorName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Specialization</td><td>${specialization}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Date</td><td>${date}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Time</td><td>${time}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Booking ID</td><td style="color:#059669;font-weight:700;">#${appointmentId}</td></tr>
        ${notes ? `<tr><td style="padding:6px 0;font-weight:600;vertical-align:top;">Notes</td><td>${notes}</td></tr>` : ''}
      </table>`
    ) +
    p('Please arrive 10 minutes early. Keep your Booking ID handy for reference.') +
    btn('View Appointment', `https://vedaclue.com/appointments`) +
    divider() +
    p('Need to reschedule or cancel? Visit the Appointments section in the app.', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: `Appointment confirmed with Dr. ${doctorName} — ${date}`,
    html: buildHtml('Appointment Confirmed', body),
    text: `Hi ${patientName},\n\nYour appointment is confirmed!\nDoctor: Dr. ${doctorName} (${specialization})\nDate: ${date} at ${time}\nBooking ID: #${appointmentId}\n\nView at: https://vedaclue.com/appointments`,
  });
}

// ─── 4. Doctor Notification (New Appointment) ──────────────────────────────

export interface DoctorNotificationDetails {
  doctorName: string;
  patientName: string;
  date: string;
  time: string;
  appointmentId: string;
  notes?: string;
}

export async function sendDoctorNotification(email: string, details: DoctorNotificationDetails): Promise<void> {
  const { doctorName, patientName, date, time, appointmentId, notes } = details;

  const body =
    h1('New Appointment Booked 📋') +
    p(`Dear <strong>Dr. ${doctorName}</strong>, a new appointment has been scheduled with you on VedaClue.`) +
    infoBox(
      `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
        <tr><td style="padding:6px 0;font-weight:600;width:140px;">Patient</td><td>${patientName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Date</td><td>${date}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Time</td><td>${time}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Booking ID</td><td style="color:#059669;font-weight:700;">#${appointmentId}</td></tr>
        ${notes ? `<tr><td style="padding:6px 0;font-weight:600;vertical-align:top;">Patient Notes</td><td>${notes}</td></tr>` : ''}
      </table>`
    ) +
    p('Please log in to VedaClue to review the appointment details and confirm your availability.') +
    btn('View on VedaClue', 'https://vedaclue.com/appointments') +
    divider() +
    p('This is an automated notification from VedaClue.', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: `New appointment: ${patientName} on ${date} at ${time}`,
    html: buildHtml('New Appointment Notification', body),
    text: `Dear Dr. ${doctorName},\n\nNew appointment booked!\nPatient: ${patientName}\nDate: ${date} at ${time}\nBooking ID: #${appointmentId}\n\nView at: https://vedaclue.com/appointments`,
  });
}

// ─── 5. Cancellation Email ─────────────────────────────────────────────────

export interface CancellationDetails {
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  appointmentId: string;
  reason?: string;
}

export async function sendCancellationEmail(email: string, details: CancellationDetails): Promise<void> {
  const { patientName, doctorName, date, time, appointmentId, reason } = details;

  const body =
    h1('Appointment Cancelled') +
    p(`Hi <strong>${patientName}</strong>, your appointment has been cancelled. Here are the details:`) +
    warnBox(
      `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
        <tr><td style="padding:6px 0;font-weight:600;width:140px;">Doctor</td><td>Dr. ${doctorName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Date</td><td>${date}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Time</td><td>${time}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;">Booking ID</td><td>#${appointmentId}</td></tr>
        ${reason ? `<tr><td style="padding:6px 0;font-weight:600;vertical-align:top;">Reason</td><td>${reason}</td></tr>` : ''}
      </table>`
    ) +
    p('You can easily book a new appointment at a different time.') +
    btn('Book New Appointment', 'https://vedaclue.com/doctors') +
    divider() +
    p('If you have questions, contact us at support@vedaclue.com.', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: `Appointment cancelled — Booking #${appointmentId}`,
    html: buildHtml('Appointment Cancelled', body),
    text: `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} on ${date} at ${time} (Booking #${appointmentId}) has been cancelled.\n\nBook a new one at: https://vedaclue.com/doctors`,
  });
}

// ─── 6. Password Reset Email ───────────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  const body =
    h1('Reset Your Password 🔑') +
    p(`Hi <strong>${name}</strong>, we received a request to reset your VedaClue account password.`) +
    p('Click the button below to set a new password. This link expires in <strong>30 minutes</strong>.') +
    btn('Reset Password', resetLink) +
    divider() +
    warnBox(p('If you didn\'t request a password reset, please ignore this email. Your password will remain unchanged. If you\'re concerned about your account security, contact us immediately.', 'margin:0;font-size:13px;')) +
    divider() +
    p('For security, never share this link with anyone.', 'font-size:13px;color:#6b7280;');

  await send({
    to: email,
    from: FROM,
    subject: 'Reset your VedaClue password',
    html: buildHtml('Password Reset', body),
    text: `Hi ${name},\n\nReset your VedaClue password using this link (expires in 30 minutes):\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
  });
}

// ─── 7. Order Confirmation (Ayurveda Shop) ─────────────────────────────────

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderDetails {
  customerName: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
  estimatedDelivery: string;
}

export async function sendOrderConfirmation(email: string, details: OrderDetails): Promise<void> {
  const { customerName, orderId, items, total, deliveryAddress, estimatedDelivery } = details;

  const itemRows = items.map(item =>
    `<tr>
      <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">${item.name}</td>
      <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:center;">×${item.qty}</td>
      <td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:right;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
    </tr>`
  ).join('');

  const body =
    h1('Order Confirmed! 🛍️') +
    p(`Hi <strong>${customerName}</strong>, thank you for your order from the VedaClue Ayurveda Shop! We're preparing your items with care.`) +
    infoBox(
      `<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#065f46;">Order #${orderId}</p>` +
      `<table width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr>
            <th style="padding:8px 0;font-size:13px;color:#6b7280;text-align:left;border-bottom:2px solid #059669;">Item</th>
            <th style="padding:8px 0;font-size:13px;color:#6b7280;text-align:center;border-bottom:2px solid #059669;">Qty</th>
            <th style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right;border-bottom:2px solid #059669;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px 0 0;font-size:15px;font-weight:800;color:#111827;">Total</td>
            <td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#059669;text-align:right;">₹${total.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>`
    ) +
    infoBox(
      `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#065f46;">📦 Delivery Details</p>` +
      `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${deliveryAddress}</p>` +
      `<p style="margin:0;font-size:13px;color:#6b7280;">Estimated delivery: <strong>${estimatedDelivery}</strong></p>`
    ) +
    btn('Track Your Order', `https://vedaclue.com/orders/${orderId}`) +
    divider() +
    p('Questions about your order? Reply to this email or visit vedaclue.com/support.', 'font-size:13px;color:#6b7280;');

  const itemsText = items.map(i => `- ${i.name} ×${i.qty} = ₹${(i.price * i.qty).toLocaleString('en-IN')}`).join('\n');

  await send({
    to: email,
    from: FROM,
    subject: `Order confirmed — #${orderId} | VedaClue Ayurveda Shop`,
    html: buildHtml('Order Confirmed', body),
    text: `Hi ${customerName},\n\nOrder #${orderId} confirmed!\n\n${itemsText}\n\nTotal: ₹${total.toLocaleString('en-IN')}\nDelivery to: ${deliveryAddress}\nEstimated: ${estimatedDelivery}\n\nTrack at: https://vedaclue.com/orders/${orderId}`,
  });
}
