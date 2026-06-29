/**
 * Multi-Agent Voice Types
 */

export type AgentType =
  | "personal" | "company" | "department"
  | "sales" | "marketing" | "finance" | "operations"
  | "supplier" | "merchant" | "logistics";

export interface VoiceAgent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  endpoint?: string;
  active: boolean;
}

export interface VoiceCommand {
  id: string;
  text: string;
  userId: string;
  intent: string;
  targetAgents: AgentType[];
  priority: "low" | "medium" | "high";
  deadline?: Date;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  status: "success" | "pending" | "failed";
  confidence: number;
  actions?: string[];
}

export interface OrchestratedResponse {
  id: string;
  responses: AgentResponse[];
  summary: string;
  totalConfidence: number;
}