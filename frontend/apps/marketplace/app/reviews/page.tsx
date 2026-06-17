'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Clock,
  Workflow,
  BookOpen,
  Edit,
  Trash2,
} from 'lucide-react';
import { getMyReviews } from '@/lib/api';
import type { Review } from '@/lib/types';
import Rating from '@/components/Rating';

interface MyReview extends Review {
  itemName: string;
  itemType: 'workflow' | 'knowledge';
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const rev = await getMyReviews();
        setReviews(rev);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
              <p className="text-gray-600">Manage your reviews and ratings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Helpful Votes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reviews.reduce((sum, r) => sum + r.helpful, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Responses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reviews.filter((r) => r.response).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-6">Start by reviewing workflows and knowledge packs you have used.</p>
            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Workflows
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      review.itemType === 'workflow' ? 'bg-primary/10' : 'bg-secondary/10'
                    }`}>
                      {review.itemType === 'workflow' ? (
                        <Workflow className={`w-5 h-5 ${review.itemType === 'workflow' ? 'text-primary' : 'text-secondary'}`} />
                      ) : (
                        <BookOpen className="w-5 h-5 text-secondary" />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/${review.itemType}s/${review.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {review.itemName}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Rating value={review.rating} size="sm" />
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                <p className="text-gray-600 mb-4">{review.content}</p>

                <div className="flex items-center gap-6 text-sm">
                  <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({review.helpful})
                  </button>
                  {review.response && (
                    <div className="flex items-center gap-1 text-green-600">
                      <MessageSquare className="w-4 h-4" />
                      Author responded
                    </div>
                  )}
                </div>

                {review.response && (
                  <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Author Response</p>
                    <p className="text-sm text-gray-600">{review.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
