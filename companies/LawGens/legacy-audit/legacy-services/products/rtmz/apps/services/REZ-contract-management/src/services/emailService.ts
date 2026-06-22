import * as nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface SignatureRequestEmailParams {
  to: string;
  name: string;
  contractTitle: string;
  contractId: string;
  signatureUrl: string;
  expiryDate: Date;
  isReminder?: boolean;
}

interface ContractSignedNotificationParams {
  contractId: string;
  title: string;
  parties: { name: string; email: string }[];
  tenantId: string;
}

interface SignatureDeclinedNotificationParams {
  contractId: string;
  partyName: string;
  partyEmail: string;
  reason: string;
  tenantId: string;
}

interface RenewalReminderParams {
  contractId: string;
  title: string;
  endDate: Date;
  renewalUrl: string;
  recipients: { name: string; email: string }[];
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
    return this.transporter;
  }

  async sendSignatureRequestEmail(params: SignatureRequestEmailParams): Promise<void> {
    const { to, name, contractTitle, contractId, signatureUrl, expiryDate, isReminder } = params;

    const subject = isReminder
      ? `Reminder: Please sign "${contractTitle}"`
      : `Action Required: Please sign "${contractTitle}"`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${isReminder ? 'Reminder: Signature Required' : 'Signature Request'}</h2>
        <p>Dear ${name},</p>
        <p>${isReminder ? 'This is a reminder that your signature is still needed' : 'You have been requested to sign a contract'}:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Contract:</strong> ${contractTitle}</p>
          <p style="margin: 5px 0 0;"><strong>Contract ID:</strong> ${contractId}</p>
          <p style="margin: 5px 0 0;"><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</p>
        </div>

        <p style="margin: 20px 0;">
          <a href="${signatureUrl}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Sign Contract
          </a>
        </p>

        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${signatureUrl}" style="color: #007bff;">${signatureUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          This is an automated message from REZ Contract Management.<br>
          Please do not reply to this email.
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
    logger.info(`Signature request email sent to ${to}`, { contractId, isReminder });
  }

  async sendContractSignedNotification(params: ContractSignedNotificationParams): Promise<void> {
    const { contractId, title, parties, tenantId } = params;

    const signers = parties.filter(p => p.email);
    const emails = signers.map(p => p.email);

    if (emails.length === 0) return;

    const subject = `Contract Signed: "${title}"`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Contract Fully Executed</h2>
        <p>The following contract has been signed by all parties:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Contract:</strong> ${title}</p>
          <p style="margin: 5px 0 0;"><strong>Contract ID:</strong> ${contractId}</p>
          <p style="margin: 5px 0 0;"><strong>Signed At:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p><strong>Signers:</strong></p>
        <ul>
          ${parties.map(p => `<li>${p.name} (${p.email})</li>`).join('')}
        </ul>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          This is an automated message from REZ Contract Management.
        </p>
      </div>
    `;

    await this.sendEmail(emails, subject, html);
    logger.info(`Contract signed notification sent for ${contractId}`);
  }

  async sendSignatureDeclinedNotification(params: SignatureDeclinedNotificationParams): Promise<void> {
    const { contractId, partyName, partyEmail, reason, tenantId } = params;

    const subject = `Signature Declined: Contract ${contractId}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Signature Declined</h2>
        <p>A party has declined to sign the contract:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Contract ID:</strong> ${contractId}</p>
          <p style="margin: 5px 0 0;"><strong>Party:</strong> ${partyName} (${partyEmail})</p>
          <p style="margin: 5px 0 0;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin: 5px 0 0;"><strong>Declined At:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p>Please review the contract and contact the party if needed.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          This is an automated message from REZ Contract Management.
        </p>
      </div>
    `;

    await this.sendEmail(process.env.SMTP_USER || '', subject, html);
    logger.info(`Signature declined notification sent for ${contractId}`, { partyEmail, reason });
  }

  async sendRenewalReminder(params: RenewalReminderParams): Promise<void> {
    const { contractId, title, endDate, renewalUrl, recipients } = params;

    const subject = `Contract Renewal Reminder: "${title}"`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Contract Renewal Reminder</h2>
        <p>The following contract is approaching its end date:</p>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>Contract:</strong> ${title}</p>
          <p style="margin: 5px 0 0;"><strong>Contract ID:</strong> ${contractId}</p>
          <p style="margin: 5px 0 0;"><strong>End Date:</strong> ${endDate.toLocaleDateString()}</p>
          <p style="margin: 5px 0 0; color: #856404;"><strong>Days Remaining:</strong> ${Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</p>
        </div>

        <p style="margin: 20px 0;">
          <a href="${renewalUrl}"
             style="background-color: #ffc107; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Review & Renew Contract
          </a>
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p style="color: #999; font-size: 12px;">
          This is an automated reminder from REZ Contract Management.
        </p>
      </div>
    `;

    const emails = recipients.map(r => r.email);
    await this.sendEmail(emails, subject, html);
    logger.info(`Renewal reminder sent for contract ${contractId}`, { recipients: emails });
  }

  private async sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email service not configured - skipping email send', { to, subject });
      return;
    }

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'REZ Contract Management <noreply@rez.com>',
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html
      });
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error });
      throw error;
    }
  }
}

export const emailService = new EmailService();
