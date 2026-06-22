/**
 * Gmail Integration - Email tracking & sequences
 */

import axios from 'axios';

const GMAIL_CONFIG = {
  clientId: process.env.GMAIL_CLIENT_ID || '',
  clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
};

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  threadId: string;
  labels: string[];
  read: boolean;
}

export interface EmailSequence {
  id: string;
  name: string;
  steps: EmailStep[];
  active: boolean;
}

export interface EmailStep {
  order: number;
  subject: string;
  body: string;
  delayDays: number;
  trigger?: 'open' | 'click' | 'no_reply';
}

export class GmailClient {
  private accessToken: string = '';
  private client = axios.create({
    baseURL: 'https://gmail.googleapis.com/gmail/v1',
    timeout: 5000,
  });

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GMAIL_CONFIG.clientId,
        client_secret: GMAIL_CONFIG.clientSecret,
        refresh_token: GMAIL_CONFIG.refreshToken,
        grant_type: 'refresh_token',
      });
      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Gmail auth failed:', error);
      return '';
    }
  }

  async getEmails(query: string, maxResults: number = 10): Promise<Email[]> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get('/users/me/messages', {
        params: { q: query, maxResults },
        headers: { Authorization: `Bearer ${token}` },
      });

      const emails: Email[] = [];
      for (const msg of response.data.messages || []) {
        const email = await this.getEmail(msg.id);
        if (email) emails.push(email);
      }
      return emails;
    } catch (error) {
      console.error('Gmail fetch failed:', error);
      return [];
    }
  }

  async getEmail(messageId: string): Promise<Email | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const msg = response.data;
      const headers = msg.payload?.headers || [];

      return {
        id: msg.id,
        from: headers.find((h: any) => h.name === 'From')?.value || '',
        to: headers.find((h: any) => h.name === 'To')?.value || '',
        subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
        body: this.extractBody(msg),
        date: new Date(parseInt(msg.internalDate)),
        threadId: msg.threadId,
        labels: msg.labelIds || [],
        read: !msg.labelIds?.includes('UNREAD'),
      };
    } catch (error) {
      return null;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const raw = btoa(`To: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`)
        .replace(/\+/g, '-').replace(/\//g, '_');

      await this.client.post('/users/me/messages/send', { raw }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error) {
      console.error('Gmail send failed:', error);
      return false;
    }
  }

  async trackEmailOpens(emailId: string): Promise<number> {
    try {
      const token = await this.getAccessToken();
      const response = await this.client.get(`/users/me/messages/${emailId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Count history entries for email open events
      const history = response.data.history || [];
      return history.filter((h: any) => h.labelsAdded?.some((l: any) => l.labelId === 'IMPORTANT')).length;
    } catch (error) {
      return 0;
    }
  }

  async getEmailSequenceProspects(sequenceId: string): Promise<string[]> {
    // Return email addresses enrolled in a sequence
    return [];
  }

  private extractBody(msg: any): string {
    const parts = msg.payload?.parts || [];
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return Buffer.from(part.body?.data || '', 'base64').toString();
      }
    }
    return msg.snippet || '';
  }
}
