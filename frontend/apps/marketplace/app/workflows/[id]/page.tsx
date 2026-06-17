'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Star,
  Users,
  Clock,
  CheckCircle2,
  Zap,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  GitBranch,
} from 'lucide-react';
import { getWorkflow, getReviews } from '@/lib/api';
import type { Workflow, Review } from '@/lib/types';
import Rating, { RatingSummary } from '@/components/Rating';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [wf, rev] = await Promise.all([
          getWorkflow(resolvedParams.id),
          getReviews(resolvedParams.id),
        ]);
        setWorkflow(wf);
        setReviews(rev);
      } catch (error) {
        console.error('Failed to load workflow:', error);
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

  if (!workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Workflow not found</h1>
          <Link href="/workflows" className="text-primary hover:underline">
            Back to workflows
          </Link>
        </div>
      </div>
    );
  }

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyColors[workflow.difficulty]}`}>
                  {workflow.difficulty}
                </span>
                <span className="text-sm text-gray-500">v{workflow.version}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{workflow.name}</h1>
              <RatingSummary rating={workflow.rating} reviewCount={workflow.reviewCount} />
            </div>
            <div className="flex items-center gap-3">
              {workflow.isInstalled ? (
                <Link
                  href="/workflows/install"
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Installed
                </Link>
              ) : (
                <Link
                  href={`/workflows/install?id=${workflow.id}`}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  {workflow.isFree ? 'Install Free' : `Buy for $${workflow.price}`}
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
              <p className="text-gray-600 leading-relaxed">{workflow.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {workflow.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Workflow Steps</h2>
              <div className="space-y-4">
                {workflow.steps.map((step, index) => (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      {index < workflow.steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch className="w-4 h-4 text-gray-400" />
                          <h4 className="font-medium text-gray-900">{step.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 bg-white border rounded">{step.service}</span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="px-2 py-0.5 bg-white border rounded">{step.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold mb-4">Integrations</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {workflow.integrations.map((integration) => (
                  <div
                    key={integration}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{integration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Reviews</h2>
                <button className="text-sm text-primary font-medium hover:underline">
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
                  src={workflow.author.avatar}
                  alt={workflow.author.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{workflow.author.name}</span>
                    {workflow.author.verified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{workflow.author.totalProducts} products</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium">{workflow.author.rating}</span>
                <span className="text-gray-500">author rating</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Installs</span>
                  </div>
                  <span className="font-medium">{workflow.installCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <span className="font-medium">{workflow.rating} / 5</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Est. Time</span>
                  </div>
                  <span className="font-medium">{workflow.estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* Quick Install */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Industry</span>
                  <span className="font-medium capitalize">{workflow.industry === 'all' ? 'All Industries' : workflow.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium capitalize">{workflow.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty</span>
                  <span className="font-medium capitalize">{workflow.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">{workflow.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated</span>
                  <span className="font-medium">{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
