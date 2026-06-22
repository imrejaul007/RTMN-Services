'use client';

import { useEffect } from 'react';
import { useInboxStore } from '@/stores/inboxStore';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ConversationThread } from '@/components/inbox/ConversationThread';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { QueueWidget } from '@/components/dashboard/QueueWidget';
import { ChannelFilter } from '@/components/inbox/ChannelFilter';
import {
  Inbox,
  MessageSquare,
  Phone,
  Mail,
  Instagram,
  RefreshCw,
} from 'lucide-react';

const channelIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  web: Phone,
  chat: Inbox,
};

const channelColors = {
  whatsapp: 'bg-green-500',
  email: 'bg-blue-500',
  instagram: 'bg-purple-500',
  web: 'bg-orange-500',
  chat: 'bg-gray-500',
};

export default function DashboardPage() {
  const {
    conversations,
    selectedConversation,
    loading,
    channelFilter,
    setChannelFilter,
    fetchConversations,
    selectConversation,
    refresh,
  } = useInboxStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const channels = ['whatsapp', 'email', 'instagram', 'web', 'chat'] as const;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
          <p className="text-sm text-gray-500">Unified inbox for all channels</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </header>

      {/* Stats */}
      <StatsCards />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Channel Filter & Queue */}
        <aside className="w-64 bg-white border-r flex flex-col">
          {/* Channel Filter */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Channels</h3>
            <div className="space-y-1">
              <button
                onClick={() => setChannelFilter(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  !channelFilter ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span className="text-sm">All Channels</span>
              </button>
              {channels.map((channel) => {
                const Icon = channelIcons[channel];
                const count = conversations.filter((c) => c.channel === channel).length;
                return (
                  <button
                    key={channel}
                    onClick={() => setChannelFilter(channel)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                      channelFilter === channel ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm capitalize flex-1">{channel}</span>
                    {count > 0 && (
                      <span className={`${channelColors[channel]} text-white text-xs px-2 py-0.5 rounded-full`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Queue */}
          <QueueWidget />
        </aside>

        {/* Conversation List */}
        <div className="w-96 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-gray-700">Conversations</h3>
          </div>
          <ChannelFilter />
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={selectConversation}
            loading={loading}
          />
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ConversationThread conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
