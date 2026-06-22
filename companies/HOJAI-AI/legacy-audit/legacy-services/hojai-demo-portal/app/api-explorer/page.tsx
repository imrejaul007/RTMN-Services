"use client";
import { useState } from "react";
import { Zap, ArrowRight, Copy, Check, Loader2 } from "lucide-react";

const endpoints = [
  {
    name: "List Services",
    method: "GET",
    path: "/api/services",
    description: "Get all available HOJAI services",
    port: 4500,
    mockResponse: {
      services: [
        { name: "API Gateway", port: 4500, status: "operational" },
        { name: "Memory", port: 4520, status: "operational" },
        { name: "Intelligence", port: 4530, status: "operational" },
        { name: "Agents", port: 4550, status: "operational" },
      ],
      total: 66,
    },
  },
  {
    name: "Execute Agent",
    method: "POST",
    path: "/api/agents/execute",
    description: "Execute an AI employee with a task",
    port: 4550,
    mockResponse: {
      success: true,
      agent: "Support Agent",
      task: "Customer inquiry",
      result: "Responded with relevant information",
      executionTime: "234ms",
    },
  },
  {
    name: "Store Memory",
    method: "POST",
    path: "/api/memory",
    description: "Store context for future retrieval",
    port: 4520,
    mockResponse: {
      success: true,
      memoryId: "mem_12345",
      createdAt: "2026-06-12T10:30:00Z",
      ttl: 86400,
    },
  },
  {
    name: "Get Insights",
    method: "GET",
    path: "/api/intelligence/insights",
    description: "Get ML-powered business insights",
    port: 4530,
    mockResponse: {
      insights: [
        { type: "trend", message: "Restaurant orders up 23% this week" },
        { type: "anomaly", message: "Inventory levels below threshold for tomatoes" },
        { type: "opportunity", message: "Consider upselling garlic bread with biryani" },
      ],
    },
  },
];

export default function ApiExplorerPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const executeRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setResponse(selectedEndpoint.mockResponse);
      setLoading(false);
    }, 1000);
  };

  const copyCurl = () => {
    const curl = `curl -X ${selectedEndpoint.method} https://api.hojai.ai:${selectedEndpoint.port}${selectedEndpoint.path}`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <section className="py-8 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-indigo-400" />
            API Explorer
          </h1>
          <p className="text-slate-400 mt-1">Test HOJAI APIs with live responses</p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Endpoints List */}
            <div className="lg:col-span-1">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Endpoints</h3>
              <div className="space-y-2">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.name}
                    onClick={() => { setSelectedEndpoint(endpoint); setResponse(null); }}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedEndpoint.name === endpoint.name
                        ? "bg-indigo-500/20 border border-indigo-500"
                        : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        endpoint.method === "GET" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="text-sm text-white">{endpoint.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">{endpoint.path}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Request/Response */}
            <div className="lg:col-span-3 space-y-6">
              {/* Request */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Request</h3>
                  <button
                    onClick={copyCurl}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy cURL"}
                  </button>
                </div>

                <div className="bg-slate-900 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedEndpoint.method === "GET" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-indigo-300">https://api.hojai.ai:{selectedEndpoint.port}{selectedEndpoint.path}</code>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-4">{selectedEndpoint.description}</p>

                <button
                  onClick={executeRequest}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </div>

              {/* Response */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Response</h3>
                {response ? (
                  <pre className="bg-slate-900 rounded-xl p-4 text-sm text-slate-300 overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-slate-900 rounded-xl p-8 text-center text-slate-500">
                    Click "Send Request" to see the response
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}