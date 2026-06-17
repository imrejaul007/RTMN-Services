'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, FileText, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { FAQArticle } from '@/lib/types';

export default function FAQSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FAQArticle[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!query.trim()) return;

    setSearching(true);
    setHasSearched(true);

    const response = await api.getFAQArticles(undefined, query.trim());

    if (response.success && response.data) {
      setResults(response.data.items);
    } else {
      setResults([]);
    }

    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for answers..."
          className="input-field pl-12 pr-20 py-4 text-lg shadow-sm"
        />
        <button
          onClick={() => handleSearch()}
          disabled={searching || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        <span className="text-sm text-gray-500">Popular:</span>
        {['password reset', 'billing', 'account', 'api', 'integration'].map((term) => (
          <button
            key={term}
            onClick={() => {
              setQuery(term);
              setSearching(true);
              setHasSearched(true);
              api.getFAQArticles(undefined, term).then((response) => {
                if (response.success && response.data) {
                  setResults(response.data.items);
                } else {
                  setResults([]);
                }
                setSearching(false);
              });
            }}
            className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            {term}
          </button>
        ))}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="mt-8">
          {searching ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </p>
              <div className="space-y-3">
                {results.map((article) => (
                  <Link
                    key={article.id}
                    href={`/faq/${article.id}`}
                    className="block card p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                            {article.title}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {article.content.substring(0, 150)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="badge bg-gray-100 text-gray-600">
                              {article.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 mb-6">
                We could not find any articles matching "{query}"
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/submit" className="btn-primary">
                  Submit a Ticket
                </Link>
                <Link href="/chat" className="btn-secondary">
                  Chat with Support
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
