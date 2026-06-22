'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, Phone, Mail, Instagram, Clock } from 'lucide-react';

const channelIcons = {
  whatsapp: MessageSquare,
  email: Mail,
  instagram: Instagram,
  web: Phone,
  chat: MessageSquare,
};

interface QueueItem {
  channel: string;
  count: number;
  avgWaitTime: number;
}

export function QueueWidget() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await api.analytics.queue();
        setQueue(data);
      } catch (error) {
        console.error('Failed to fetch queue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-4 flex-1">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Queue</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalQueue = queue.reduce((sum, q) => sum + q.count, 0);

  return (
    <div className="p-4 flex-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Queue</h3>
        <span className="text-xs text-gray-500">{totalQueue} waiting</span>
      </div>
      <div className="space-y-3">
        {queue.map((item) => {
          const Icon = channelIcons[item.channel as keyof typeof channelIcons] || MessageSquare;
          return (
            <div key={item.channel} className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">{item.channel}</span>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
                {item.avgWaitTime > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    ~{Math.round(item.avgWaitTime / 60)}m avg wait
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {queue.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No tickets in queue</p>
        )}
      </div>
    </div>
  );
}
