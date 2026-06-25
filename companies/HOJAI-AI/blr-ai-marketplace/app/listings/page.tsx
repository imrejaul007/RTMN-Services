'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getListings, getCategories } from '@/lib/api';
import type { Listing, Category, SearchFilters } from '@/types';

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
  const icon = CATEGORY_ICONS[listing.category] || '📦';

  return (
    <Link
      href={`/listings/${listing.listingId}`}
      className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{listing.publisherName}</p>
          </div>
        </div>

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
          <div>
            <span className={`text-xl font-bold ${listing.pricingModel === 'free' ? 'text-green-600' : 'text-slate-900'}`}>
              {price}
            </span>
            {listing.pricingModel !== 'free' && listing.pricingModel !== 'one-time' && (
              <span className="text-sm text-slate-500 ml-1">
                /{listing.pricingModel.replace('-', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {listing.rating && (
              <div className="flex items-center gap-1">
                <span className="text-amber-500">★</span>
                <span className="text-sm font-medium text-slate-700">{listing.rating.toFixed(1)}</span>
              </div>
            )}
            {listing.reviewCount !== undefined && listing.reviewCount > 0 && (
              <span className="text-sm text-slate-500">({listing.reviewCount})</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SearchFilters({
  categories,
  filters,
  onFilterChange,
}: {
  categories: Category[];
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Filters</h2>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
        <input
          type="text"
          placeholder="Search listings..."
          value={filters.q || ''}
          onChange={(e) => onFilterChange({ ...filters, q: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
        <select
          value={filters.category || ''}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {CATEGORY_ICONS[cat.id]} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pricing Model */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Pricing</label>
        <select
          value={filters.pricingModel || ''}
          onChange={(e) => onFilterChange({ ...filters, pricingModel: e.target.value as SearchFilters['pricingModel'] || undefined })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          <option value="free">Free</option>
          <option value="one-time">One-time</option>
          <option value="subscription">Subscription</option>
          <option value="usage-based">Usage-based</option>
          <option value="quote-only">Quote Only</option>
        </select>
      </div>

      {/* Min Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Min Rating</label>
        <select
          value={filters.minRating || ''}
          onChange={(e) => onFilterChange({ ...filters, minRating: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Any Rating</option>
          <option value="4.5">4.5+ ⭐⭐⭐⭐⭐</option>
          <option value="4">4+ ⭐⭐⭐⭐</option>
          <option value="3.5">3.5+ ⭐⭐⭐</option>
          <option value="3">3+ ⭐⭐</option>
        </select>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
        <select
          value={filters.sort || 'recent'}
          onChange={(e) => onFilterChange({ ...filters, sort: e.target.value as SearchFilters['sort'] })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="recent">Most Recent</option>
          <option value="rating">Top Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Reset */}
      <button
        onClick={() => onFilterChange({ sort: 'recent', limit: 20 })}
        className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    sort: (searchParams.get('sort') as SearchFilters['sort']) || 'recent',
    limit: 20,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [listingsRes, categoriesRes] = await Promise.all([
          getListings(filters),
          getCategories(),
        ]);
        setListings(listingsRes.listings || []);
        setTotal(listingsRes.total || 0);
        setCategories(categoriesRes.categories || []);
      } catch (error) {
        console.error('Failed to fetch listings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filters]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {filters.category
            ? categories.find(c => c.id === filters.category)?.name || 'Listings'
            : filters.q
              ? `Search: "${filters.q}"`
              : 'All Listings'}
        </h1>
        <p className="text-slate-600">
          {loading ? 'Loading...' : `${total} listings found`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <SearchFilters
            categories={categories}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Listings Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="w-14 h-14 bg-slate-200 rounded-xl" />
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No listings found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your filters or search query</p>
              <button
                onClick={() => setFilters({ sort: 'recent', limit: 20 })}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map(listing => (
                  <ListingCard key={listing.listingId} listing={listing} />
                ))}
              </div>

              {/* Pagination */}
              {total > filters.limit! && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setFilters({
                      ...filters,
                      offset: Math.max(0, (filters.offset || 0) - (filters.limit || 20)),
                    })}
                    disabled={!filters.offset}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-slate-600">
                    Showing {((filters.offset || 0) + 1)}-{Math.min((filters.offset || 0) + (filters.limit || 20), total)} of {total}
                  </span>
                  <button
                    onClick={() => setFilters({
                      ...filters,
                      offset: (filters.offset || 0) + (filters.limit || 20),
                    })}
                    disabled={(filters.offset || 0) + (filters.limit || 20) >= total}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600">Loading listings...</p>
      </div>
    }>
      <ListingsContent />
    </Suspense>
  );
}
