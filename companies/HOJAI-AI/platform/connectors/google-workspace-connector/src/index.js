/**
 * Google Workspace Connector
 * Gmail, Calendar, Drive, Meet
 */
class GoogleWorkspaceConnector {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async request(endpoint, method = 'GET', body) {
    const token = await this.getToken();
    return fetch(`https://www.googleapis.com/${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    }).then(r => r.json());
  }

  // Gmail
  async listEmails(query = '', maxResults = 10) {
    return this.request(`gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
  }

  async sendEmail(to, subject, body) {
    const encoded = Buffer.from(
      `To: ${to}\nSubject: ${subject}\n\n${body}`
    ).toString('base64url');

    return this.request('gmail/v1/users/me/messages/send', 'POST', { raw: encoded });
  }

  // Calendar
  async createEvent(event) {
    return this.request('calendar/v3/calendars/primary/events', 'POST', event);
  }

  async listEvents(timeMin, timeMax) {
    return this.request(
      `calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`
    );
  }

  // Drive
  async listFiles(folderId) {
    return this.request(
      `drive/v3/files?q='${folderId}' in parents&fields=files(id,name,mimeType)`
    );
  }

  async uploadFile(name, content, mimeType) {
    const metadata = { name, mimeType };
    const form = new FormData();
    form.append('metadata', JSON.stringify(metadata));
    form.append('file', content);

    return fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await this.getToken()}`,
        body: form
      }
    ).then(r => r.json());
  }

  async getToken() {
    // OAuth2 flow - implement with google-auth-library
    return 'ACCESS_TOKEN';
  }
}

module.exports = GoogleWorkspaceConnector;
