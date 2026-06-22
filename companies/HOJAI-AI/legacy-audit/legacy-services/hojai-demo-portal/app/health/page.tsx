"use client";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "down";

interface Service {
  name: string;
  port: number;
  description: string;
  status: ServiceStatus;
  latency: number;
  uptime: number;
}

const initialServices: Service[] = [
  { name: "API Gateway", port: 4500, description: "Service discovery and routing", status: "operational", latency: 45, uptime: 99.9 },
  { name: "Memory", port: 4520, description: "Context storage and retrieval", status: "operational", latency: 23, uptime: 99.8 },
  { name: "Intelligence", port: 4530, description: "ML predictions and insights", status: "operational", latency: 89, uptime: 99.5 },
  { name: "Agents", port: 4550, description: "AI employee execution", status: "operational", latency: 156, uptime: 99.7 },
  { name: "Communications", port: 4570, description: "WhatsApp/SMS/Email", status: "operational", latency: 67, uptime: 99.6 },
  { name: "BrandPulse", port: 4770, description: "Brand Intelligence", status: "operational", latency: 34, uptime: 99.9 },
  { name: "HIB", port: 3053, description: "Human Intelligence", status: "operational", latency: 78, uptime: 99.4 },
  { name: "AssetMind", port: 5001, description: "Financial Intelligence", status: "operational", latency: 91, uptime: 99.8 },
  { name: "Nexha", port: 5002, description: "Commerce Network", status: "operational", latency: 52, uptime: 99.7 },
  { name: "RisaCare", port: 4800, description: "Healthcare Intelligence", status: "operational", latency: 43, uptime: 99.9 },
  { name: "StayOwn", port: 4801, description: "Hospitality Intelligence", status: "operational", latency: 38, uptime: 99.6 },
  { name: "CorpPerks", port: 4720, description: "Workforce Intelligence", status: "operational", latency: 29, uptime: 99.5 },
];

const statusColors: Record<ServiceStatus, string> = {
  operational: "text-emerald-400 bg-emerald-500/20",
  degraded: "text-amber-400 bg-amber-500/20",
  down: "text-red-400 bg-red-500/20",
};

const statusIcons: Record<ServiceStatus, typeof CheckCircle2> = {
  operational: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
};

export default function HealthPage() {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setServices(prev => prev.map(s => ({
        ...s,
        latency: Math.max(10, s.latency + Math.floor(Math.random() * 20) - 10),
      })));
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const operationalCount = services.filter(s => s.status === "operational").length;
  const avgUptime = (services.reduce((acc, s) => acc + s.uptime, 0) / services.length).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <section className="py-8 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Activity className="w-8 h-8 text-indigo-400" />
                Service Health
              </h1>
              <p className="text-slate-400 mt-1">Real-time monitoring of HOJAI Core services</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto-refresh
              </button>
              <span className="text-sm text-slate-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-emerald-400 mb-1">{operationalCount}/{services.length}</div>
              <div className="text-slate-400">Services Operational</div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-indigo-400">{avgUptime}%</div>
              <div className="text-slate-400">Average Uptime</div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-amber-400">
                {services.filter(s => s.status === "degraded").length}
              </div>
              <div className="text-slate-400">Degraded Services</div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid lg:grid-cols-2 gap-4">
            {services.map((service) => {
              const StatusIcon = statusIcons[service.status];
              return (
                <div
                  key={service.name}
                  className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      <p className="text-sm text-slate-400">{service.description}</p>
                      <span className="text-xs text-indigo-400">Port {service.port}</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusColors[service.status]}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium capitalize">{service.status}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Clock className="w-3 h-3" />
                        Latency
                      </div>
                      <div className="text-xl font-semibold text-white">{service.latency}ms</div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="text-slate-400 text-xs mb-1">Uptime</div>
                      <div className="text-xl font-semibold text-emerald-400">{service.uptime}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}