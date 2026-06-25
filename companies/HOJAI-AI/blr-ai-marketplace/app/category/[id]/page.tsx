'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCategory, getListings } from '@/lib/api';
import type { Category, Listing } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  'ai-employee': '👔',
  'agent': '🤖',
  'ai-team': '👥',
  'skill': '⚡',
  'twin': '🔄',
  'department-os': '🏢',
  'industry-os': '🏭',
  'business-capability-pack': '📦',
  'company-blueprint': '🏗️',
  'workflow': '🔧',
  'widget': '🧩',
  'integration': '🔌',
  'analytics': '📊',
  'knowledge-pack': '📚',
  'starter-kit': '🚀',
};

function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.price ? `₹${(listing.price / 100).toLocaleString('en-IN')}` : 'Free';

  return (
    <Link
      href={`/listings/${listing.listingId}`}
      className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300"
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {listing.shortDescription || listing.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(listing.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className={`text-lg font-bold ${listing.pricingModel === 'free' ? 'text-green-600' : 'text-slate-900'}`}>
            {price}
          </span>
          {listing.rating && (
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span className="text-sm font-medium text-slate-700">{listing.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [catRes, listingsRes] = await Promise.all([
          getCategory(categoryId).catch(() => null),
          getListings({ category: categoryId, limit: 50 }),
        ]);
        setCategory(catRes);
        setListings(listingsRes.listings || []);
        setTotal(listingsRes.total || 0);
      } catch (error) {
        console.error('Failed to fetch category:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryId]);

  const icon = CATEGORY_ICONS[categoryId] || '📦';
  const displayCategory = category || { id: categoryId, icon, name: categoryId, description: '' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-blue-600">Categories</Link>
          <span>/</span>
          <span className="text-slate-900">{displayCategory.name}</span>
        </nav>

        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{displayCategory.name}</h1>
              {displayCategory.killer && (
                <span className="px-3 py-1 text-sm font-bold bg-red-100 text-red-700 rounded-full">
                  KILLER
                </span>
              )}
              {displayCategory.featured && !displayCategory.killer && (
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
                  Featured
                </span>
              )}
            </div>
            <p className="text-slate-600 max-w-2xl">{displayCategory.description}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-500">Listings</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {listings.filter(l => l.pricingModel === 'free').length}
          </div>
          <div className="text-sm text-slate-500">Free</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {listings.filter(l => l.rating && l.rating >= 4.5).length}
          </div>
          <div className="text-sm text-slate-500">Top Rated</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">
            {listings.reduce((sum, l) => sum + (l.installCount || 0), 0)}
          </div>
          <div className="text-sm text-slate-500">Total Installs</div>
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="text-6xl mb-4">{icon}</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No listings yet</h3>
          <p className="text-slate-600 mb-6">Be the first to publish in this category!</p>
          <Link
            href="/publish"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Publish Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(listing => (
            <ListingCard key={listing.listingId} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
