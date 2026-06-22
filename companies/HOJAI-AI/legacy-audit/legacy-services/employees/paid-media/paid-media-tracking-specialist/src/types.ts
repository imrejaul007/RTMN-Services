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
    platform?: "gtm" | "ga4" | "google-ads" | "meta" | "server-side";
    issue?: "discrepancy" | "setup" | "audit" | "migration";
  };
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface GTMContainer {
  name: string;
  workspaces: { name: string; changes: number }[];
  tags: { name: string; type: string; firing: string }[];
  triggers: { name: string; type: string }[];
  variables: { name: string; type: string }[];
}

export interface ConversionAction {
  name: string;
  platform: "google-ads" | "meta" | "linkedin";
  type: "primary" | "secondary";
  attributionModel?: string;
  valueEnabled?: boolean;
  countingMethod?: string;
}

export interface TrackingAudit {
  platform: string;
  eventsTracked: string[];
  eventsMissing: string[];
  discrepancies: {
    platform1: string;
    platform2: string;
    variance: number;
  }[];
  recommendations: string[];
}

export interface DataLayerSpec {
  event: string;
  ecommerce: {
    items?: { item_id: string; item_name: string; price: number; quantity: number }[];
    value?: number;
    currency?: string;
    transaction_id?: string;
  };
  userData?: {
    email?: string;
    phone?: string;
    address?: { city: string; state: string; country: string };
  };
}
