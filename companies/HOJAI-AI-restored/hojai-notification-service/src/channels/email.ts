import nodemailer, { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  html?: boolean;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailChannel {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        this.isConfigured = true;
        console.log('Email channel initialized with SMTP');
      } else {
        console.log('Email channel: SMTP not configured, using mock mode');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.isConfigured = false;
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, body, from, replyTo, html } = options;

    // Validate recipient
    if (!to || !this.isValidEmail(to)) {
      return { success: false, error: 'Invalid email address' };
    }

    // If not configured, return mock success
    if (!this.isConfigured || !this.transporter) {
      console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: from || process.env.EMAIL_FROM || 'HOJAI AI <noreply@hojai.ai>',
        to,
        subject,
        text: html ? undefined : body,
        html: html ? body : undefined,
        replyTo: replyTo
      });

      console.log(`Email sent successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Email send failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async sendBulk(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<{ successful: string[]; failed: { email: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const email of recipients) {
      const result = await this.send({ ...options, to: email });
      if (result.success) {
        successful.push(email);
      } else {
        failed.push({ email, error: result.error || 'Unknown error' });
      }
    }

    return { successful, failed };
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailChannel = new EmailChannel();
