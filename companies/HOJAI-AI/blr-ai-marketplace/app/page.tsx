'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCategories, getListings } from '@/lib/api';
import type { Category, Listing } from '@/types';

// Category icons mapping
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

function CategoryCard({ category, count }: { category: Category; count: number }) {
  const icon = CATEGORY_ICONS[category.id] || '📦';

  return (
    <Link
      href={`/category/${category.id}`}
      className="group block p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {category.killer && (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            KILLER
          </span>
        )}
        {category.featured && !category.killer && (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            Featured
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
        {category.name}
      </h3>

      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
        {category.description}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{count} listings</span>
        <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
          Browse →
        </span>
      </div>
    </Link>
  );
}

function FeaturedListing({ listing }: { listing: Listing }) {
  const price = listing.price ? `₹${(listing.price / 100).toLocaleString('en-IN')}` : 'Free';
  const pricingModel = listing.pricingModel;

  return (
    <Link
      href={`/listings/${listing.listingId}`}
      className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl">
            {CATEGORY_ICONS[listing.category] || '📦'}
          </div>
          {listing.rating && listing.rating >= 4.5 && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              ⭐ Top Rated
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
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
          <div>
            <span className={`text-lg font-bold ${pricingModel === 'free' ? 'text-green-600' : 'text-slate-900'}`}>
              {price}
            </span>
            {pricingModel !== 'free' && (
              <span className="text-sm text-slate-500 ml-1">/{pricingModel.replace('-', ' ')}</span>
            )}
          </div>
          {listing.rating && (
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span className="text-sm font-medium text-slate-700">{listing.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-500">({listing.reviewCount || 0})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, listingsRes] = await Promise.all([
          getCategories(),
          getListings({ sort: 'rating', limit: 6 }),
        ]);
        setCategories(catRes.categories || []);
        setFeaturedListings(listingsRes.listings || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                AI-Native Business Assets
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              The world&apos;s largest marketplace for AI employees, agents, digital twins, workflows, and complete business solutions.
              Hire AI workers. Build faster.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/categories"
                className="px-8 py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/listings?category=ai-employee"
                className="px-8 py-4 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
              >
                Hire AI Employees
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-white/10">
              <div>
                <div className="text-3xl font-bold text-white">35+</div>
                <div className="text-sm text-slate-400">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">300+</div>
                <div className="text-sm text-slate-400">Listings</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">10</div>
                <div className="text-sm text-slate-400">AI Employees</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">70%</div>
                <div className="text-sm text-slate-400">Revenue Share</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Killer Categories */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">🔥 Killer Categories</h2>
              <p className="text-slate-600 mt-1">The categories that make BAM different from every other marketplace</p>
            </div>
            <Link href="/categories" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="p-6 bg-white rounded-xl border border-slate-200 animate-pulse">
                  <div className="w-14 h-14 bg-slate-200 rounded-xl mb-4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))
            ) : (
              categories
                .filter(c => c.killer || c.featured)
                .slice(0, 6)
                .map(category => (
                  <CategoryCard key={category.id} category={category} count={0} />
                ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">⭐ Featured Listings</h2>
              <p className="text-slate-600 mt-1">Top-rated AI assets ready to power your business</p>
            </div>
            <Link href="/listings?sort=rating" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="p-6">
                    <div className="w-12 h-12 bg-slate-200 rounded-lg mb-4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-full mb-4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              featuredListings.slice(0, 6).map(listing => (
                <FeaturedListing key={listing.listingId} listing={listing} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers earning passive income by publishing AI assets on BAM.
            Get 70-80% revenue share.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/publish"
              className="px-8 py-4 text-lg font-semibold bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-lg transition-all"
            >
              Start Publishing
            </Link>
            <Link
              href="/docs"
              className="px-8 py-4 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
