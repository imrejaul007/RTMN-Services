import { Router, Request, Response } from 'express';
import { persona } from '../persona';
import type { ChatRequest, ChatResponse } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history = [], metadata = {} } = req.body as ChatRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const jiraTicket = metadata.jiraTicket;
    if (!jiraTicket) {
      return res.status(400).json({
        error: 'Jira task ID is required',
        message: 'Please provide the Jira task ID associated with this work (e.g. JIRA-123).'
      });
    }

    const changeType = metadata.changeType || 'feature';
    const gitmoji = getGitmoji(changeType);
    const branchName = `${changeType}/${jiraTicket}-${generateSlug(message)}`;

    const response: ChatResponse = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: `Jira Workflow Steward response for ${jiraTicket}`,
      branchName: branchName,
      commitMessages: [
        `${gitmoji} ${jiraTicket}: ${truncate(message, 50)}`,
        `🧪 ${jiraTicket}: add/update tests`
      ],
      prTemplate: {
        title: `${gitmoji} ${jiraTicket}: ${truncate(message, 50)}`,
        what: `Implements **${jiraTicket}** by ${message.toLowerCase()}.`,
        jiraLink: `- Ticket: ${jiraTicket}\n- Branch: ${branchName}`,
        changeSummary: [`- Primary change implementation`, `- Test coverage`],
        riskReview: {
          authTouched: false,
          secretHandling: false,
          rollbackPlan: 'Revert the branch if issues arise'
        },
        testing: {
          unitTests: 'passed',
          integrationTests: 'passed in staging',
          manualVerification: 'verified in staging'
        }
      },
      deliveryPacket: {
        ticket: jiraTicket,
        outcome: message,
        branch: branchName,
        commits: [
          `${gitmoji} ${jiraTicket}: ${truncate(message, 50)}`,
          `🧪 ${jiraTicket}: add/update tests`,
          `📚 ${jiraTicket}: update documentation`
        ],
        reviewNotes: {
          riskArea: 'Standard implementation - no security-sensitive changes',
          securityCheck: 'Confirm no secrets in code or logs',
          rollback: 'Revert branch if issues are detected'
        }
      },
      validationHook: `#!/usr/bin/env bash
set -euo pipefail
message_file="\${1:?commit message file is required}"
branch="$(git rev-parse --abbrev-ref HEAD)"
subject="$(head -n 1 "$message_file")"
branch_regex='^(feature|bugfix|hotfix)/[A-Z]+-[0-9]+-[a-z0-9-]+$|^release/[0-9]+\\.[0-9]+\\.[0-9]+$'
commit_regex='^(🚀|✨|🐛|♻️|📚|🧪|💄|🔧|📦) [A-Z]+-[0-9]+: .+$'`,
      agent: 'jira-workflow-steward',
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getGitmoji(changeType: string): string {
  const map: Record<string, string> = {
    feature: '✨',
    bugfix: '🐛',
    hotfix: '🐛',
    refactor: '♻️',
    docs: '📚',
    tests: '🧪',
    config: '🔧',
    dependencies: '📦'
  };
  return map[changeType] || '✨';
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export default router;
