import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Phone, Send, Users, TrendingUp, Activity, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4500';

function Dashboard() {
  const [stats, setStats] = useState({
    sms: 0,
    whatsapp: 0,
    voice: 0,
    refunds: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated stats (replace with real API calls)
    setStats({
      sms: 1247,
      whatsapp: 892,
      voice: 156,
      refunds: 23,
    });
    setLoading(false);
  }, []);

  const statCards = [
    { label: 'SMS Sent', value: stats.sms.toLocaleString(), icon: Send, color: 'bg-blue-500' },
    { label: 'WhatsApp Messages', value: stats.whatsapp.toLocaleString(), icon: MessageSquare, color: 'bg-green-500' },
    { label: 'Voice Calls', value: stats.voice.toLocaleString(), icon: Phone, color: 'bg-purple-500' },
    { label: 'Refunds Processed', value: stats.refunds, icon: Activity, color: 'bg-orange-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">HOJAI Platform Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm">{stat.label}</span>
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-purple-500 hover:bg-purple-50">
              <Send className="w-5 h-5 text-blue-500" />
              <span>Send SMS</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-purple-500 hover:bg-purple-50">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <span>Send WhatsApp</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-purple-500 hover:bg-purple-50">
              <Phone className="w-5 h-5 text-purple-500" />
              <span>Make Voice Call</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { time: '2 min ago', action: 'SMS sent to +91 98765 43210', status: 'delivered' },
              { time: '5 min ago', action: 'WhatsApp message delivered', status: 'read' },
              { time: '12 min ago', action: 'Voice call completed (3:24)', status: 'success' },
              { time: '1 hour ago', action: 'Refund approved: ₹2,500', status: 'approved' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className={`w-2 h-2 rounded-full ${
                  item.status === 'delivered' || item.status === 'read' ? 'bg-green-500' :
                  item.status === 'success' ? 'bg-blue-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm">{item.action}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-xl p-6 border">
        <h3 className="font-semibold mb-4">Services Status</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Twilio SMS', status: 'operational', uptime: '99.9%' },
            { name: 'Twilio Voice', status: 'operational', uptime: '99.8%' },
            { name: 'WhatsApp Business', status: 'operational', uptime: '99.7%' },
            { name: 'Background Check', status: 'operational', uptime: '99.5%' },
            { name: 'Meeting Recording', status: 'operational', uptime: '99.9%' },
            { name: 'Voice-to-Task', status: 'operational', uptime: '99.6%' },
          ].map((service, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  service.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">{service.name}</span>
              </div>
              <span className="text-sm text-gray-500">{service.uptime}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
