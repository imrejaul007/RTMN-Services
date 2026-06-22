/**
 * Flow Store - Global state management
 *
 * Uses Zustand for simple, scalable state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface Persona {
  id: string;
  name: string;
  type: 'personal' | 'founder' | 'sales' | 'support' | 'hr';
  voiceStyle: string;
  isActive: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: Date;
}

export interface MemoryItem {
  id: string;
  tier: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  content: string;
  type: string;
}

export interface Action {
  id: string;
  title: string;
  type: string;
  status: 'suggested' | 'pending' | 'approved' | 'completed';
  createdAt: Date;
}

// ============================================================================
// STORE
// ============================================================================

interface FlowState {
  // User
  userId: string;
  setUserId: (id: string) => void;

  // Personas
  personas: Persona[];
  activePersona: Persona | null;
  setPersonas: (personas: Persona[]) => void;
  setActivePersona: (id: string) => void;

  // Voice
  isListening: boolean;
  isProcessing: boolean;
  setListening: (listening: boolean) => void;
  setProcessing: (processing: boolean) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // Memory
  memories: MemoryItem[];
  setMemories: (memories: MemoryItem[]) => void;
  addMemory: (memory: MemoryItem) => void;

  // Actions
  actions: Action[];
  setActions: (actions: Action[]) => void;
  updateAction: (id: string, updates: Partial<Action>) => void;

  // Settings
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;

  // Persistence
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  // User
  userId: 'default',
  setUserId: (id) => set({ userId: id }),

  // Personas
  personas: [],
  activePersona: null,
  setPersonas: (personas) => set({ personas }),
  setActivePersona: (id) => {
    const persona = get().personas.find((p) => p.id === id);
    set({ activePersona: persona || null });
  },

  // Voice
  isListening: false,
  isProcessing: false,
  setListening: (listening) => set({ isListening: listening }),
  setProcessing: (processing) => set({ isProcessing: processing }),

  // Messages
  messages: [],
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages.slice(-100), newMessage] }));
    get().persist();
  },
  clearMessages: () => set({ messages: [] }),

  // Memory
  memories: [],
  setMemories: (memories) => set({ memories }),
  addMemory: (memory) => {
    set((state) => ({ memories: [...state.memories, memory] }));
    get().persist();
  },

  // Actions
  actions: [],
  setActions: (actions) => set({ actions }),
  updateAction: (id, updates) => {
    set((state) => ({
      actions: state.actions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    get().persist();
  },

  // Settings
  ttsEnabled: true,
  setTtsEnabled: (enabled) => {
    set({ ttsEnabled: enabled });
    get().persist();
  },

  // Persistence
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem('flow_store');
      if (stored) {
        const data = JSON.parse(stored);
        set(data);
      }
    } catch (e) {
      console.error('[Store] Hydrate failed:', e);
    }
  },

  persist: async () => {
    try {
      const { userId, personas, memories, actions, ttsEnabled } = get();
      await AsyncStorage.setItem(
        'flow_store',
        JSON.stringify({ userId, personas, memories, actions, ttsEnabled })
      );
    } catch (e) {
      console.error('[Store] Persist failed:', e);
    }
  },
}));

// Hydrate on load
useFlowStore.getState().hydrate();
