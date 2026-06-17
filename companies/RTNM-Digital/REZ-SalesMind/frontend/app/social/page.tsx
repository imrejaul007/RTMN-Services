'use client';

import { useState } from 'react';
import { MessageCircle, Send, Instagram, Linkedin, Twitter, Facebook } from 'lucide-react';

const platforms = [
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-600' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-500' },
];

const mockMessages = [
  { id: '1', platform: 'whatsapp', to: '+971501234567', message: 'Hi! Interested in a demo?', status: 'sent', time: '2 min ago' },
  { id: '2', platform: 'linkedin', to: 'Sarah Chen', message: 'Great connecting with you!', status: 'delivered', time: '5 min ago' },
  { id: '3', platform: 'instagram', to: '@johndoe', message: 'Thanks for the follow!', status: 'read', time: '10 min ago' },
  { id: '4', platform: 'twitter', to: '@techlead', message: 'Loved your post about AI!', status: 'sent', time: '15 min ago' },
];

export default function SocialPage() {
  const [selected, setSelected] = useState('whatsapp');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipient || !message) return;
    setSending(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    setSending(false);
    setMessage('');
    alert(`Message sent via ${selected}!`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📱 Social Media Hub</h1>

      {/* Platform Selector */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {platforms.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selected === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p.icon className={`w-8 h-8 mx-auto mb-2 ${p.color} text-white rounded-lg p-1.5`} />
            <span className="text-sm font-medium">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Send Message */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Send Message</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {selected === 'whatsapp' ? 'Phone Number' : selected === 'linkedin' ? 'Profile URL/Name' : 'Username/Handle'}
            </label>
            <input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder={selected === 'whatsapp' ? '+971501234567' : selected === 'linkedin' ? 'linkedin.com/in/name' : '@username'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !recipient || !message}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Messages</h2>
        <div className="space-y-3">
          {mockMessages.map(msg => {
            const platform = platforms.find(x => x.id === msg.platform);
            return (
              <div key={msg.id} className="flex items-center gap-4 p-3 border rounded-lg">
                {platform && <platform.icon className={`w-8 h-8 ${platform.color} text-white rounded p-1.5`} />}
                <div className="flex-1">
                  <div className="font-medium">{msg.to}</div>
                  <div className="text-sm text-gray-500">{msg.message}</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    msg.status === 'read' ? 'bg-green-100 text-green-700' :
                    msg.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{msg.status}</span>
                  <div className="text-xs text-gray-400 mt-1">{msg.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
