'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Settings, Package, Bot, Workflow, Sparkles, Building2 } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  skill: Sparkles,
  agent: Bot,
  workflow: Workflow,
  template: Package,
  'industry-os': Building2,
};

export default function InstalledPage() {
  const [installs, setInstalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstalls();
  }, []);

  const fetchInstalls = async () => {
    try {
      // Fetch user's installs from API
      const res = await fetch('http://localhost:4400/api/v1/apps?limit=50');
      const data = await res.json();
      // For demo, show installed apps
      setInstalls(data.apps?.filter((a: any) => a.installCount > 0).slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch installs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (appId: string) => {
    if (!confirm('Are you sure you want to uninstall this app?')) return;

    try {
      await fetch(`http://localhost:4400/api/v1/apps/${appId}/install?userId=demo-user&projectId=demo-project`, {
        method: 'DELETE'
      });
      setInstalls(installs.filter(i => i.id !== appId));
    } catch (error) {
      console.error('Failed to uninstall:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app-store" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-white font-medium">App Store</span>
            <span className="text-slate-500">/</span>
            <span className="text-white font-medium">My Installs</span>
          </div>
          <Link
            href="/app-store"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Browse More
          </Link>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">My Installs</h1>
            <p className="text-slate-400">Manage your installed apps, skills, and agents</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : installs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No apps installed</h2>
              <p className="text-slate-400 mb-6">Install apps from the App Store to get started</p>
              <Link
                href="/app-store"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse App Store
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {installs.map((app) => {
                const Icon = TYPE_ICONS[app.type] || Package;
                return (
                  <div
                    key={app.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-6"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                      {app.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{app.name}</h3>
                      <p className="text-slate-400 text-sm">{app.shortDescription}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleUninstall(app.id)}
                        className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
