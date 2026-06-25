/**
 * Voice Studio - In-memory store for voice agents
 */

import { v4 as uuidv4 } from 'uuid';

// Agent status
export const AgentStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error'
};

// STT Providers
export const STTProviders = {
  WHISPER: 'whisper',
  DEEPGRAM: 'deepgram',
  GOOGLE: 'google',
  SARVAM: 'sarvam'
};

// TTS Providers
export const TTSProviders = {
  ELEVENLABS: 'elevenlabs',
  CARTESIA: 'cartesia',
  GOOGLE: 'google',
  SARVAM: 'sarvam'
};

// Voice styles
export const VoiceStyles = {
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  CASUAL: 'casual',
  FORMAL: 'formal',
  CUSTOM: 'custom'
};

// In-memory stores
const agents = new Map();
const conversations = new Map();

// Seed with sample agents
function seedData() {
  const sampleAgents = [
    {
      id: 'agent-receptionist',
      name: 'AI Receptionist',
      description: 'Professional receptionist for offices and businesses',
      status: AgentStatus.ACTIVE,
      language: 'en-IN',
      voice: {
        provider: TTSProviders.ELEVENLABS,
        voiceId: 'rachel',
        style: VoiceStyles.PROFESSIONAL,
        speed: 1.0,
        pitch: 0
      },
      transcription: {
        provider: STTProviders.DEEPGRAM,
        language: 'en-IN',
        punctuate: true,
        smartFormatting: true
      },
      greeting: 'Hello, thank you for calling. How may I assist you today?',
      capabilities: ['call-screening', 'appointment', 'faq', 'transfer', 'voicemail'],
      fallbackMessage: 'I am not sure I understand. Let me transfer you to a human agent.',
      maxCallDuration: 600,
      recordings: true,
      analytics: true,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-06-01T14:30:00Z'
    },
    {
      id: 'agent-sales',
      name: 'Sales Agent',
      description: 'AI sales agent for product inquiries and lead capture',
      status: AgentStatus.ACTIVE,
      language: 'en-US',
      voice: {
        provider: TTSProviders.ELEVENLABS,
        voiceId: 'matt',
        style: VoiceStyles.FRIENDLY,
        speed: 1.0,
        pitch: 0
      },
      transcription: {
        provider: STTProviders.WHISPER,
        language: 'en-US',
        punctuate: true,
        smartFormatting: false
      },
      greeting: 'Hi there! Welcome to our company. Are you looking for anything specific today?',
      capabilities: ['product-info', 'pricing', 'lead-capture', 'appointment', 'callback'],
      fallbackMessage: 'Great question! Let me connect you with our sales team who can help.',
      maxCallDuration: 900,
      recordings: true,
      analytics: true,
      createdAt: '2026-02-20T09:00:00Z',
      updatedAt: '2026-05-15T11:00:00Z'
    },
    {
      id: 'agent-hotel',
      name: 'Hotel Concierge',
      description: 'AI concierge for hotel reservations and guest services',
      status: AgentStatus.ACTIVE,
      language: 'en',
      voice: {
        provider: TTSProviders.CARTESIA,
        voiceId: 'hotel-concierge',
        style: VoiceStyles.PROFESSIONAL,
        speed: 0.95,
        pitch: 0
      },
      transcription: {
        provider: STTProviders.DEEPGRAM,
        language: 'en',
        punctuate: true,
        smartFormatting: true
      },
      greeting: 'Good evening, this is your hotel concierge speaking. How may I make your stay more comfortable?',
      capabilities: ['reservations', 'room-service', 'concierge', 'check-in', 'Amenities-info'],
      fallbackMessage: 'I will be happy to assist you with that. Please hold while I connect you.',
      maxCallDuration: 1200,
      recordings: true,
      analytics: true,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-06-05T09:00:00Z'
    },
    {
      id: 'agent-restaurant',
      name: 'Restaurant Host',
      description: 'AI host for restaurant reservations and inquiries',
      status: AgentStatus.ACTIVE,
      language: 'en',
      voice: {
        provider: TTSProviders.ELEVENLABS,
        voiceId: 'emma',
        style: VoiceStyles.FRIENDLY,
        speed: 1.05,
        pitch: 0
      },
      transcription: {
        provider: STTProviders.WHISPER,
        language: 'en',
        punctuate: true,
        smartFormatting: true
      },
      greeting: 'Hello and welcome! Do you have a reservation with us today?',
      capabilities: ['reservations', 'waitlist', 'menu-info', 'special-requests', 'dietary'],
      fallbackMessage: 'Let me check on that for you. Please give me just a moment.',
      maxCallDuration: 300,
      recordings: true,
      analytics: true,
      createdAt: '2026-03-15T10:00:00Z',
      updatedAt: '2026-06-10T16:00:00Z'
    }
  ];

  for (const agent of sampleAgents) {
    agents.set(agent.id, agent);
  }
}

seedData();

// ── Agents ──────────────────────────────────────────────────────────────────

export function createAgent(data) {
  const id = data.id || uuidv4();
  const agent = {
    id,
    name: data.name || 'Untitled Agent',
    description: data.description || '',
    status: data.status || AgentStatus.DRAFT,
    language: data.language || 'en',
    voice: data.voice || {
      provider: TTSProviders.ELEVENLABS,
      voiceId: 'default',
      style: VoiceStyles.PROFESSIONAL,
      speed: 1.0,
      pitch: 0
    },
    transcription: data.transcription || {
      provider: STTProviders.WHISPER,
      language: 'en',
      punctuate: true,
      smartFormatting: false
    },
    greeting: data.greeting || 'Hello, how can I help you?',
    capabilities: data.capabilities || [],
    fallbackMessage: data.fallbackMessage || 'I am not sure how to help with that.',
    maxCallDuration: data.maxCallDuration || 600,
    recordings: data.recordings !== undefined ? data.recordings : true,
    analytics: data.analytics !== undefined ? data.analytics : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  agents.set(id, agent);
  return agent;
}

export function getAgent(id) {
  return agents.get(id) || null;
}

export function updateAgent(id, updates) {
  const agent = agents.get(id);
  if (!agent) return null;

  const updated = {
    ...agent,
    ...updates,
    id: agent.id, // Prevent ID change
    updatedAt: new Date().toISOString()
  };

  agents.set(id, updated);
  return updated;
}

export function deleteAgent(id) {
  return agents.delete(id);
}

export function listAgents({ status, search } = {}) {
  let results = Array.from(agents.values());

  if (status) {
    results = results.filter(a => a.status === status);
  }

  if (search) {
    const s = search.toLowerCase();
    results = results.filter(a =>
      a.name.toLowerCase().includes(s) ||
      a.description.toLowerCase().includes(s)
    );
  }

  return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getActiveAgents() {
  return Array.from(agents.values()).filter(a => a.status === AgentStatus.ACTIVE);
}

// ── Conversations ────────────────────────────────────────────────────────────

export function createConversation(data) {
  const id = uuidv4();
  const conversation = {
    id,
    agentId: data.agentId,
    phone: data.phone || null,
    status: 'active', // active, completed, failed
    duration: 0,
    transcript: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    metadata: data.metadata || {}
  };

  conversations.set(id, conversation);
  return conversation;
}

export function getConversation(id) {
  return conversations.get(id) || null;
}

export function addTranscriptEntry(conversationId, entry) {
  const conv = conversations.get(conversationId);
  if (!conv) return null;

  conv.transcript.push({
    ...entry,
    timestamp: new Date().toISOString()
  });

  conversations.set(conversationId, conv);
  return conv;
}

export function endConversation(id, { status = 'completed', duration = 0 } = {}) {
  const conv = conversations.get(id);
  if (!conv) return null;

  conv.status = status;
  conv.duration = duration;
  conv.endedAt = new Date().toISOString();

  conversations.set(id, conv);
  return conv;
}

export function listConversations({ agentId, status, limit = 50 } = {}) {
  let results = Array.from(conversations.values());

  if (agentId) {
    results = results.filter(c => c.agentId === agentId);
  }

  if (status) {
    results = results.filter(c => c.status === status);
  }

  return results
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, limit);
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getStats() {
  const agentList = Array.from(agents.values());
  const convList = Array.from(conversations.values());

  return {
    totalAgents: agentList.length,
    activeAgents: agentList.filter(a => a.status === AgentStatus.ACTIVE).length,
    totalConversations: convList.length,
    activeConversations: convList.filter(c => c.status === 'active').length,
    completedConversations: convList.filter(c => c.status === 'completed').length,
    avgDuration: convList.length > 0
      ? Math.round(convList.reduce((sum, c) => sum + c.duration, 0) / convList.length)
      : 0
  };
}
