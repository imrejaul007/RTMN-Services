// Hojai Flow Types

export type FlowMode = 'flow' | 'ask' | 'remember' | 'execute' | 'delegate';

export interface FlowMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  mode: FlowMode;
  timestamp: Date;
  status: 'thinking' | 'done' | 'error';
}

export interface MemoryEntry {
  id: string;
  content: string;
  tier: 'l1_working' | 'l2_episodic' | 'l3_procedural' | 'l4_semantic' | 'l5_world';
  importance: number;
  createdAt: Date;
  source?: string;
  tags?: string[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'policy' | 'contact' | 'company' | 'product';
  source?: string;
  lastUpdated: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'requires_approval';
  action?: FlowAction;
  createdAt: Date;
  completedAt?: Date;
}

export interface FlowAction {
  type: 'send_message' | 'send_email' | 'create_meeting' | 'create_campaign' | 'schedule' | 'search' | 'remember';
  params: Record<string, unknown>;
  preview?: string;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  hotkey: string;
  language: string;
  style: 'professional' | 'casual' | 'friendly';
  privacy: {
    shareContext: boolean;
    learnFromInteractions: boolean;
  };
}

export interface FlowContext {
  mode: FlowMode;
  conversationHistory: FlowMessage[];
  activeMemory: MemoryEntry[];
  pendingTasks: Task[];
  userPreferences: UserPreferences;
}
