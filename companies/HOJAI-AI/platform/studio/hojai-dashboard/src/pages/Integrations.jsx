import React from 'react';
import { Users, Zap, CheckCircle } from 'lucide-react';

function Integrations() {
  const integrations = [
    { name: 'HubSpot', category: 'CRM', status: 'connected', icon: '💼' },
    { name: 'Salesforce', category: 'CRM', status: 'connected', icon: '☁️' },
    { name: 'Slack', category: 'Communication', status: 'connected', icon: '💬' },
    { name: 'Gmail', category: 'Email', status: 'connected', icon: '📧' },
    { name: 'Jira', category: 'Project', status: 'available', icon: '📋' },
    { name: 'Notion', category: 'Docs', status: 'available', icon: '📝' },
    { name: 'Stripe', category: 'Payments', status: 'available', icon: '💳' },
    { name: 'Shopify', category: 'Commerce', status: 'available', icon: '🛒' },
  ];

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500">Connected and available integrations</p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-4 gap-4">
            {integrations.filter(i => i.category === category).map((integration) => (
              <div
                key={integration.name}
                className={`bg-white rounded-xl p-6 border ${
                  integration.status === 'connected'
                    ? 'border-green-500'
                    : 'border-gray-200 hover:border-purple-500 cursor-pointer'
                }`}
              >
                <div className="text-4xl mb-3">{integration.icon}</div>
                <h3 className="font-semibold">{integration.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {integration.status === 'connected' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Available</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Integrations;
