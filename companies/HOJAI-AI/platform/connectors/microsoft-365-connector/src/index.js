/**
 * Microsoft 365 Connector
 */
class Microsoft365Connector {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tenantId = config.tenantId;
  }

  // Graph API calls
  async graph(method, endpoint, body) {
    const token = await this.getToken();
    return fetch(`https://graph.microsoft.com/v1.0/${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    }).then(r => r.json());
  }

  // Teams
  async sendTeamsMessage(channel, message) {
    return this.graph('POST', 'teams/${channel}/messages', { body: { content: message } });
  }

  // Outlook
  async sendEmail(to, subject, body) {
    return this.graph('POST', 'me/sendMail', {
      message: { subject, toRecipients: [{ emailAddress: { address: to }], body: { content: body }
    });
  }

  // SharePoint
  async listFiles(siteId, folder) {
    return this.graph('GET', `sites/${siteId}/drive/root:/${folder}:/children`);
  }

  async getToken() {
    // OAuth2 client credentials flow
    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });
    const data = await res.json();
    return data.access_token;
  }
}

module.exports = Microsoft365Connector;
