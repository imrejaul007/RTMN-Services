'use client'

import { useState } from 'react'
import {
  Settings,
  RefreshCw,
  Trash2,
  Check,
  X,
  ExternalLink,
  Plug,
  MoreHorizontal,
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  status: 'connected' | 'disconnected'
  lastSync?: string
}

interface IntegrationCardProps {
  integration: Integration
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const [status, setStatus] = useState(integration.status)
  const [isLoading, setIsLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setStatus(status === 'connected' ? 'disconnected' : 'connected')
    setIsLoading(false)
  }

  const handleSync = async () => {
    setIsLoading(true)
    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: integration.color }}
          >
            {integration.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{integration.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                status === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {status === 'connected' ? 'Connected' : 'Available'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
            <span className="inline-block mt-2 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
              {integration.category}
            </span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg z-10 min-w-[160px]">
              {status === 'connected' ? (
                <>
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                    <Settings className="h-4 w-4" />
                    Configure
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    View Docs
                  </button>
                  <div className="border-t my-1" />
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-sm"
                  >
                    <X className="h-4 w-4" />
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                    <ExternalLink className="h-4 w-4" />
                    View Docs
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Info */}
      {status === 'connected' && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                Last synced: {integration.lastSync || 'Recently'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="mt-4">
        {status === 'connected' ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-green-500 rounded-full" />
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plug className="h-4 w-4" />
                Connect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
