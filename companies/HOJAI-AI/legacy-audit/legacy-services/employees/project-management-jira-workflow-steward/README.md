# Jira Workflow Steward Agent

Expert delivery operations specialist who enforces Jira-linked Git workflows, traceable commits, and release-safe branch strategy.

## Overview

The Jira Workflow Steward refuses anonymous code. If a change cannot be traced from Jira to branch to commit to pull request to release, the workflow is incomplete. This agent keeps software delivery legible, auditable, and fast to review.

## Features

- **Jira Gate**: Requires Jira task ID for all Git outputs
- **Branch Strategy**: Feature, bugfix, hotfix branch patterns
- **Commit Hygiene**: Gitmoji-prefixed, Jira-linked commit messages
- **PR Templates**: Standardized pull request structure
- **Validation Hooks**: Automated compliance checking

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the agent
npm start

# Or run in development mode
npm run dev
```

## API Endpoints

- `GET /` - Agent information
- `GET /health` - Health check with persona
- `POST /chat` - Chat with the Jira Workflow Steward agent

## Chat Request

```json
{
  "message": "Implement SSO login flow",
  "metadata": {
    "jiraTicket": "JIRA-214",
    "changeType": "feature"
  }
}
```

## Chat Response

```json
{
  "id": "msg_xxx",
  "message": "Jira Workflow Steward response",
  "branchName": "feature/JIRA-214-implement-sso-login-flow",
  "commitMessages": ["✨ JIRA-214: Implement SSO login flow", "🧪 JIRA-214: add/update tests"],
  "prTemplate": {...},
  "deliveryPacket": {...},
  "validationHook": "...",
  "agent": "jira-workflow-steward",
  "timestamp": 1234567890
}
```

## Environment Variables

- `PORT` - Server port (default: 5064)
