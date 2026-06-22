/**
 * GENIE Drive Connector - Google API Integration
 */
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('google-drive');

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4716/oauth/callback'
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/presentations.readonly',
      ],
    });
  }

  async getTokenFromCode(code: string): Promise<{ access_token: string; refresh_token: string; expiry_date: number }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return { access_token: tokens.access_token!, refresh_token: tokens.refresh_token!, expiry_date: tokens.expiry_date! };
  }

  setCredentials(accessToken: string, refreshToken: string, expiryDate: number): void {
    this.oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken, expiry_date: expiryDate });
  }

  async listFiles(query?: string, pageSize: number = 100): Promise<drive_v3.Schema$File[]> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const response = await drive.files.list({
      q: query || "trashed=false",
      pageSize,
      fields: 'files(id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink)',
    });
    return response.data.files || [];
  }

  async getFileContent(fileId: string): Promise<string | null> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    try {
      if (fileId.includes('document')) {
        const docs = google.docs({ version: 'v1', auth: this.oauth2Client });
        const doc = await docs.documents.get({ documentId: fileId });
        return doc.data.body?.content?.map((p: any) => p.paragraph?.elements?.map((e: any) => e.textRun?.content || '').join('') || '').join('\n') || '';
      }
      if (fileId.includes('spreadsheet')) {
        const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: fileId });
        return JSON.stringify(spreadsheet.data);
      }
      // For other files, just return metadata
      const meta = await drive.files.get({ fileId, fields: 'name,mimeType,size' });
      return JSON.stringify(meta.data);
    } catch (error) {
      logger.error('get_file_content_failed', { fileId, error });
      return null;
    }
  }

  getMimeTypeCategory(mimeType: string): 'document' | 'spreadsheet' | 'presentation' | 'folder' | 'other' {
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('slides')) return 'presentation';
    if (mimeType.includes('folder') || mimeType.includes('application/vnd.google-apps.folder')) return 'folder';
    return 'other';
  }

  buildQuery(settings: { sync_docs: boolean; sync_sheets: boolean; sync_slides: boolean }): string {
    const types: string[] = [];
    if (settings.sync_docs) types.push("mimeType contains 'document' or mimeType contains 'word'");
    if (settings.sync_sheets) types.push("mimeType contains 'spreadsheet' or mimeType contains 'excel'");
    if (settings.sync_slides) types.push("mimeType contains 'presentation' or mimeType contains 'slides'");
    return `(${types.join(' or ')}) and trashed=false`;
  }
}

let instance: GoogleDriveService | null = null;
export function getGoogleDriveService(): GoogleDriveService {
  if (!instance) instance = new GoogleDriveService();
  return instance;
}
