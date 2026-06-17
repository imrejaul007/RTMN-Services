export interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  metadata?: Record<string, unknown>;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  department?: string;
}

export interface ChatSession {
  id: string;
  status: 'active' | 'waiting' | 'ended';
  agent?: Agent;
  startedAt: number;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

export interface ChatConfig {
  apiUrl: string;
  wsUrl?: string;
  apiKey?: string;
  businessId: string;
  widgetId?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: ChatTheme;
  greeting?: string;
 AgentTransfer?: AgentTransferConfig;
  AIResponses?: AIResponsesConfig;
  fileUpload?: FileUploadConfig;
  metadata?: Record<string, string>;
}

export interface ChatTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontColor?: string;
  backgroundColor?: string;
  launcherColor?: string;
  borderRadius?: number;
}

export interface AgentTransferConfig {
  enabled: boolean;
  departments?: string[];
  autoTransfer?: boolean;
  transferMessage?: string;
}

export interface AIResponsesConfig {
  enabled: boolean;
  botName?: string;
  botAvatar?: string;
  placeholder?: string;
  similarityThreshold?: number;
  fallbackMessage?: string;
}

export interface FileUploadConfig {
  enabled: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}

export interface TypingIndicator {
  isTyping: boolean;
  sender: 'bot' | 'agent';
  senderName?: string;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'agent_joined' | 'agent_left' | 'session_update' | 'ping' | 'pong';
  payload: unknown;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export type EventCallback<T = unknown> = (data: T) => void;

export interface ChatWidgetEvents {
  'message:send': (message: ChatMessage) => void;
  'message:receive': (message: ChatMessage) => void;
  'message:status': (data: { messageId: string; status: ChatMessage['status'] }) => void;
  'typing:start': (indicator: TypingIndicator) => void;
  'typing:stop': () => void;
  'agent:joined': (agent: Agent) => void;
  'agent:left': (agent: Agent) => void;
  'session:started': (session: ChatSession) => void;
  'session:ended': (session: ChatSession) => void;
  'transfer:request': (department?: string) => void;
  'transfer:success': (agent: Agent) => void;
  'file:upload': (attachment: Attachment) => void;
  'file:error': (error: APIError) => void;
  'error': (error: APIError) => void;
  'ready': () => void;
  'open': () => void;
  'close': () => void;
}
