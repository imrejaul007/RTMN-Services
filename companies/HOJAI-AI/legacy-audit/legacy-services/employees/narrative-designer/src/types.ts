export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    genre?: string;
    engine?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  content: string;
  choices?: DialogueChoice[];
  nextNode?: string;
  condition?: string;
  audioCue?: string;
}

export interface DialogueChoice {
  text: string;
  nextNode: string;
  condition?: string;
  consequence?: string;
}

export interface CharacterVoice {
  id: string;
  name: string;
  role: string;
  coreWound: string;
  desire: string;
  need: string;
  voicePillars: {
    vocabulary: string;
    sentenceRhythm: string;
    topicsAvoided: string[];
    verbalTics: string[];
    subtextDefault: string;
  };
  referenceLines: string[];
}

export interface LoreEntry {
  id: string;
  tier: 1 | 2 | 3;
  title: string;
  content: string;
  location?: string;
  prerequisites?: string[];
}

export interface WorldBible {
  timeline: { event: string; date: string }[];
  factions: { name: string; goal: string; philosophy: string }[];
  rules: string[];
  bannedRetcons: string[];
}
