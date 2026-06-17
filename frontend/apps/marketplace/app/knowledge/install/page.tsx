'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  FolderOpen,
  ChevronDown,
  FileText,
  File,
  Video,
} from 'lucide-react';
import { getKnowledgePack, installItem } from '@/lib/api';
import type { KnowledgePack } from '@/lib/types';

const documentIcons = {
  pdf: FileText,
  doc: File,
  video: Video,
  link: FileText,
  article: FileText,
};

function InstallContent() {
  const searchParams = useSearchParams();
  const knowledgeId = searchParams.get('id');

  const [knowledge, setKnowledge] = useState<KnowledgePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKnowledge() {
      if (!knowledgeId) {
        setLoading(false);
        return;
      }
      try {
        const kb = await getKnowledgePack(knowledgeId);
        setKnowledge(kb);
      } catch (err) {
        setError('Failed to load knowledge pack');
      } finally {
        setLoading(false);
      }
    }
    loadKnowledge();
  }, [knowledgeId]);

  const handleInstall = async () => {
    if (!knowledge) return;

    setInstalling(true);
    setError(null);

    try {
      const result = await installItem({
        itemId: knowledge.id,
        itemType: 'knowledge',
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Installation failed');
      }
    } catch (err) {
      setError('An error occurred during installation');
    } finally {
      setInstalling(false);
    }
  };

  if (!knowledgeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No knowledge pack selected</h1>
          <Link href="/knowledge" className="text-secondary hover:underline">
            Browse knowledge packs
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (!knowledge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Knowledge pack not found</h1>
          <Link href="/knowledge" className="text-secondary hover:underline">
            Browse knowledge packs
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Download Complete!</h1>
          <p className="text-gray-600 mb-6">
            {knowledge.name} has been successfully installed to your library.
          </p>
          <div className="space-y-3">
            <Link
              href={`/knowledge/${knowledge.id}`}
              className="block w-full px-4 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-colors"
            >
              View Knowledge Pack
            </Link>
            <Link
              href="/knowledge"
              className="block w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Browse More Knowledge
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href={`/knowledge/${knowledge.id}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {knowledge.name}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Install Knowledge Pack</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Knowledge Pack Preview */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-8 h-8 text-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{knowledge.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{knowledge.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{knowledge.documents.length} documents</span>
                  <span>{knowledge.sources.length} sources</span>
                  <span className="capitalize">{knowledge.category.replace('-', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Preview */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Included Documents</h3>
            <div className="space-y-2">
              {knowledge.documents.slice(0, 3).map((doc) => {
                const Icon = documentIcons[doc.type];
                return (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="flex-1 text-sm">{doc.title}</span>
                    {doc.size && (
                      <span className="text-xs text-gray-400">{doc.size}</span>
                    )}
                  </div>
                );
              })}
              {knowledge.documents.length > 3 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  +{knowledge.documents.length - 3} more documents
                </p>
              )}
            </div>
          </div>

          {/* Installation Options */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Installation Options</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Library Folder
                </label>
                <div className="relative">
                  <select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary appearance-none">
                    <option>Knowledge Library</option>
                    <option>Team Resources</option>
                    <option>Training Materials</option>
                    <option>Compliance Docs</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add to favorites</p>
                    <p className="text-xs text-gray-500">Quick access from your dashboard</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Notify on updates</p>
                    <p className="text-xs text-gray-500">Get notified when new versions are available</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">What's Included</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>{knowledge.documents.length} documents (PDF, DOC, Video)</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>{knowledge.sources.length} verified sources</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Lifetime access with updates</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Industry-specific content</span>
              </li>
            </ul>
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {knowledge.isFree ? 'Free' : `$${knowledge.price}`}
                </p>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {knowledge.isFree ? 'Download Free' : 'Purchase & Download'}
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By installing, you agree to the RTMN Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      }
    >
      <InstallContent />
    </Suspense>
  );
}
