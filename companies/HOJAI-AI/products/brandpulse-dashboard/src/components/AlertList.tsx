import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Alert } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function AlertList({ alerts, onAcknowledge, onResolve }: AlertListProps) {
  const severityConfig = {
    critical: {
      bg: 'bg-red-50 border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    },
    high: {
      bg: 'bg-orange-50 border-orange-200',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700',
    },
    medium: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: Clock,
      iconColor: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-700',
    },
    low: {
      bg: 'bg-blue-50 border-blue-200',
      icon: Clock,
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  const statusConfig = {
    active: { label: 'Active', color: 'text-red-600' },
    acknowledged: { label: 'Acknowledged', color: 'text-yellow-600' },
    resolved: { label: 'Resolved', color: 'text-green-600' },
    dismissed: { label: 'Dismissed', color: 'text-gray-500' },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          {alerts.filter((a) => a.status === 'active').length} Active
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <p className="mt-2 text-sm text-gray-500">No active alerts</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            const status = statusConfig[alert.status];

            return (
              <div
                key={alert.id}
                className={clsx('rounded-lg border p-3', config.bg)}
              >
                <div className="flex items-start gap-3">
                  <Icon className={clsx('mt-0.5 h-5 w-5', config.iconColor)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', config.badge)}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={clsx('text-xs', status.color)}>{status.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{alert.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                      {alert.status === 'active' && (
                        <div className="flex gap-2">
                          {onAcknowledge && (
                            <button
                              onClick={() => onAcknowledge(alert.id)}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                              Acknowledge
                            </button>
                          )}
                          {onResolve && (
                            <button
                              onClick={() => onResolve(alert.id)}
                              className="text-xs font-medium text-green-600 hover:text-green-700"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
