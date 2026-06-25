'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/api';
import type { Category } from '@/types';

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
  'automation': '⚙️',
  'policy-pack': '📋',
  'ui-kit': '🎨',
  'theme': '🌈',
  'mobile-app': '📱',
  'prompt-pack': '💬',
  'api': '🔗',
  'mcp-server': '🖥️',
  'sdk-extension': '🛠️',
  'data': '📊',
  'simulation': '🎮',
  'ai-model': '🧬',
  'service': '⚙️',
  'consulting': '💼',
  'training': '🎓',
  'autonomous-network': '🌐',
  'marketplace-blueprint': '🏪',
  'business-playbook': '📖',
};

const CATEGORY_COLORS: Record<string, string> = {
  'ai-employee': 'from-amber-500 to-orange-600',
  'agent': 'from-blue-500 to-cyan-600',
  'ai-team': 'from-purple-500 to-pink-600',
  'skill': 'from-yellow-500 to-amber-600',
  'twin': 'from-cyan-500 to-blue-600',
  'department-os': 'from-purple-500 to-indigo-600',
  'industry-os': 'from-green-500 to-emerald-600',
  'business-capability-pack': 'from-red-500 to-pink-600',
  'company-blueprint': 'from-orange-500 to-red-600',
  'workflow': 'from-blue-500 to-indigo-600',
};

function CategoryCard({ category }: { category: Category }) {
  const icon = CATEGORY_ICONS[category.id] || '📦';
  const colorClass = CATEGORY_COLORS[category.id] || 'from-slate-500 to-slate-600';

  return (
    <Link
      href={`/category/${category.id}`}
      className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300"
    >
      <div className={`h-2 bg-gradient-to-r ${colorClass}`} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <div className="flex gap-2">
            {category.killer && (
              <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full animate-pulse">
                🔥 KILLER
              </span>
            )}
            {category.featured && !category.killer && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                ⭐ Featured
              </span>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
          {category.name}
        </h3>

        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {category.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500">Browse category</span>
          <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getCategories();
        setCategories(res.categories || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const killerCategories = categories.filter(c => c.killer);
  const featuredCategories = categories.filter(c => c.featured && !c.killer);
  const otherCategories = categories.filter(c => !c.featured && !c.killer);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Categories
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl">
          Browse AI-native business assets across 35+ categories. From individual AI agents to complete business solutions.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-2 bg-slate-200" />
              <div className="p-6">
                <div className="w-16 h-16 bg-slate-200 rounded-xl mb-4" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Killer Categories */}
          {killerCategories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🔥</span>
                <h2 className="text-2xl font-bold text-slate-900">Killer Categories</h2>
              </div>
              <p className="text-slate-600 mb-6">
                The categories that make BAM different from every other marketplace
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {killerCategories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </section>
          )}

          {/* Featured Categories */}
          {featuredCategories.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⭐</span>
                <h2 className="text-2xl font-bold text-slate-900">Featured Categories</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredCategories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </section>
          )}

          {/* Other Categories */}
          {otherCategories.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📂</span>
                <h2 className="text-2xl font-bold text-slate-900">All Categories</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {otherCategories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
