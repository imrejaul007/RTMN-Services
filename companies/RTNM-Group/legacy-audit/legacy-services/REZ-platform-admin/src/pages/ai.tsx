/**
 * Chief AI Officer Dashboard
 */

export default function AIDashboard() {
  const models = [
    { name: 'Intent Predictor', status: 'deployed', accuracy: 94.2, latency: '45ms', training: 'May 15' },
    { name: 'Fraud Detector', status: 'deployed', accuracy: 97.1, latency: '32ms', training: 'May 10' },
    { name: 'Churn Predictor', status: 'training', accuracy: 91.8, latency: '120ms', training: 'In progress' },
    { name: 'Recommendation Engine', status: 'deployed', accuracy: 89.5, latency: '28ms', training: 'May 5' },
    { name: 'Sentiment Analyzer', status: 'deployed', accuracy: 92.3, latency: '18ms', training: 'Apr 28' }
  ];

  const experiments = [
    { name: 'Pricing v2', status: 'running', lift: '+12.5%', confidence: 95 },
    { name: 'Recommend Algorithm', status: 'running', lift: '+8.3%', confidence: 89 },
    { name: 'Fraud Threshold', status: 'draft', lift: 'TBD', confidence: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-4 gap-6">
        <Metric title="Active Models" value="12" sub="+2 this month" />
        <Metric title="Avg Accuracy" value="94.5%" sub="+1.2% improvement" />
        <Metric title="Predictions/Day" value="2.5M" sub="+35% growth" />
        <Metric title="Experiments" value="8" sub="5 running" />
      </div>

      {/* AI Models */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">AI Models</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">+ Train Model</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Model</th>
              <th className="p-3">Status</th>
              <th className="p-3">Accuracy</th>
              <th className="p-3">Latency</th>
              <th className="p-3">Last Training</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.name} className="border-t">
                <td className="p-3 font-medium">{model.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    model.status === 'deployed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {model.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${model.accuracy}%` }}
                      />
                    </div>
                    <span>{model.accuracy}%</span>
                  </div>
                </td>
                <td className="p-3 text-gray-600">{model.latency}</td>
                <td className="p-3 text-gray-600">{model.training}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* A/B Experiments */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Active Experiments</h2>
          {experiments.map(exp => (
            <div key={exp.name} className="border-b py-3 last:border-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{exp.name}</p>
                  <p className="text-sm text-gray-500">Confidence: {exp.confidence}%</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs ${
                  exp.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {exp.status}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-green-600 font-medium">{exp.lift}</span>
                <span className="text-gray-500 text-sm ml-2">lift</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Action icon="🤖" label="Train New Model" />
            <Action icon="📊" label="View Experiments" />
            <Action icon="📈" label="Model Performance" />
            <Action icon="🔧" label="Model Settings" />
          </div>
        </div>
      </div>

      {/* Data Quality */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold mb-4">Data Pipeline Health</h2>
        <div className="grid grid-cols-4 gap-4">
          <DataMetric label="Training Data" value="25GB" status="healthy" />
          <DataMetric label="Validation Data" value="5GB" status="healthy" />
          <DataMetric label="Model Registry" value="12 models" status="healthy" />
          <DataMetric label="API Calls Today" value="2.5M" status="healthy" />
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-green-600 mt-1">{sub}</p>
    </div>
  );
}

function Action({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 text-left">
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function DataMetric({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <p className="text-2xl font-bold text-blue-600">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        {status}
      </p>
    </div>
  );
}
