'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Star,
  CheckCircle2,
  FileText,
  File,
  Video,
  Link as LinkIcon,
  ThumbsUp,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { getKnowledgePack, getReviews } from '@/lib/api';
import type { KnowledgePack, Review, KnowledgeDocument } from '@/lib/types';
import Rating, { RatingSummary } from '@/components/Rating';

interface PageProps {
  params: Promise<{ id: string }>;
}

const documentIcons = {
  pdf: FileText,
  doc: File,
  video: Video,
  link: LinkIcon,
  article: FileText,
};

const documentColors = {
  pdf: 'bg-red-100 text-red-700',
  doc: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  link: 'bg-green-100 text-green-700',
  article: 'bg-gray-100 text-gray-700',
};

export default function KnowledgeDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [knowledge, setKnowledge] = useState<KnowledgePack | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kb, rev] = await Promise.all([
          getKnowledgePack(resolvedParams.id),
          getReviews(resolvedParams.id),
        ]);
        setKnowledge(kb);
        setReviews(rev);
      } catch (error) {
        console.error('Failed to load knowledge pack:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-12 w-96 bg-gray-200 rounded" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
              </div>
              <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!knowledge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Knowledge pack not found</h1>
          <Link href="/knowledge" className="text-secondary hover:underline">
            Back to knowledge packs
          </Link>
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
            href="/knowledge"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Knowledge Packs
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-secondary/10 text-secondary rounded-full">
                  {knowledge.category.replace('-', ' ')}
                </span>
                <span className="text-sm text-gray-500">v{knowledge.version}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{knowledge.name}</h1>
              <RatingSummary rating={knowledge.rating} reviewCount={knowledge.reviewCount} />
            </div>
            <div className="flex items-center gap-3">
              {knowledge.isInstalled ? (
                <Link
                  href="/knowledge/install"
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Installed
                </Link>
              ) : (
                <Link
                  href={`/knowledge/install?id=${knowledge.id}`}
                  className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  {knowledge.isFree ? 'Install Free' : `Buy for $${knowledge.price}`}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-gray-600 leading-relaxed">{knowledge.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {knowledge.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Included Documents ({knowledge.documents.length})</h2>
              <div className="space-y-3">
                {knowledge.documents.map((doc) => {
                  const Icon = documentIcons[doc.type];
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${documentColors[doc.type]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="uppercase">{doc.type}</span>
                          {doc.size && (
                            <>
                              <span>•</span>
                              <span>{doc.size}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sources */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Sources</h2>
              <div className="flex flex-wrap gap-2">
                {knowledge.sources.map((source) => (
                  <span
                    key={source}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Reviews</h2>
                <button className="text-sm text-secondary font-medium hover:underline">
                  Write a review
                </button>
              </div>

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <img
                          src={review.userAvatar}
                          alt={review.userName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{review.userName}</span>
                            <Rating value={review.rating} size="sm" />
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">{review.content}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                            <button className="flex items-center gap-1 hover:text-gray-700">
                              <ThumbsUp className="w-4 h-4" />
                              Helpful ({review.helpful})
                            </button>
                            <button className="flex items-center gap-1 hover:text-gray-700">
                              <MessageSquare className="w-4 h-4" />
                              Reply
                            </button>
                          </div>
                          {review.response && (
                            <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200">
                              <p className="text-sm text-gray-600">{review.response}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Author Card */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Author</h3>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={knowledge.author.avatar}
                  alt={knowledge.author.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{knowledge.author.name}</span>
                    {knowledge.author.verified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{knowledge.author.totalProducts} products</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium">{knowledge.author.rating}</span>
                <span className="text-gray-500">author rating</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Downloads</span>
                  </div>
                  <span className="font-medium">{knowledge.downloadCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="font-medium">{knowledge.rating} / 5</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <span className="font-medium">{knowledge.documentCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Industry</span>
                  <span className="font-medium capitalize">{knowledge.industry === 'all' ? 'All Industries' : knowledge.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium capitalize">{knowledge.category.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents</span>
                  <span className="font-medium">{knowledge.documentCount} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">{knowledge.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated</span>
                  <span className="font-medium">{new Date(knowledge.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
