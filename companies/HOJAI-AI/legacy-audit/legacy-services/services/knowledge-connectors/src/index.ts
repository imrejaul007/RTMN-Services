/**
 * Enterprise Knowledge Connectors
 *
 * SaaS data source connectors for Glean competitor
 * Integrates with: Notion, Confluence, Slack, Google Drive, SharePoint, Salesforce
 */

import axios from 'axios';

interface ConnectorConfig {
  source: 'notion' | 'confluence' | 'slack' | 'google_drive' | 'sharepoint' | 'salesforce';
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    domain?: string;
    siteUrl?: string;
  };
  workspaceId?: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    author?: string;
    tags?: string[];
    permissions?: string[];
    workspaceId?: string;
  };
}

interface SearchResult {
  documents: Document[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export class KnowledgeConnectors {
  private connectors: Map<string, ConnectorConfig> = new Map();

  /**
   * Register a new connector
   */
  registerConnector(id: string, config: ConnectorConfig): void {
    this.connectors.set(id, config);
  }

  /**
   * Sync all documents from a connector
   */
  async syncConnector(connectorId: string): Promise<Document[]> {
    const config = this.connectors.get(connectorId);
    if (!config) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    switch (config.source) {
      case 'notion':
        return this.syncNotion(config);
      case 'confluence':
        return this.syncConfluence(config);
      case 'slack':
        return this.syncSlack(config);
      case 'google_drive':
        return this.syncGoogleDrive(config);
      case 'sharepoint':
        return this.syncSharePoint(config);
      case 'salesforce':
        return this.syncSalesforce(config);
      default:
        throw new Error(`Unknown source: ${config.source}`);
    }
  }

  /**
   * Search across all connectors
   */
  async search(query: string, options: {
    connectors?: string[];
    limit?: number;
    offset?: number;
    filters?: {
      source?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      author?: string;
      tags?: string[];
    };
  } = {}): Promise<SearchResult> {
    const { connectors, limit = 20, offset = 0, filters } = options;

    const connectorIds = connectors || Array.from(this.connectors.keys());
    const documents: Document[] = [];

    // Search each connector
    const promises = connectorIds.map(async (connectorId) => {
      try {
        const docs = await this.searchConnector(connectorId, query, filters);
        documents.push(...docs);
      } catch (error) {
        console.error(`Search failed for ${connectorId}:`, error);
      }
    });

    await Promise.all(promises);

    // Sort by relevance (simple keyword match for now)
    documents.sort((a, b) => {
      const aScore = this.calculateRelevance(a, query);
      const bScore = this.calculateRelevance(b, query);
      return bScore - aScore;
    });

    return {
      documents: documents.slice(offset, offset + limit),
      totalCount: documents.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit
    };
  }

  /**
   * Search within a specific connector
   */
  private async searchConnector(
    connectorId: string,
    query: string,
    filters?: any
  ): Promise<Document[]> {
    const config = this.connectors.get(connectorId);
    if (!config) return [];

    // Each connector implements its own search
    // This would typically call the connector's search API
    return [];
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(doc: Document, query: string): number {
    const keywords = query.toLowerCase().split(' ');
    const content = doc.content.toLowerCase();
    const title = doc.title.toLowerCase();

    let score = 0;

    for (const keyword of keywords) {
      // Title match is worth more
      if (title.includes(keyword)) score += 10;
      // Content match
      if (content.includes(keyword)) score += 1;
      // Count occurrences
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 0.5;
    }

    return score;
  }

  // ==================== NOTION ====================

  private async syncNotion(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    // Notion API integration
    // https://api.notion.com/v1/

    const headers = {
      'Authorization': `Bearer ${config.credentials.accessToken}`,
      'Notion-Version': '2022-06-28'
    };

    // Search databases
    const searchResponse = await axios.post(
      'https://api.notion.com/v1/search',
      { query: '' },
      { headers }
    );

    for (const page of searchResponse.data.results) {
      // Fetch page content
      const blocksResponse = await axios.get(
        `https://api.notion.com/v1/blocks/${page.id}/children`,
        { headers }
      );

      const content = this.extractNotionContent(blocksResponse.data.results);

      documents.push({
        id: page.id,
        title: page.properties?.title?.[0]?.plain_text || 'Untitled',
        content,
        url: page.url,
        source: 'notion',
        createdAt: new Date(page.created_time),
        updatedAt: new Date(page.last_edited_time),
        metadata: {
          author: page.created_by?.name,
          workspaceId: config.workspaceId
        }
      });
    }

    return documents;
  }

  private extractNotionContent(blocks: any[]): string {
    return blocks
      .map((block: any) => {
        if (block.type === 'paragraph') {
          return block.paragraph?.rich_text?.[0]?.plain_text || '';
        }
        if (block.type === 'heading_1') {
          return '# ' + (block.heading_1?.rich_text?.[0]?.plain_text || '');
        }
        if (block.type === 'heading_2') {
          return '## ' + (block.heading_2?.rich_text?.[0]?.plain_text || '');
        }
        if (block.type === 'bulleted_list_item') {
          return '- ' + (block.bulleted_list_item?.rich_text?.[0]?.plain_text || '');
        }
        return '';
      })
      .join('\n');
  }

  // ==================== CONFLUENCE ====================

  private async syncConfluence(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    const baseUrl = config.credentials.siteUrl || 'https://your-domain.atlassian.net';
    const headers = {
      'Authorization': `Basic ${Buffer.from(
        config.credentials.apiKey + ':' + config.credentials.apiKey
      ).toString('base64')}`,
      'Content-Type': 'application/json'
    };

    // Search pages
    const searchResponse = await axios.post(
      `${baseUrl}/wiki/rest/api/content/search`,
      {
        cql: `type=page AND space.key=${config.workspaceId}`,
        limit: 50
      },
      { headers }
    );

    for (const page of searchResponse.data.results) {
      // Fetch page body
      const pageResponse = await axios.get(
        `${baseUrl}/wiki/rest/api/content/${page.id}`,
        {
          headers,
          params: { expand: 'body.storage' }
        }
      );

      documents.push({
        id: page.id,
        title: page.title,
        content: pageResponse.data.body?.storage?.value || '',
        url: `${baseUrl}/wiki${page._links.webui}`,
        source: 'confluence',
        createdAt: new Date(page.history?.createdDate),
        updatedAt: new Date(page.version.when),
        metadata: {
          author: page.history?.createdBy?.displayName,
          workspaceId: config.workspaceId
        }
      });
    }

    return documents;
  }

  // ==================== SLACK ====================

  private async syncSlack(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    // Slack search
    // Note: Slack's search API is limited, this would typically use a third-party tool
    // like Seismic, Guru, or EdCast for better Slack integration

    return documents;
  }

  // ==================== GOOGLE DRIVE ====================

  private async syncGoogleDrive(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    const headers = {
      'Authorization': `Bearer ${config.credentials.accessToken}`
    };

    // Search files
    const searchResponse = await axios.get(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers,
        params: {
          q: `mimeType contains 'document' or mimeType contains 'spreadsheet'`,
          spaces: 'drive',
          fields: 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink)'
        }
      }
    );

    for (const file of searchResponse.data.files || []) {
      documents.push({
        id: file.id,
        title: file.name,
        content: '', // Would need to fetch separately with /export link
        url: file.webViewLink,
        source: 'google_drive',
        createdAt: new Date(file.createdTime),
        updatedAt: new Date(file.modifiedTime),
        metadata: {
          workspaceId: config.workspaceId
        }
      });
    }

    return documents;
  }

  // ==================== SHAREPOINT ====================

  private async syncSharePoint(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    const siteUrl = config.credentials.siteUrl;
    const headers = {
      'Authorization': `Bearer ${config.credentials.accessToken}`,
      'Accept': 'application/json;odata=verbose'
    };

    // Search SharePoint
    const searchResponse = await axios.post(
      `${siteUrl}/_api/search/query`,
      {
        querytext: '*',
        rowlimit: 50,
        sourceid: 'b09a7990-05ea-4af9-9129-eb8259d8da6d' // SharePoint Results
      },
      { headers }
    );

    const results = searchResponse.data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results;

    for (const row of results) {
      const cells = row.Cells.results;
      const getCell = (name: string) => cells.find((c: any) => c.Key === name)?.Value;

      documents.push({
        id: getCell('UniqueId'),
        title: getCell('Title') || 'Untitled',
        content: getCell('HitHighlightedSummary') || '',
        url: getCell('Path'),
        source: 'sharepoint',
        createdAt: new Date(getCell('Created') || Date.now()),
        updatedAt: new Date(getCell('Write') || Date.now()),
        metadata: {
          workspaceId: config.workspaceId
        }
      });
    }

    return documents;
  }

  // ==================== SALESFORCE ====================

  private async syncSalesforce(config: ConnectorConfig): Promise<Document[]> {
    const documents: Document[] = [];

    const instanceUrl = config.credentials.domain;
    const headers = {
      'Authorization': `Bearer ${config.credentials.accessToken}`,
      'Content-Type': 'application/json'
    };

    // Query knowledge articles
    const articlesResponse = await axios.get(
      `${instanceUrl}/services/data/v58.0/query`,
      {
        headers,
        params: {
          q: 'SELECT Id, Title, Body, LastModifiedDate FROM KnowledgeArticleVersion WHERE PublishStatus = \'Online\''
        }
      }
    );

    for (const article of articlesResponse.data.records) {
      documents.push({
        id: article.Id,
        title: article.Title,
        content: article.Body || '',
        url: `${instanceUrl}/articles/knowledge/${article.Id}`,
        source: 'salesforce',
        createdAt: new Date(),
        updatedAt: new Date(article.LastModifiedDate),
        metadata: {
          workspaceId: config.workspaceId
        }
      });
    }

    // Also sync Cases and Opportunities for context
    const casesResponse = await axios.get(
      `${instanceUrl}/services/data/v58.0/query`,
      {
        headers,
        params: {
          q: 'SELECT Id, Subject, Description, Status FROM Case LIMIT 50'
        }
      }
    );

    for (const caseRecord of casesResponse.data.records) {
      documents.push({
        id: caseRecord.Id,
        title: `Case: ${caseRecord.Subject}`,
        content: caseRecord.Description || '',
        url: `${instanceUrl}/lightning/r/Case/${caseRecord.Id}/view`,
        source: 'salesforce',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          tags: [caseRecord.Status],
          workspaceId: config.workspaceId
        }
      });
    }

    return documents;
  }

  // ==================== OAUTH HELPERS ====================

  /**
   * Generate OAuth URL for a connector
   */
  getOAuthUrl(connectorType: string): string {
    switch (connectorType) {
      case 'notion':
        return 'https://api.notion.com/v1/oauth/authorize?' +
          `client_id=${process.env.NOTION_CLIENT_ID}` +
          `&response_type=code` +
          `&owner=user`;

      case 'google_drive':
        return 'https://accounts.google.com/o/oauth2/v2/auth?' +
          `client_id=${process.env.GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}` +
          `&response_type=code` +
          `&scope=https://www.googleapis.com/auth/drive.readonly`;

      case 'salesforce':
        return `${process.env.SALESFORCE_DOMAIN}/services/oauth2/authorize?` +
          `client_id=${process.env.SALESFORCE_CLIENT_ID}` +
          `&redirect_uri=${process.env.SALESFORCE_REDIRECT_URI}` +
          `&response_type=code`;

      default:
        throw new Error(`OAuth not supported for ${connectorType}`);
    }
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeOAuthCode(
    connectorType: string,
    code: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    switch (connectorType) {
      case 'notion':
        const notionResponse = await axios.post(
          'https://api.notion.com/v1/oauth/token',
          {
            grant_type: 'authorization_code',
            code,
            client_id: process.env.NOTION_CLIENT_ID,
            client_secret: process.env.NOTION_CLIENT_SECRET
          }
        );
        return {
          accessToken: notionResponse.data.access_token,
          refreshToken: notionResponse.data.refresh_token,
          expiresIn: notionResponse.data.expires_in
        };

      case 'google_drive':
        const googleResponse = await axios.post(
          'https://oauth2.googleapis.com/token',
          {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
          }
        );
        return {
          accessToken: googleResponse.data.access_token,
          refreshToken: googleResponse.data.refresh_token,
          expiresIn: googleResponse.data.expires_in
        };

      default:
        throw new Error(`OAuth not supported for ${connectorType}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    connectorType: string,
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    switch (connectorType) {
      case 'google_drive':
        const googleResponse = await axios.post(
          'https://oauth2.googleapis.com/token',
          {
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token'
          }
        );
        return {
          accessToken: googleResponse.data.access_token,
          expiresIn: googleResponse.data.expires_in
        };

      default:
        throw new Error(`Refresh not supported for ${connectorType}`);
    }
  }
}

export default KnowledgeConnectors;


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-connectors',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
