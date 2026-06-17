'use client';

import { useState } from 'react';
import { Search, MapPin, Building, Globe, Phone, Star, Plus, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { leadOS } from '@/lib/api';

export default function DiscoverPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const searchQuery = [query, industry, location].filter(Boolean).join(' ');
      const data = await leadOS.discoverGoogle(searchQuery);
      setResults(data.results || []);
    } catch (error) {
      console.error('Discovery failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async (item: any) => {
    try {
      const enriched = await leadOS.enrichCompany(item.website || item.domain);
      console.log('Enriched data:', enriched);
      alert(`Enriched: ${enriched.company || item.name}`);
    } catch (error) {
      console.error('Enrichment failed:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discover Leads</h1>
        <p className="text-gray-500 mt-1">Find and discover new leads from multiple sources</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Lead Discovery Search</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry / Category
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="restaurants, hotels, tech..."
                className="input-field pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Dubai, Abu Dhabi, Riyadh..."
                className="input-field pl-10"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Size
            </label>
            <select className="input-field">
              <option value="">Any size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ employees</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading || (!query && !location)}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Discover Leads
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gray-500">
              Found <span className="font-semibold text-gray-900">{results.length}</span> results
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Save Search
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{result.name}</h3>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {result.category}
                      </span>
                    </div>
                  </div>
                  {result.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{result.rating}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {result.location}
                  </div>
                  {result.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {result.phone}
                    </div>
                  )}
                  {result.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a
                        href={`https://${result.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {result.website}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => handleEnrich(result)}
                    className="flex-1 btn-primary text-sm py-2 justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Add Lead
                  </button>
                  <button className="p-2 border rounded-lg hover:bg-gray-50">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : hasSearched ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">Try adjusting your search criteria or location.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start discovering leads</h3>
          <p className="text-gray-500">Enter your search criteria above to find potential leads.</p>
        </div>
      )}
    </div>
  );
}
