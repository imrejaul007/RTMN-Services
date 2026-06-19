// Resend email sender with safe fallback to console.
// If RESEND_API_KEY is missing, we still log the link so dev can copy/paste.
import { Resend } from 'resend';
import logger from '../utils/logger.js';

let resend = null;
if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('replace_me')) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const subject = 'Verify your RTMN account';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#2563eb">Welcome to RTMN, ${name || ''}!</h1>
      <p>Thanks for signing up. Please confirm your email to activate your account.</p>
      <p style="margin:32px 0">
        <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Verify my email
        </a>
      </p>
      <p>Or copy this link: <br><code>${verifyUrl}</code></p>
      <p>This link expires in 24 hours.</p>
      <p style="color:#64748b;font-size:12px;margin-top:32px">
        RTMN Real-Time Multi-Industry Network
      </p>
    </div>`;
  const text = `Welcome to RTMN! Verify your email: ${verifyUrl}`;

  if (!resend) {
    logger.warn(`[email:dev-mode] Would send verification to=${to} url=${verifyUrl}`);
    return { ok: true, devMode: true, verifyUrl };
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@rtmn.io',
      to,
      subject,
      html,
      text,
      replyTo: process.env.EMAIL_REPLY_TO
    });
    return { ok: true, id: result.id };
  } catch (err) {
    logger.error('Resend send failed', err);
    return { ok: false, error: err.message };
  }
}

export async function sendWelcomeEmail({ to, name, dashboardUrl }) {
  const subject = 'You are in. Welcome to RTMN.';
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
      <h1 style="color:#16a34a">You are verified ✅</h1>
      <p>Hi ${name || ''},</p>
      <p>Your RTMN account is active. Pick your first industry service to start your pilot.</p>
      <p style="margin:24px 0">
        <a href="${dashboardUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Open my dashboard
        </a>
      </p>
      <p>Need help? Reply to this email or write to ${process.env.EMAIL_REPLY_TO || 'support@rtmn.io'}.</p>
    </div>`;

  if (!resend) {
    logger.warn(`[email:dev-mode] Would send welcome to=${to} dashboard=${dashboardUrl}`);
    return { ok: true, devMode: true };
  }
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@rtmn.io',
      to,
      subject,
      html,
      replyTo: process.env.EMAIL_REPLY_TO
    });
    return { ok: true, id: result.id };
  } catch (err) {
    logger.error('Resend send failed', err);
    return { ok: false, error: err.message };
  }
}
