/**
 * HOJAI Agent SDK - Persona Utilities
 * Helper functions for working with agent personas
 */

import type { AgentPersona, PersonaSuccessMetrics } from './index.js';

/**
 * Parse a markdown persona file into an AgentPersona object
 * Used when loading personas from Agency Agents markdown files
 */
export function parsePersonaFromMarkdown(markdown: string): Partial<AgentPersona> {
  const result: Partial<AgentPersona> = {};

  // Extract frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const colorMatch = frontmatter.match(/color:\s*(.+)/);
    const emojiMatch = frontmatter.match(/emoji:\s*(.+)/);
    const vibeMatch = frontmatter.match(/vibe:\s*(.+)/);

    if (nameMatch) {
      result.identity = { name: nameMatch[1].trim(), role: '', personality: '', memory: '', experience: '' };
    }
    if (descMatch && result.identity) {
      result.identity.role = descMatch[1].trim();
    }
    if (colorMatch) result.color = colorMatch[1].trim();
    if (emojiMatch) result.emoji = emojiMatch[1].trim();
    if (vibeMatch) result.vibe = vibeMatch[1].trim();
  }

  // Extract sections
  const sections = markdown.split(/^## /m).slice(1);
  sections.forEach((section) => {
    const lines = section.split('\n');
    const title = lines[0].trim().toLowerCase();

    if (title.includes('identity') || title.includes('memory')) {
      result.identity = result.identity || { name: '', role: '', personality: '', memory: '', experience: '' };
      lines.slice(1).forEach((line) => {
        const match = line.match(/^\*\*(\w+)\*\*:\s*(.+)/);
        if (match) {
          const key = match[1].toLowerCase().replace(/\s+/g, '');
          const value = match[2].trim();
          if (key === 'role') result.identity!.role = value;
          if (key === 'personality') result.identity!.personality = value;
          if (key === 'memory') result.identity!.memory = value;
          if (key === 'experience') result.identity!.experience = value;
        }
      });
    }

    if (title.includes('core mission') || title.includes('your mission')) {
      result.coreMission = { primary: [] };
      const items = lines.slice(1).filter((l) => l.trim().startsWith('-')).map((l) => l.replace(/^-\s*/, '').trim());
      result.coreMission.primary = items;
    }

    if (title.includes('critical rules') || title.includes('rules')) {
      result.criticalRules = {};
      let currentRules: string[] = [];
      let currentCategory: string | null = null;
      lines.slice(1).forEach((line) => {
        if (line.trim().startsWith('### ')) {
          if (currentCategory && currentRules.length > 0) {
            result.criticalRules![currentCategory] = currentRules;
          }
          currentCategory = line.replace('### ', '').trim().toLowerCase().replace(/\s+/g, '');
          currentRules = [];
          result.criticalRules![currentCategory] = currentRules;
        } else if (line.trim().startsWith('-') && currentRules) {
          currentRules.push(line.replace(/^-\s*/, '').trim());
        }
      });
      if (currentCategory && currentRules.length > 0) {
        result.criticalRules![currentCategory] = currentRules;
      }
    }

    if (title.includes('workflow')) {
      result.workflows = [];
      const workflow: { name: string; steps: string[] } = { name: '', steps: [] };
      lines.slice(1).forEach((line) => {
        if (line.trim().startsWith('### ')) {
          if (workflow.name) result.workflows!.push(workflow);
          workflow.name = line.replace('### ', '').trim();
          workflow.steps = [];
        } else if (line.trim().startsWith('-')) {
          workflow.steps.push(line.replace(/^-\s*/, '').trim());
        }
      });
      if (workflow.name) result.workflows!.push(workflow);
    }

    if (title.includes('success metrics') || title.includes('metrics')) {
      result.successMetrics = {};
      lines.slice(1).forEach((line) => {
        const match = line.match(/^-\s*\*\*(.+?)\*\*:\s*(.+)/);
        if (match) {
          result.successMetrics![match[1].trim()] = match[2].trim();
        }
      });
    }

    if (title.includes('communication')) {
      result.communicationStyle = [];
      lines.slice(1).forEach((line) => {
        if (line.trim().startsWith('-')) {
          result.communicationStyle!.push(line.replace(/^-\s*/, '').trim());
        }
      });
    }
  });

  return result;
}

/**
 * Create a persona from an Agency Agents markdown file
 */
export function createPersonaFromMarkdown(name: string, markdown: string): AgentPersona {
  const parsed = parsePersonaFromMarkdown(markdown);

  return {
    identity: parsed.identity || {
      name,
      role: 'AI Agent',
      personality: 'Professional and capable',
      memory: 'Remembers context and preferences',
      experience: 'Expert in domain',
    },
    coreMission: parsed.coreMission || { primary: [] },
    criticalRules: parsed.criticalRules || {},
    technicalDeliverables: parsed.technicalDeliverables,
    workflows: parsed.workflows,
    communicationStyle: parsed.communicationStyle,
    learningAndMemory: parsed.learningAndMemory,
    successMetrics: parsed.successMetrics,
    advancedCapabilities: parsed.advancedCapabilities,
    vibe: parsed.vibe,
    emoji: parsed.emoji,
    color: parsed.color,
  };
}

/**
 * Format success metrics for display
 */
export function formatSuccessMetrics(metrics: PersonaSuccessMetrics | undefined): string {
  if (!metrics) return '';

  const lines: string[] = [];
  lines.push('### Success Metrics\n');

  Object.entries(metrics).forEach(([key, value]) => {
    lines.push(`- **${key}**: ${value}`);
  });

  return lines.join('\n');
}

/**
 * Get a summary of the persona for display
 */
export function getPersonaSummary(persona: AgentPersona): string {
  const lines: string[] = [];

  lines.push(`# ${persona.identity.name}`);
  lines.push('');
  lines.push(`**Role**: ${persona.identity.role}`);
  lines.push(`**Personality**: ${persona.identity.personality}`);
  lines.push('');

  if (persona.coreMission?.primary?.length) {
    lines.push('## Core Mission');
    persona.coreMission.primary.forEach((m) => lines.push(`- ${m}`));
    lines.push('');
  }

  if (persona.successMetrics) {
    lines.push('## Success Metrics');
    Object.entries(persona.successMetrics).forEach(([key, value]) => {
      lines.push(`- ${key}: ${value}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
