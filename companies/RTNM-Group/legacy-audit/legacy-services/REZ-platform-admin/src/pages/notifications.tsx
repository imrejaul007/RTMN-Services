/**
 * Notifications Page
 */

export default function Notifications() {
  const notifications = [
    { id: 'notif_001', title: 'New Super Admin Login', body: 'Super Admin logged in from new device', type: 'security', time: '2 min ago', read: false },
    { id: 'notif_002', title: 'Service Deployed', body: 'verify-qr v2.0.5 deployed successfully', type: 'deployment', time: '15 min ago', read: false },
    { id: 'notif_003', title: 'Budget Alert', body: 'Marketing campaign at 80% budget', type: 'warning', time: '30 min ago', read: false },
    { id: 'notif_004', title: 'New User Registered', body: 'CFO user created by admin', type: 'info', time: '1h ago', read: true },
    { id: 'notif_005', title: 'System Healthy', body: 'All services operational', type: 'success', time: '2h ago', read: true }
  ];

  const typeColors: Record<string, string> = {
    security: 'bg-purple-100 text-purple-800',
    deployment: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Mark All Read</button>
        <button className="px-4 py-2 bg-gray-100 rounded">Settings
        </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-4 border-b last:border-0 ${notif.read ? 'opacity-60' : ''}`}
          >
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                notif.type === 'security' ? 'bg-purple-100' :
                notif.type === 'warning' ? 'bg-yellow-100' :
                notif.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {notif.type === 'security' ? '🔒' :
                 notif.type === 'warning' ? '⚠️' :
                 notif.type === 'success' ? '✅' : 'ℹ️'}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">{notif.title}</p>
                  <span className="text-xs text-gray-500">{notif.time}</span>
                </div>
                <p className="text-sm text-gray-600">{notif.body}</p>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${typeColors[notif.type]}`}>
                    {notif.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
