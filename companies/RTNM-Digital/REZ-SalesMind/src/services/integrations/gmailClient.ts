/**
 * Gmail Integration - Email tracking & sequences
 * FIXED: proper base64 encoding for Unicode, token refresh
 */
import axios from 'axios';

const GMAIL_CONFIG = {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
};

export class GmailClient {
    private accessToken = '';
    private tokenExpiry = 0; // Unix timestamp when token expires
    private client = axios.create({
        baseURL: 'https://gmail.googleapis.com/gmail/v1',
        timeout: 5000,
    });

    async getAccessToken(): Promise<string> {
        // Return cached token if still valid (with 60s buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
            return this.accessToken;
        }

        if (!GMAIL_CONFIG.clientId || !GMAIL_CONFIG.clientSecret || !GMAIL_CONFIG.refreshToken) {
            console.warn('Gmail not configured: missing credentials');
            return '';
        }

        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: GMAIL_CONFIG.clientId,
                client_secret: GMAIL_CONFIG.clientSecret,
                refresh_token: GMAIL_CONFIG.refreshToken,
                grant_type: 'refresh_token',
            });

            this.accessToken = response.data.access_token;
            // OAuth tokens typically last 1 hour
            this.tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000;
            return this.accessToken;
        } catch (error) {
            console.error('Gmail auth failed:', error);
            return '';
        }
    }

    async getEmails(query: string, maxResults = 10): Promise<unknown[]> {
        try {
            const token = await this.getAccessToken();
            if (!token) return [];

            const response = await this.client.get('/users/me/messages', {
                params: { q: query, maxResults },
                headers: { Authorization: `Bearer ${token}` },
            });

            const emails: unknown[] = [];
            for (const msg of (response.data.messages || []).slice(0, maxResults)) {
                const email = await this.getEmail((msg as { id: string }).id, token);
                if (email) emails.push(email);
            }
            return emails;
        } catch (error) {
            console.error('Gmail fetch failed:', error);
            return [];
        }
    }

    async getEmail(messageId: string, token?: string): Promise<unknown | null> {
        try {
            const accessToken = token || await this.getAccessToken();
            if (!accessToken) return null;

            const response = await this.client.get(`/users/me/messages/${encodeURIComponent(messageId)}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            const msg = response.data;
            const headers = msg.payload?.headers || [];
            return {
                id: msg.id,
                from: headers.find((h: { name: string; value: string }) => h.name === 'From')?.value || '',
                to: headers.find((h: { name: string; value: string }) => h.name === 'To')?.value || '',
                subject: headers.find((h: { name: string; value: string }) => h.name === 'Subject')?.value || '',
                body: this.extractBody(msg),
                date: new Date(parseInt(msg.internalDate)),
                threadId: msg.threadId,
                labels: msg.labelIds || [],
                read: !(msg.labelIds as string[] | undefined)?.includes('UNREAD'),
            };
        } catch (error) {
            return null;
        }
    }

    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            const token = await this.getAccessToken();
            if (!token) return false;

            // FIXED: use Buffer for proper Unicode base64 encoding
            const raw = Buffer.from(
                `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
            ).toString('base64url');

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
            if (!token) return 0;

            const response = await this.client.get(`/users/me/messages/${encodeURIComponent(emailId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const history = response.data.history || [];
            return history.filter((h: { labelsAdded?: unknown[] }) =>
                h.labelsAdded?.some((l: { labelId: string }) => l.labelId === 'IMPORTANT')
            ).length;
        } catch (error) {
            return 0;
        }
    }

    async getEmailSequenceProspects(_sequenceId: string): Promise<string[]> {
        return [];
    }

    // FIXED: proper base64 decoding for UTF-8
    private extractBody(msg: { payload?: { parts?: Array<{ mimeType: string; body?: { data?: string } }> }; snippet?: string }): string {
        const parts = msg.payload?.parts || [];
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }
        return msg.snippet || '';
    }
}
