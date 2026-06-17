'use client'

import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const integrations = [
  { name: 'HubSpot CRM', status: 'connected', lastSync: '2 min ago' },
  { name: 'Claude AI', status: 'connected', lastSync: 'Active' },
  { name: 'OpenAI GPT-4', status: 'connected', lastSync: 'Active' },
  { name: 'Gong', status: 'connected', lastSync: '1 hour ago' },
  { name: 'Salesforce', status: 'disconnected', lastSync: 'Never' },
  { name: 'Slack', status: 'connected', lastSync: 'Active' },
]

export function IntegrationStatus() {
  return (
    <div className="space-y-3">
      {integrations.map((integration) => (
        <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            {integration.status === 'connected' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium">{integration.name}</p>
              <p className="text-xs text-muted-foreground">Last sync: {integration.lastSync}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
