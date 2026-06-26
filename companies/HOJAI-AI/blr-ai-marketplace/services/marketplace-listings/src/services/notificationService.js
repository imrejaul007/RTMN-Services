/**
 * BAM Marketplace Email Notification Service
 *
 * Handles email notifications for:
 * - New purchase/receipt
 * - Subscription confirmation
 * - Review notifications
 * - Payout notifications
 */

const nodemailer = require('nodemailer');

// Configure email (use environment variables in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'test@hojai.ai',
    pass: process.env.SMTP_PASS || 'testpass',
  },
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@hojai.ai';
const APP_NAME = 'BAM - BLR AI Marketplace';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Send purchase confirmation email
 */
async function sendPurchaseConfirmation({ customerEmail, customerName, listingTitle, amount, currency, orderId }) {
  const subject = `Purchase Confirmed: ${listingTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BAM</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Thank you for your purchase! 🎉</h2>
        <p>Hi ${customerName || 'there'},</p>
        <p>Your purchase has been confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Item</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${listingTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Amount</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${currency} ${(amount / 100).toLocaleString()}</td>
          </tr>
        </table>
        <p>You can access your purchase from your dashboard:</p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © 2026 ${APP_NAME}. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({ to: customerEmail, subject, html });
}

/**
 * Send subscription confirmation email
 */
async function sendSubscriptionConfirmation({ customerEmail, customerName, listingTitle, amount, currency, nextBillingDate }) {
  const subject = `Subscription Active: ${listingTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BAM</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Your subscription is active! 🚀</h2>
        <p>Hi ${customerName || 'there'},</p>
        <p>Your subscription to <strong>${listingTitle}</strong> has been activated.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Product</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${listingTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Amount</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${currency} ${(amount / 100).toLocaleString()}/month</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Next Billing</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${nextBillingDate}</td>
          </tr>
        </table>
        <p>You can manage your subscription from your dashboard:</p>
        <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px;">Manage Subscription</a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © 2026 ${APP_NAME}. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({ to: customerEmail, subject, html });
}

/**
 * Send review notification to publisher
 */
async function sendReviewNotification({ publisherEmail, publisherName, listingTitle, reviewerName, rating, reviewBody }) {
  const subject = `New Review: ${listingTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">BAM</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">You received a new review! ⭐</h2>
        <p>Hi ${publisherName || 'Publisher'},</p>
        <p>Someone left a review on <strong>${listingTitle}</strong>:</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 24px; color: #f59e0b;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
          <p style="margin: 10px 0 0;"><strong>${reviewerName}</strong> said:</p>
          <p style="color: #4b5563; font-style: italic;">"${reviewBody || 'No written review'}"</p>
        </div>
        <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px;">View Dashboard</a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © 2026 ${APP_NAME}. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({ to: publisherEmail, subject, html });
}

/**
 * Send payout notification to publisher
 */
async function sendPayoutNotification({ publisherEmail, publisherName, amount, currency, salesCount, period }) {
  const subject = `Payout Received: ${currency} ${(amount / 100).toLocaleString()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">💰 Payout Notification</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">You received a payout! 🎉</h2>
        <p>Hi ${publisherName || 'Publisher'},</p>
        <p>Your payout for ${period} has been processed:</p>
        <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #10b981;">${currency} ${(amount / 100).toLocaleString()}</div>
          <div style="color: #6b7280;">${salesCount} sales</div>
        </div>
        <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px;">View Earnings</a>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © 2026 ${APP_NAME}. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({ to: publisherEmail, subject, html });
}

/**
 * Core send email function
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    // In development, just log
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email] Would send to ${to}: ${subject}`);
      return { success: true, messageId: 'dev-mode' };
    }

    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });

    console.log(`[email] Sent to ${to}: ${subject} - ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[email] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendPurchaseConfirmation,
  sendSubscriptionConfirmation,
  sendReviewNotification,
  sendPayoutNotification,
};
