'use client'

import { Mail, Phone, Calendar, MessageSquare, ArrowUpRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const activities = [
  { id: 1, type: 'email', title: 'Email sent to John Smith', description: 'Q2 Enterprise Outreach campaign', time: new Date(Date.now() - 1000 * 60 * 5), icon: Mail },
  { id: 2, type: 'meeting', title: 'Meeting booked with Sarah', description: 'Demo scheduled for tomorrow 2pm', time: new Date(Date.now() - 1000 * 60 * 15), icon: Calendar },
  { id: 3, type: 'response', title: 'Lead responded', description: 'Mike Chen replied to follow-up', time: new Date(Date.now() - 1000 * 60 * 30), icon: MessageSquare },
  { id: 4, type: 'call', title: 'Call completed', description: 'Duration: 5m 23s - Qualified', time: new Date(Date.now() - 1000 * 60 * 45), icon: Phone },
  { id: 5, type: 'email', title: 'Email opened', description: 'Emily Davis opened proposal email', time: new Date(Date.now() - 1000 * 60 * 60), icon: Mail },
]

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <activity.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.title}</p>
            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(activity.time, { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  )
}
