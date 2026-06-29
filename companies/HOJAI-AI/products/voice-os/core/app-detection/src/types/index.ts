/**
 * App Detection Context Types
 * ==========================
 * Detects which app is active and provides context-aware commands.
 */

export interface AppContext {
  appId: string;
  appName: string;
  appCategory: AppCategory;
  windowTitle?: string;
  url?: string;
  focusedElement?: string;
  selectedText?: string;
  availableActions: AppAction[];
  timestamp: string;
}

export type AppCategory =
  | 'communication'
  | 'productivity'
  | 'social'
  | 'entertainment'
  | 'development'
  | 'commerce'
  | 'health'
  | 'finance'
  | 'travel'
  | 'food'
  | 'unknown';

export interface AppAction {
  id: string;
  name: string;
  command: string;
  voiceCommands: string[];
  requiresSelection: boolean;
  icon?: string;
}

export interface AppRegistry {
  [appId: string]: {
    name: string;
    category: AppCategory;
    actions: Omit<AppAction, 'id'>[];
  };
}

export interface DetectedIntent {
  appAction: AppAction;
  context: {
    selectedText?: string;
    targetContact?: string;
    targetChannel?: string;
  };
}

// App-specific commands
export interface InlineCommand {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  appliesTo: AppCategory[];
  execution: {
    type: 'transform' | 'action' | 'both';
    transform?: 'shorter' | 'longer' | 'formal' | 'casual' | 'fix_grammar' | 'add_emoji' | 'translate';
  };
}
