'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Download, Check, Clock, Users, Code, Package, Bot, Workflow } from 'lucide-react';

const APP_ICONS: Record<string, any> = {
  skill: require('lucide-react').Sparkles,
  agent: require('lucide-react').Bot,
  workflow: require('lucide-react').Workflow,
  template: require('lucide-react').Package,
  'industry-os': require('lucide-react').Building2,
};

export default function AppDetailPage() {
  const params = useParams();
  const [app, setApp] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchApp(params.id as string);
      fetchReviews(params.id as string);
    }
  }, [params.id]);

  const fetchApp = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4400/api/v1/apps/${id}`);
      const data = await res.json();
      setApp(data.app);
    } catch (error) {
      console.error('Failed to fetch app:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:4400/api/v1/apps/${id}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const res = await fetch(`http://localhost:4400/api/v1/apps/${app.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          projectId: 'demo-project',
          config: {}
        })
      });
      if (res.ok) {
        setInstalled(true);
      }
    } catch (error) {
      console.error('Failed to install:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">App not found</h2>
          <Link href="/app-store" className="text-blue-400 hover:text-blue-300">Back to App Store</Link>
        </div>
      </div>
    );
  }

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
          </div>
        </div>
      </header>

      <main className="pt-20 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* App Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
                {app.icon}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">{app.name}</h1>
                  {app.verified && (
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-slate-400 mb-4">{app.shortDescription}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    {app.rating} ({app.reviewCount} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {app.installCount.toLocaleString()} installs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {new Date(app.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 bg-slate-800 rounded text-xs">
                    v{app.version}
                  </span>
                </div>
              </div>

              {/* Install Button */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl font-bold text-white">
                  {app.price === 0 ? 'Free' : `$${app.price}`}
                </div>
                <button
                  onClick={handleInstall}
                  disabled={installing || installed}
                  className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                    installed
                      ? 'bg-green-500 text-white cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {installing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : installed ? (
                    <>
                      <Check className="w-5 h-5" />
                      Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Install
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">About</h2>
                <p className="text-slate-300 leading-relaxed">{app.description}</p>
              </div>

              {/* Features */}
              {app.features?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
                  <ul className="space-y-3">
                    {app.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reviews */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Reviews ({reviews.length})
                </h2>
                {reviews.length === 0 ? (
                  <p className="text-slate-400">No reviews yet. Be the first to review!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id} className="border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-600'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-slate-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.title && (
                          <h4 className="font-medium text-white mb-1">{review.title}</h4>
                        )}
                        <p className="text-slate-400 text-sm">{review.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Information</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Author</dt>
                    <dd className="text-white">{app.author}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Version</dt>
                    <dd className="text-white">v{app.version}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Compatibility</dt>
                    <dd className="text-white">{app.compatibility}</dd>
                  </div>
                </dl>
              </div>

              {/* Requirements */}
              {app.requirements?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Requirements</h3>
                  <ul className="space-y-2">
                    {app.requirements.map((req: string) => (
                      <li key={req} className="flex items-center gap-2 text-sm text-slate-300">
                        <Code className="w-4 h-4 text-slate-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {app.tags?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {app.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
