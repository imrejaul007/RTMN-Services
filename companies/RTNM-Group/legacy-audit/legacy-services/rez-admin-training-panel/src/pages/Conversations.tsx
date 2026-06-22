import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MessageSquare,
  User,
  Bot,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';
import { DataTable, Column } from '../components/DataTable';
import apiService from '../services/api';
import type { Conversation, Message } from '../types';

export function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [statusFilter, dateFrom, dateTo]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const data = await apiService.getConversations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setConversations(data.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations(mockConversations);
    } finally {
      setLoading(false);
    }
  };

  const handleViewConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowDetailPanel(true);
  };

  const handleRefresh = () => {
    fetchConversations();
  };

  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.messages.some((m) => m.content.toLowerCase().includes(query)) ||
        conv.sessionId.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const columns: Column<Conversation>[] = [
    {
      key: 'sessionId',
      header: 'Session ID',
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {item.sessionId.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'messages',
      header: 'Preview',
      render: (item) => {
        const lastMessage = item.messages[item.messages.length - 1];
        return (
          <div className="max-w-xs">
            <p className="text-sm text-gray-900 dark:text-white truncate">
              {lastMessage?.content || 'No messages'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.messages.length} messages
            </p>
          </div>
        );
      },
    },
    {
      key: 'intent',
      header: 'Intent',
      sortable: true,
      render: (item) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          {item.intent || 'General'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const statusConfig = {
          active: { color: 'blue', label: 'Active' },
          completed: { color: 'green', label: 'Completed' },
          abandoned: { color: 'red', label: 'Abandoned' },
        };
        const config = statusConfig[item.status] || statusConfig.active;
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'resolved',
      header: 'Resolution',
      render: (item) => (
        <div className="flex items-center gap-1">
          {item.resolved ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm ${item.resolved ? 'text-green-600' : 'text-red-600'}`}>
            {item.resolved ? 'Resolved' : 'Unresolved'}
          </span>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (item) => (
        item.rating ? (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">{item.rating}/5</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No rating</span>
        )
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(item.startedAt).toLocaleString()}
        </span>
      ),
    },
  ];

  // Mock data
  const mockConversations: Conversation[] = [
    {
      id: '1',
      sessionId: 'sess_abc123xyz',
      messages: [
        { id: '1', role: 'user', content: 'Hi, I want to order a pizza', timestamp: '2024-01-20T10:00:00Z' },
        { id: '2', role: 'assistant', content: 'Great! What type of pizza would you like?', timestamp: '2024-01-20T10:00:30Z' },
        { id: '3', role: 'user', content: 'A large pepperoni pizza please', timestamp: '2024-01-20T10:01:00Z' },
        { id: '4', role: 'assistant', content: 'Perfect! I have added a large pepperoni pizza to your order. Would you like anything else?', timestamp: '2024-01-20T10:01:30Z' },
      ],
      startedAt: '2024-01-20T10:00:00Z',
      endedAt: '2024-01-20T10:05:00Z',
      status: 'completed',
      intent: 'Order Food',
      resolved: true,
      rating: 5,
      feedback: 'Great service!',
    },
    {
      id: '2',
      sessionId: 'sess_def456uvw',
      messages: [
        { id: '1', role: 'user', content: 'How can I track my order?', timestamp: '2024-01-20T11:30:00Z' },
        { id: '2', role: 'assistant', content: 'You can track your order in the app under "My Orders"', timestamp: '2024-01-20T11:30:15Z' },
        { id: '3', role: 'user', content: 'Thanks!', timestamp: '2024-01-20T11:30:30Z' },
      ],
      startedAt: '2024-01-20T11:30:00Z',
      endedAt: '2024-01-20T11:31:00Z',
      status: 'completed',
      intent: 'Track Order',
      resolved: true,
      rating: 4,
    },
    {
      id: '3',
      sessionId: 'sess_ghi789rst',
      messages: [
        { id: '1', role: 'user', content: 'I have a problem with my last order', timestamp: '2024-01-20T14:00:00Z' },
        { id: '2', role: 'assistant', content: 'I am sorry to hear that. Can you tell me more about the issue?', timestamp: '2024-01-20T14:00:10Z' },
      ],
      startedAt: '2024-01-20T14:00:00Z',
      status: 'active',
      intent: 'Support',
      resolved: false,
    },
    {
      id: '4',
      sessionId: 'sess_jkl012mno',
      messages: [
        { id: '1', role: 'user', content: 'What restaurants are open now?', timestamp: '2024-01-20T15:00:00Z' },
      ],
      startedAt: '2024-01-20T15:00:00Z',
      endedAt: '2024-01-20T15:00:05Z',
      status: 'abandoned',
      intent: 'Browse',
      resolved: false,
    },
    {
      id: '5',
      sessionId: 'sess_mno345pqr',
      messages: [
        { id: '1', role: 'user', content: 'Can I change my delivery address?', timestamp: '2024-01-20T16:00:00Z' },
        { id: '2', role: 'assistant', content: 'Yes, you can change your delivery address before the restaurant starts preparing your order.', timestamp: '2024-01-20T16:00:20Z' },
        { id: '3', role: 'user', content: 'Perfect, thanks!', timestamp: '2024-01-20T16:00:45Z' },
        { id: '4', role: 'assistant', content: 'Is there anything else I can help you with?', timestamp: '2024-01-20T16:00:50Z' },
      ],
      startedAt: '2024-01-20T16:00:00Z',
      endedAt: '2024-01-20T16:01:00Z',
      status: 'completed',
      intent: 'Order Change',
      resolved: true,
      rating: 5,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversations</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and analyze chat logs from the support copilot
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-gray-700">
            <DataTable
              data={filteredConversations}
              columns={columns}
              keyExtractor={(item) => item.id}
              loading={loading}
              onView={handleViewConversation}
              emptyMessage="No conversations found"
            />
          </div>
        </div>

        {/* Conversation Detail Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-100 rounded-xl border border-gray-200 dark:border-gray-700 h-[calc(100vh-200px)] sticky top-4">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Conversation Details</h3>
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setShowDetailPanel(false);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{selectedConversation.sessionId}</span>
                    <span>•</span>
                    <span>{selectedConversation.messages.length} messages</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Intent</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {selectedConversation.intent || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedConversation.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : selectedConversation.status === 'active'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedConversation.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Resolution</span>
                    <div className="flex items-center gap-1">
                      {selectedConversation.resolved ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${selectedConversation.resolved ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedConversation.resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </div>
                  </div>
                  {selectedConversation.rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Rating</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < selectedConversation.rating!
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="p-4 overflow-y-auto h-[calc(100%-280px)] space-y-4">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-dark-200 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          <span className="text-xs opacity-75">
                            {message.role === 'user' ? 'User' : 'Assistant'}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                {selectedConversation.feedback && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User Feedback</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{selectedConversation.feedback}"
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p className="text-sm">Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Conversations;
