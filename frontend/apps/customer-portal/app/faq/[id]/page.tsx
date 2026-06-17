'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ThumbsUp, ThumbsDown, Clock, User, ChevronRight, Share2 } from 'lucide-react';
import api from '@/lib/api';
import type { FAQArticle } from '@/lib/types';

export default function FAQArticlePage() {
  const params = useParams();
  const articleId = params.id as string;
  const [article, setArticle] = useState<FAQArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<'helpful' | 'notHelpful' | null>(null);
  const [ratingCounts, setRatingCounts] = useState({ helpful: 0, notHelpful: 0 });

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      const response = await api.getFAQArticle(articleId);

      if (response.success && response.data) {
        setArticle(response.data);
        setRatingCounts({
          helpful: response.data.helpful,
          notHelpful: response.data.notHelpful,
        });
      } else {
        setError(response.error || 'Article not found');
      }
      setLoading(false);
    };

    fetchArticle();
  }, [articleId]);

  const handleRate = async (helpful: boolean) => {
    const response = await api.rateFAQArticle(articleId, helpful);
    if (response.success && response.data) {
      setRating(helpful ? 'helpful' : 'notHelpful');
      setRatingCounts(response.data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Article not found'}</p>
        <Link href="/faq" className="btn-primary">
          Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/faq"
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary-600"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Help Center
        </Link>
      </nav>

      <article className="card p-8">
        {/* Header */}
        <header className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
            <span className="badge bg-gray-100 text-gray-600">{article.category}</span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Updated {new Date(article.updatedAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <div
            className="text-gray-700 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>') }}
          />
        </div>

        {/* Actions */}
        <footer className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Rating */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Was this article helpful?</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleRate(true)}
                  disabled={rating !== null}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                    rating === 'helpful'
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Yes ({ratingCounts.helpful})</span>
                </button>
                <button
                  onClick={() => handleRate(false)}
                  disabled={rating !== null}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                    rating === 'notHelpful'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'border-gray-300 text-gray-600 hover:border-red-300 hover:bg-red-50'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>No ({ratingCounts.notHelpful})</span>
                </button>
              </div>
            </div>

            {/* Share */}
            <div>
              <button className="flex items-center space-x-1 text-gray-600 hover:text-primary-600">
                <Share2 className="w-4 h-4" />
                <span>Share this article</span>
              </button>
            </div>
          </div>
        </footer>
      </article>

      {/* Related Articles */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Related Articles</h2>
        <div className="space-y-3">
          <RelatedArticleLink title="How to reset your password" href="/faq/reset-password" />
          <RelatedArticleLink title="Two-factor authentication setup" href="/faq/2fa-setup" />
          <RelatedArticleLink title="Account security best practices" href="/faq/security-best-practices" />
        </div>
      </section>

      {/* Need More Help */}
      <section className="mt-8 card p-6 bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Need more help?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Could not find what you were looking for?
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/submit" className="btn-primary text-sm">
            Submit a Ticket
          </Link>
          <Link href="/chat" className="btn-secondary text-sm">
            Live Chat
          </Link>
        </div>
      </section>
    </div>
  );
}

function RelatedArticleLink({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="text-gray-700">{title}</span>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}
