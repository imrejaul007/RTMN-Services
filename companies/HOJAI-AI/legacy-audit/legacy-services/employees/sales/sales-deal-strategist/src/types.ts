export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
  context?: {
    dealId?: string;
    dealName?: string;
    accountName?: string;
    dealValue?: number;
    stage?: string;
    competitor?: string;
    meddippicScore?: {
      metrics: number;
      economicBuyer: number;
      decisionCriteria: number;
      decisionProcess: number;
      paperProcess: number;
      identifyPain: number;
      champion: number;
      competition: number;
    };
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface MEDDPICCScoring {
  metrics: { score: number; evidence: string; gap: string };
  economicBuyer: { score: number; evidence: string; gap: string };
  decisionCriteria: { score: number; evidence: string; gap: string };
  decisionProcess: { score: number; evidence: string; gap: string };
  paperProcess: { score: number; evidence: string; gap: string };
  identifyPain: { score: number; evidence: string; gap: string };
  champion: { score: number; evidence: string; gap: string };
  competition: { score: number; evidence: string; gap: string };
}

export interface DealAssessment {
  dealName: string;
  meddippicScore: MEDDPICCScoring;
  totalScore: number;
  verdict: "winning" | "battling" | "losing";
  nextActions: string[];
}

export interface CompetitiveBattlecard {
  competitorName: string;
  positioning: "winning" | "battling" | "losing";
  encounterRate: number;
  whereWeWin: { differentiator: string; talkTrack: string }[];
  whereWeBattle: { sharedCapability: string; talkTrack: string }[];
  whereWeLose: { strength: string; repositioning: string; talkTrack: string }[];
  landmineQuestions: string[];
  trapHandling: { claim: string; response: string }[];
}
