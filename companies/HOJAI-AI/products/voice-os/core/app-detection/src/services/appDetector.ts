/**
 * App Detection Service
 * ===================
 * Detects active app and provides context-aware commands.
 */

import type { AppContext, AppCategory, AppAction, InlineCommand, DetectedIntent } from '../types/index.js';

// App registry with known apps and their capabilities
const APP_REGISTRY: Record<string, { name: string; category: AppCategory; actions: Omit<AppAction, 'id'>[] }> = {
  // Communication
  slack: {
    name: 'Slack',
    category: 'communication',
    actions: [
      { name: 'Send Message', command: 'send', voiceCommands: ['send', 'post', 'share'], requiresSelection: true },
      { name: 'Create Channel', command: 'create-channel', voiceCommands: ['create channel', 'new channel'], requiresSelection: false },
      { name: 'Set Status', command: 'set-status', voiceCommands: ['set status', 'update status'], requiresSelection: false },
      { name: 'Search Messages', command: 'search', voiceCommands: ['search', 'find'], requiresSelection: false },
    ],
  },
  discord: {
    name: 'Discord',
    category: 'communication',
    actions: [
      { name: 'Send Message', command: 'send', voiceCommands: ['send', 'post'], requiresSelection: true },
      { name: 'Join Voice', command: 'join-voice', voiceCommands: ['join voice', 'call'], requiresSelection: false },
    ],
  },
  messages: {
    name: 'Messages',
    category: 'communication',
    actions: [
      { name: 'Send Message', command: 'send', voiceCommands: ['send', 'reply'], requiresSelection: true },
      { name: 'New Conversation', command: 'new', voiceCommands: ['new message', 'text'], requiresSelection: false },
    ],
  },
  whatsapp: {
    name: 'WhatsApp',
    category: 'communication',
    actions: [
      { name: 'Send Message', command: 'send', voiceCommands: ['send', 'reply', 'message'], requiresSelection: true },
      { name: 'New Chat', command: 'new', voiceCommands: ['new chat', 'new message'], requiresSelection: false },
    ],
  },

  // Productivity
  notion: {
    name: 'Notion',
    category: 'productivity',
    actions: [
      { name: 'Create Page', command: 'create-page', voiceCommands: ['create page', 'new page'], requiresSelection: false },
      { name: 'Add to Page', command: 'add-content', voiceCommands: ['add', 'insert', 'append'], requiresSelection: true },
      { name: 'Search', command: 'search', voiceCommands: ['search', 'find'], requiresSelection: false },
    ],
  },
  slack_docs: {
    name: 'Google Docs',
    category: 'productivity',
    actions: [
      { name: 'Edit', command: 'edit', voiceCommands: ['edit', 'write', 'type'], requiresSelection: true },
      { name: 'Comment', command: 'comment', voiceCommands: ['comment', 'add note'], requiresSelection: true },
      { name: 'Share', command: 'share', voiceCommands: ['share', 'send'], requiresSelection: false },
    ],
  },

  // Commerce
  do_app: {
    name: 'DO App',
    category: 'commerce',
    actions: [
      { name: 'Order Food', command: 'order-food', voiceCommands: ['order', 'food', 'delivery'], requiresSelection: false },
      { name: 'Book Hotel', command: 'book-hotel', voiceCommands: ['book', 'hotel', 'stay'], requiresSelection: false },
      { name: 'Book Appointment', command: 'book-appointment', voiceCommands: ['appointment', 'book', 'schedule'], requiresSelection: false },
    ],
  },

  // Social
  twitter: {
    name: 'Twitter/X',
    category: 'social',
    actions: [
      { name: 'Tweet', command: 'tweet', voiceCommands: ['tweet', 'post', 'share'], requiresSelection: true },
      { name: 'Reply', command: 'reply', voiceCommands: ['reply', 'respond'], requiresSelection: true },
    ],
  },
  instagram: {
    name: 'Instagram',
    category: 'social',
    actions: [
      { name: 'Post', command: 'post', voiceCommands: ['post', 'share'], requiresSelection: true },
      { name: 'Story', command: 'story', voiceCommands: ['story', 'add to story'], requiresSelection: false },
    ],
  },

  // Development
  vscode: {
    name: 'VS Code',
    category: 'development',
    actions: [
      { name: 'Write Code', command: 'write', voiceCommands: ['write', 'code', 'create function'], requiresSelection: true },
      { name: 'Comment', command: 'comment', voiceCommands: ['comment', 'add note'], requiresSelection: true },
      { name: 'Git Commit', command: 'git-commit', voiceCommands: ['commit', 'git'], requiresSelection: false },
    ],
  },
  terminal: {
    name: 'Terminal',
    category: 'development',
    actions: [
      { name: 'Run Command', command: 'run', voiceCommands: ['run', 'execute', 'command'], requiresSelection: true },
      { name: 'Navigate', command: 'navigate', voiceCommands: ['cd', 'navigate', 'go to'], requiresSelection: false },
    ],
  },

  // Generic
  browser: {
    name: 'Browser',
    category: 'productivity',
    actions: [
      { name: 'Search', command: 'search', voiceCommands: ['search', 'google', 'find'], requiresSelection: true },
      { name: 'Open URL', command: 'open', voiceCommands: ['open', 'go to', 'navigate'], requiresSelection: false },
      { name: 'Bookmark', command: 'bookmark', voiceCommands: ['bookmark', 'save'], requiresSelection: false },
    ],
  },
  email: {
    name: 'Email',
    category: 'communication',
    actions: [
      { name: 'Compose', command: 'compose', voiceCommands: ['compose', 'new email', 'write'], requiresSelection: false },
      { name: 'Reply', command: 'reply', voiceCommands: ['reply', 'respond'], requiresSelection: true },
      { name: 'Forward', command: 'forward', voiceCommands: ['forward', 'send to'], requiresSelection: true },
    ],
  },
};

// Inline commands that work across apps
const INLINE_COMMANDS: InlineCommand[] = [
  { id: 'shorter', name: 'Make Shorter', aliases: ['shorter', 'concise', 'brief'], description: 'Shorten the text', appliesTo: ['productivity', 'communication', 'social'], execution: { type: 'transform', transform: 'shorter' } },
  { id: 'longer', name: 'Make Longer', aliases: ['longer', 'expand', 'elaborate'], description: 'Expand the text', appliesTo: ['productivity', 'communication'], execution: { type: 'transform', transform: 'longer' } },
  { id: 'formal', name: 'Make Formal', aliases: ['formal', 'professional', 'business'], description: 'Make text more formal', appliesTo: ['communication', 'productivity'], execution: { type: 'transform', transform: 'formal' } },
  { id: 'casual', name: 'Make Casual', aliases: ['casual', 'relaxed', 'friendly'], description: 'Make text more casual', appliesTo: ['communication', 'social'], execution: { type: 'transform', transform: 'casual' } },
  { id: 'grammar', name: 'Fix Grammar', aliases: ['grammar', 'fix', 'correct'], description: 'Fix grammar and spelling', appliesTo: ['productivity', 'communication', 'development'], execution: { type: 'transform', transform: 'fix_grammar' } },
  { id: 'emoji', name: 'Add Emoji', aliases: ['emoji', 'emojis', 'add emoji'], description: 'Add relevant emojis', appliesTo: ['social', 'communication'], execution: { type: 'transform', transform: 'add_emoji' } },
  { id: 'translate', name: 'Translate', aliases: ['translate', 'in spanish', 'in hindi'], description: 'Translate the text', appliesTo: ['communication', 'social'], execution: { type: 'transform', transform: 'translate' } },
  { id: 'summarize', name: 'Summarize', aliases: ['summarize', 'summary', 'tl;dr'], description: 'Summarize the text', appliesTo: ['productivity', 'communication'], execution: { type: 'transform', transform: 'shorter' } },
  { id: 'reply', name: 'Draft Reply', aliases: ['reply', 'respond', 'draft'], description: 'Draft a reply', appliesTo: ['communication', 'social'], execution: { type: 'action' } },
];

export class AppDetector {
  /**
   * Get app context from detected app ID
   */
  getAppContext(appId: string, additionalContext?: Partial<AppContext>): AppContext {
    const app = APP_REGISTRY[appId] || APP_REGISTRY.browser;
    const now = new Date().toISOString();

    const actions: AppAction[] = app.actions.map((action, index) => ({
      ...action,
      id: `${appId}-${action.command}-${index}`,
    }));

    return {
      appId,
      appName: app.name,
      appCategory: app.category,
      availableActions: actions,
      timestamp: now,
      ...additionalContext,
    };
  }

  /**
   * Detect app from window title or URL
   */
  detectAppFromTitle(title: string): string {
    const titleLower = title.toLowerCase();

    // Communication apps
    if (titleLower.includes('slack')) return 'slack';
    if (titleLower.includes('discord')) return 'discord';
    if (titleLower.includes('whatsapp')) return 'whatsapp';
    if (titleLower.includes('messages') || titleLower.includes('imessage')) return 'messages';
    if (titleLower.includes('mail') || titleLower.includes('gmail') || titleLower.includes('outlook')) return 'email';

    // Productivity
    if (titleLower.includes('notion')) return 'notion';
    if (titleLower.includes('docs') || titleLower.includes('google docs')) return 'slack_docs';
    if (titleLower.includes('docs')) return 'slack_docs';

    // Social
    if (titleLower.includes('twitter') || titleLower.includes('x.com')) return 'twitter';
    if (titleLower.includes('instagram') || titleLower.includes('ig:')) return 'instagram';
    if (titleLower.includes('linkedin')) return 'twitter'; // similar flow

    // Development
    if (titleLower.includes('visual studio') || titleLower.includes('vs code') || titleLower.includes('code')) return 'vscode';
    if (titleLower.includes('terminal') || titleLower.includes('iterm') || titleLower.includes('command')) return 'terminal';

    // Default to browser
    return 'browser';
  }

  /**
   * Get all available inline commands for an app category
   */
  getInlineCommands(category: AppCategory): InlineCommand[] {
    return INLINE_COMMANDS.filter(cmd => cmd.appliesTo.includes(category));
  }

  /**
   * Detect inline command from voice input
   */
  detectInlineCommand(input: string, category: AppCategory): InlineCommand | null {
    const inputLower = input.toLowerCase().trim();
    const commands = this.getInlineCommands(category);

    for (const cmd of commands) {
      for (const alias of cmd.aliases) {
        if (inputLower.includes(alias) || inputLower.startsWith(alias)) {
          return cmd;
        }
      }
    }

    return null;
  }

  /**
   * Detect app action from voice input
   */
  detectAppAction(input: string, appId: string): AppAction | null {
    const app = APP_REGISTRY[appId];
    if (!app) return null;

    const inputLower = input.toLowerCase();

    for (const action of app.actions) {
      for (const voiceCmd of action.voiceCommands) {
        if (inputLower.includes(voiceCmd) || inputLower.startsWith(voiceCmd)) {
          return {
            ...action,
            id: `${appId}-${action.command}-detected`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Process voice input with app context
   */
  processVoiceInput(
    input: string,
    appId: string,
    selectedText?: string
  ): {
    type: 'app_action' | 'inline_command' | 'general';
    action?: AppAction;
    inlineCommand?: InlineCommand;
    requiresSelection: boolean;
    targetText?: string;
  } {
    // First check for inline commands
    const category = APP_REGISTRY[appId]?.category || 'productivity';
    const inlineCmd = this.detectInlineCommand(input, category);

    if (inlineCmd) {
      return {
        type: 'inline_command',
        inlineCommand: inlineCmd,
        requiresSelection: inlineCmd.execution.type !== 'action',
        targetText: selectedText,
      };
    }

    // Then check for app-specific actions
    const appAction = this.detectAppAction(input, appId);

    if (appAction) {
      return {
        type: 'app_action',
        action: appAction,
        requiresSelection: appAction.requiresSelection,
        targetText: selectedText,
      };
    }

    // General voice input
    return {
      type: 'general',
      requiresSelection: false,
    };
  }

  /**
   * Get all supported apps
   */
  getSupportedApps(): { id: string; name: string; category: AppCategory }[] {
    return Object.entries(APP_REGISTRY).map(([id, app]) => ({
      id,
      name: app.name,
      category: app.category,
    }));
  }

  /**
   * Get app recommendations based on context
   */
  getRecommendations(context: string): { appId: string; reason: string }[] {
    const recs: { appId: string; reason: string }[] = [];
    const contextLower = context.toLowerCase();

    if (contextLower.includes('code') || contextLower.includes('programming')) {
      recs.push({ appId: 'vscode', reason: 'For coding tasks' });
      recs.push({ appId: 'terminal', reason: 'For command line' });
    }

    if (contextLower.includes('message') || contextLower.includes('team')) {
      recs.push({ appId: 'slack', reason: 'For team communication' });
    }

    if (contextLower.includes('document') || contextLower.includes('write')) {
      recs.push({ appId: 'slack_docs', reason: 'For document writing' });
    }

    if (contextLower.includes('food') || contextLower.includes('order')) {
      recs.push({ appId: 'do_app', reason: 'For ordering food' });
    }

    return recs;
  }
}
