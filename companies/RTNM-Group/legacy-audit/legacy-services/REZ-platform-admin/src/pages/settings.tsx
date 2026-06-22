/**
 * Settings Page - Platform settings
 */

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">General</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Platform Name</p>
                <p className="text-sm text-gray-500">REZ Platform</p>
              </div>
              <input defaultValue="REZ Platform" className="border rounded px-3 py-2 w-64" />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Support Email</p>
                <p className="text-sm text-gray-500">admin@rez.money</p>
              </div>
              <input defaultValue="admin@rez.money" className="border rounded px-3 py-2 w-64" />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Security</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-sm text-gray-500">Require 2FA for all admins</p>
              </div>
              <Toggle enabled={true} />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-gray-500">Auto logout after inactivity</p>
              </div>
              <select defaultValue="24h" className="border rounded px-3 py-2">
                <option>1h</option>
                <option>8h</option>
                <option>24h</option>
                <option>7d</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">IP Allowlist</p>
                <p className="text-sm text-gray-500">Restrict access by IP</p>
              </div>
              <Toggle enabled={false} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <ToggleRow label="Email Alerts" description="Send email on critical events" enabled={true} />
            <ToggleRow label="Slack Integration" description="Post to Slack channel" enabled={true} />
            <ToggleRow label="Weekly Reports" description="Send weekly summary" enabled={false} />
          </div>
        </div>

        {/* API Settings */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">API</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Rate Limiting</p>
                <p className="text-sm text-gray-500">Max 1000 req/min</p>
              </div>
              <input defaultValue="1000" className="border rounded px-3 py-2 w-24" />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">API Version</p>
                <p className="text-sm text-gray-500">Current version</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded">v2.0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="px-6 py-2 border rounded">Cancel</button>
        <button className="px-6 py-2 bg-blue-600 text-white rounded">Save Changes</button>
      </div>
    </div>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <button
      className={`w-12 h-6 rounded-full transition ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow ${
        enabled ? 'translate-x-6' : 'translate-x-0.5'
      } transition`} />
    </button>
  );
}

function ToggleRow({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Toggle enabled={enabled} />
    </div>
  );
}
