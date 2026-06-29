import React, { useState } from 'react';
import { MessageSquare, Phone, Send, CheckCircle, XCircle, Settings } from 'lucide-react';

function Connectors() {
  const [activeTab, setActiveTab] = useState('sms');

  const connectors = {
    sms: {
      name: 'Twilio SMS',
      icon: Send,
      color: 'blue',
      config: [
        { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID' },
        { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token' },
        { key: 'TWILIO_FROM_NUMBER', label: 'From Number' },
      ],
      actions: ['Send SMS', 'Send OTP', 'Bulk SMS', 'Validate Number'],
    },
    voice: {
      name: 'Twilio Voice',
      icon: Phone,
      color: 'purple',
      config: [
        { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID' },
        { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token' },
        { key: 'TWILIO_FROM_NUMBER', label: 'From Number' },
      ],
      actions: ['Make Call', 'AI Answer', 'Get Recordings'],
    },
    whatsapp: {
      name: 'WhatsApp Business',
      icon: MessageSquare,
      color: 'green',
      config: [
        { key: 'WA_PHONE_ID', label: 'Phone Number ID' },
        { key: 'WA_ACCESS_TOKEN', label: 'Access Token' },
        { key: 'WA_BUSINESS_ID', label: 'Business ID' },
        { key: 'WA_VERIFY_TOKEN', label: 'Verify Token' },
      ],
      actions: ['Send Text', 'Send Template', 'Send Buttons', 'Send List'],
    },
    background: {
      name: 'Background Check',
      icon: CheckCircle,
      color: 'orange',
      config: [
        { key: 'BACKGROUND_CHECK_API_KEY', label: 'API Key' },
        { key: 'BACKGROUND_CHECK_BASE_URL', label: 'Base URL' },
      ],
      actions: ['Check Candidate', 'Get Report', 'Webhooks'],
    },
  };

  const activeConnector = connectors[activeTab];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
        <p className="text-gray-500">Manage external service integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {Object.entries(connectors).map(([key, conn]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              activeTab === key
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 hover:border-purple-500'
            }`}
          >
            <conn.icon className="w-5 h-5" />
            {conn.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="col-span-2 bg-white rounded-xl p-6 border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Configuration</h3>
            <button className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>

          <div className="space-y-4">
            {activeConnector.config.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type="password"
                  placeholder={`Enter ${field.key}`}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Save Configuration
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Available Actions</h3>
          <div className="space-y-2">
            {activeConnector.actions.map((action) => (
              <button
                key={action}
                className="w-full flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="mt-6 bg-white rounded-xl p-6 border">
        <h3 className="font-semibold mb-4">Test Connection</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Test input..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Test
          </button>
        </div>
      </div>
    </div>
  );
}

export default Connectors;
