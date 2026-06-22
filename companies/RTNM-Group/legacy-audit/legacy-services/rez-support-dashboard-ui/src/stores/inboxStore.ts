import { create } from 'zustand';
import { api, Conversation, Analytics } from '@/lib/api';

interface InboxState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  channelFilter: string | null;
  statusFilter: string | null;
  analytics: Analytics | null;

  fetchConversations: (page?: number) => Promise<void>;
  selectConversation: (id: string | null) => void;
  sendReply: (content: string) => Promise<void>;
  setChannelFilter: (channel: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  fetchAnalytics: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  conversations: [],
  selectedConversation: null,
  total: 0,
  page: 1,
  loading: false,
  error: null,
  channelFilter: null,
  statusFilter: null,
  analytics: null,

  fetchConversations: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { channelFilter, statusFilter } = get();
      const data = await api.conversations.list({
        channel: channelFilter || undefined,
        status: statusFilter || undefined,
        page,
      });
      set({
        conversations: data.conversations,
        total: data.total,
        page,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  selectConversation: async (id) => {
    if (!id) {
      set({ selectedConversation: null });
      return;
    }
    try {
      const conversation = await api.conversations.get(id);
      set({ selectedConversation: conversation });
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  },

  sendReply: async (content) => {
    const { selectedConversation } = get();
    if (!selectedConversation) return;

    try {
      await api.conversations.reply(selectedConversation.id, content);
      await get().selectConversation(selectedConversation.id);
      await get().refresh();
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  },

  setChannelFilter: (channel) => {
    set({ channelFilter: channel });
    get().fetchConversations(1);
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().fetchConversations(1);
  },

  fetchAnalytics: async () => {
    try {
      const analytics = await api.analytics.dashboard();
      set({ analytics });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  },

  refresh: async () => {
    await Promise.all([get().fetchConversations(get().page), get().fetchAnalytics()]);
  },
}));
