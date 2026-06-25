'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Trash2, Rocket, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, show empty state
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-white font-bold">HOJAI Studio</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-white font-medium">Dashboard</span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Your Projects</h1>
              <p className="text-slate-400">
                Manage your AI-native companies
              </p>
            </div>
            <Link
              href="/wizard"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </Link>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                No projects yet
              </h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Create your first AI-native company and it will appear here.
                Get started in just 30 seconds.
              </p>
              <Link
                href="/wizard"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Rocket className="w-5 h-5" />
                Build Your First Company
              </Link>
            </div>
          ) : (
            /* Projects grid */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                        <p className="text-sm text-slate-400">{project.template}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'deployed'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.agents?.slice(0, 3).map((agent: string) => (
                        <span
                          key={agent}
                          className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs"
                        >
                          {agent}
                        </span>
                      ))}
                    </div>

                    <p className="text-sm text-slate-500 mb-4">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="border-t border-slate-800 px-6 py-4 flex items-center gap-2">
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </a>
                    )}
                    <button className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
