'use client';

import { UserPlus, Mail, Phone, Star, TrendingUp, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface Activity {
  id: string;
  type: 'lead_added' | 'email_sent' | 'call_made' | 'score_change' | 'status_change' | 'meeting';
  description: string;
  timestamp: string;
  lead?: string;
}

interface ActivityFeedProps {
  activities?: Activity[];
  maxItems?: number;
}

const defaultActivities: Activity[] = [
  { id: '1', type: 'lead_added', description: 'New lead added via Google Places', timestamp: '2 minutes ago', lead: 'Sarah Chen' },
  { id: '2', type: 'email_sent', description: 'Campaign email sent', timestamp: '15 minutes ago', lead: 'Marcus Johnson' },
  { id: '3', type: 'score_change', description: 'Lead score updated to Hot', timestamp: '32 minutes ago', lead: 'Priya Patel' },
  { id: '4', type: 'status_change', description: 'Moved to Qualified stage', timestamp: '1 hour ago', lead: 'David Kim' },
  { id: '5', type: 'meeting', description: 'Meeting scheduled for next week', timestamp: '2 hours ago', lead: 'Emma Williams' },
  { id: '6', type: 'call_made', description: 'Discovery call completed', timestamp: '3 hours ago', lead: 'Lisa Zhang' },
];

const activityIcons = {
  lead_added: UserPlus,
  email_sent: Mail,
  call_made: Phone,
  score_change: Star,
  status_change: TrendingUp,
  meeting: Calendar,
};

const activityColors = {
  lead_added: 'bg-blue-100 text-blue-600',
  email_sent: 'bg-purple-100 text-purple-600',
  call_made: 'bg-green-100 text-green-600',
  score_change: 'bg-yellow-100 text-yellow-600',
  status_change: 'bg-indigo-100 text-indigo-600',
  meeting: 'bg-pink-100 text-pink-600',
};

export default function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const items = (activities || defaultActivities).slice(0, maxItems);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className={clsx('p-2 rounded-lg shrink-0', activityColors[activity.type])}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                {activity.lead && (
                  <p className="text-sm text-blue-600 font-medium">{activity.lead}</p>
                )}
              </div>
              <span className="text-xs text-gray-500 shrink-0">{activity.timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
