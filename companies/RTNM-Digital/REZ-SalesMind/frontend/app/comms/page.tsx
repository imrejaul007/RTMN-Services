'use client';

import { useState } from 'react';
import { MessageCircle, Mail, Phone, Send, Inbox } from 'lucide-react';

export default function CommsPage() {
  const [selectedChannel, setSelectedChannel] = useState('all');

  const channels = [
    { id: 'all', name: 'All', icon: Inbox, count: 24 },
    { id: 'email', name: 'Email', icon: Mail, count: 12 },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, count: 8 },
    { id: 'call', name: 'Calls', icon: Phone, count: 4 },
  ];

  const messages = [
    { id: '1', channel: 'email', from: 'john@acme.com', subject: 'Demo Request', preview: 'Hi, Id like to schedule a demo...', time: '5m ago', unread: true },
    { id: '2', channel: 'whatsapp', from: '+971501234567', message: 'Is the demo still on for tomorrow?', time: '15m ago', unread: true },
    { id: '3', channel: 'email', from: 'sarah@techcorp.com', subject: 'Pricing Question', preview: 'Thanks for the information...', time: '1h ago', unread: false },
    { id: '4', channel: 'call', from: '+971501234567', duration: '12:34', time: '2h ago', unread: false },
    { id: '5', channel: 'whatsapp', from: '+15551234567', message: 'Loved your product!', time: '3h ago', unread: false },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-blue-500" />
        Unified Communications
      </h1>

      {/* Channel Filter */}
      <div className="flex gap-4 mb-6">
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              selectedChannel === ch.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <ch.icon className="w-4 h-4" />
            <span>{ch.name}</span>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{ch.count}</span>
          </button>
        ))}
      </div>

      {/* Inbox */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Inbox</h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Send className="w-4 h-4" />
            Compose
          </button>
        </div>
        <div className="divide-y">
          {messages
            .filter(m => selectedChannel === 'all' || m.channel === selectedChannel)
            .map(msg => (
              <div
                key={msg.id}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer ${
                  msg.unread ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  msg.channel === 'email' ? 'bg-blue-100 text-blue-600' :
                  msg.channel === 'whatsapp' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {msg.channel === 'email' ? <Mail className="w-5 h-5" /> :
                   msg.channel === 'whatsapp' ? <MessageCircle className="w-5 h-5" /> :
                   <Phone className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{msg.from}</span>
                    {msg.unread && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {msg.subject || msg.message || `Call - ${msg.duration}`}
                  </div>
                </div>
                <div className="text-xs text-gray-400">{msg.time}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Send */}
      <div className="mt-6 bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Quick Send</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter email or phone..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select className="px-4 py-2 border rounded-lg">
            <option>Email</option>
            <option>WhatsApp</option>
            <option>SMS</option>
          </select>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
