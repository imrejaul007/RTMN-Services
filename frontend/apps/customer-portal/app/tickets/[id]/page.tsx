'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, X, Clock, User, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import type { Ticket, TicketMessage } from '@/lib/types';

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    const response = await api.getTicket(ticketId);
    if (response.success && response.data) {
      setTicket(response.data);
      setMessages(response.data.messages || []);
    } else {
      setError(response.error || 'Failed to load ticket');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const response = await api.addTicketMessage(ticketId, newMessage.trim());

    if (response.success && response.data) {
      setMessages((prev) => [...prev, response.data!]);
      setNewMessage('');
    } else {
      setError(response.error || 'Failed to send message');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Ticket not found'}</p>
        <Link href="/tickets" className="btn-primary">
          Back to Tickets
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/tickets"
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tickets
        </Link>

        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
              <div className="flex flex-wrap gap-2">
                <span className={`badge ${statusColors[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`badge ${priorityColors[ticket.priority]}`}>
                  {ticket.priority} priority
                </span>
                <span className="badge bg-gray-100 text-gray-600">
                  {ticket.category}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>Ticket #{ticket.id}</p>
              <p>Created {new Date(ticket.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Original message */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">Conversation</h2>
        </div>

        {/* Message list */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  message.senderType === 'customer'
                    ? 'bg-primary-600 text-white'
                    : message.senderType === 'system'
                    ? 'bg-gray-100 text-gray-600 italic'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center mb-1">
                  <User className="w-4 h-4 mr-1" />
                  <span className="font-medium text-sm">{message.senderName}</span>
                  <span className="text-xs opacity-70 ml-2">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply form */}
        {ticket.status !== 'closed' && (
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="input-field resize-none"
                  rows={3}
                  disabled={sending}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={!newMessage.trim() || sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        )}

        {ticket.status === 'closed' && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 text-center">
            <p className="text-gray-600 mb-2">This ticket is closed.</p>
            <Link href="/submit" className="btn-secondary text-sm">
              Create a new ticket
            </Link>
          </div>
        )}
      </div>

      {/* Ticket info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last updated:</span>
              <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
          <div className="space-y-2">
            {ticket.status !== 'closed' && (
              <button
                onClick={async () => {
                  await api.closeTicket(ticketId);
                  fetchTicket();
                }}
                className="w-full btn-secondary text-sm flex items-center justify-center"
              >
                <X className="w-4 h-4 mr-2" />
                Close Ticket
              </button>
            )}
            <Link href="/faq" className="block w-full btn-secondary text-sm text-center">
              Search FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
