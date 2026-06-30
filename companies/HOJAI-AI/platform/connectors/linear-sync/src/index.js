/**
 * Linear Sync Connector
 * Linear issue tracking integration
 */

class LinearConnector {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = 'https://api.linear.app/graphql';
  }

  async query(query, variables = {}) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });
    return res.json();
  }

  // Issues
  async createIssue(input) {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue { id title state { name }
        }
      }
    `;
    return this.query(mutation, { input });
  }

  async listIssues(filter = {}) {
    const query = `
      query ListIssues($filter: IssueFilterInput) {
        issues(filter: $filter) {
          nodes { id title description state { name } priority label { name }
        }
      }
    `;
    return this.query(query, { filter });
  }

  // Projects
  async listProjects() {
    const query = `query { projects { nodes { id name icon color } }`;
    return this.query(query);
  }

  // Teams
  async listTeams() {
    const query = `query { teams { nodes { id name key } }`;
    return this.query(query);
  }

  // Sync workflow
  async syncFromJira(jiraIssue) {
    // Create Linear issue from Jira issue
    return this.createIssue({
      teamId: jiraIssue.teamId,
      title: jiraIssue.summary,
      description: jiraIssue.description,
      labelId: jiraIssue.priority
    });
  }
}

module.exports = LinearConnector;
