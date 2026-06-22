'use client'

import { useState, useEffect } from 'react'

// Types
export interface SampleProduct {
  id: string
  campaignId: string
  brandId: string
  name: string
  description: string
  category: string
  image: string
  stock: number
  maxPerUser: number
  value: number
  expiryDate?: string
  terms: string
  isActive: boolean
  createdAt: string
}

export interface SampleRequest {
  id: string
  sampleId: string
  userId: string
  productName: string
  status: 'pending' | 'approved' | 'ready' | 'claimed' | 'cancelled' | 'expired'
  pickupCode: string
  pickupLocation: {
    name: string
    address: string
    lat: number
    lng: number
  }
  requestedAt: string
  approvedAt?: string
  expiresAt?: string
  claimedAt?: string
  feedback?: {
    rating: number
    comment: string
  }
}

interface SampleCatalogProps {
  campaignId?: string
  userId?: string
}

export default function SampleCatalog({ campaignId, userId }: SampleCatalogProps) {
  const [samples, setSamples] = useState<SampleProduct[]>([])
  const [requests, setRequests] = useState<SampleRequest[]>([])
  const [selectedSample, setSelectedSample] = useState<SampleProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'catalog' | 'requests'>('catalog')

  useEffect(() => {
    fetchSamples()
    if (userId) fetchRequests()
  }, [campaignId, userId])

  const fetchSamples = async () => {
    try {
      const url = campaignId
        ? `/api/samples/available?campaignId=${campaignId}`
        : '/api/samples/available'
      const response = await fetch(url)
      const data = await response.json()
      setSamples(data.samples || [])
    } catch (error) {
      console.error('Failed to fetch samples:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    if (!userId) return
    try {
      const response = await fetch(`/api/samples/requests?userId=${userId}`)
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    }
  }

  const requestSample = async (sampleId: string) => {
    if (!userId) {
      alert('Please login to request samples')
      return
    }

    try {
      const response = await fetch('/api/samples/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId,
          userId
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Sample requested successfully! Check your requests for pickup details.')
        fetchRequests()
        setActiveTab('requests')
      } else {
        alert(data.error || 'Failed to request sample')
      }
    } catch (error) {
      console.error('Failed to request sample:', error)
      alert('Failed to request sample')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'catalog'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sample Catalog
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Requests ({requests.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'catalog' && (
          <CatalogView
            samples={samples}
            loading={loading}
            onSelectSample={setSelectedSample}
            onRequest={requestSample}
            userId={userId}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsView
            requests={requests}
            onRefresh={fetchRequests}
          />
        )}
      </div>

      {/* Sample Detail Modal */}
      {selectedSample && (
        <SampleDetailModal
          sample={selectedSample}
          onClose={() => setSelectedSample(null)}
          onRequest={() => {
            requestSample(selectedSample.id)
            setSelectedSample(null)
          }}
          userId={userId}
        />
      )}
    </div>
  )
}

// Catalog View
function CatalogView({
  samples,
  loading,
  onSelectSample,
  onRequest,
  userId
}: {
  samples: SampleProduct[]
  loading: boolean
  onSelectSample: (sample: SampleProduct) => void
  onRequest: (sampleId: string) => void
  userId?: string
}) {
  const [category, setCategory] = useState<string>('all')

  const categories = ['all', ...new Set(samples.map(s => s.category))]
  const filteredSamples = category === 'all'
    ? samples
    : samples.filter(s => s.category === category)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              category === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Sample Grid */}
      {filteredSamples.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p>No samples available in this category</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredSamples.map((sample) => (
            <div
              key={sample.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 bg-gray-100 relative">
                {sample.image ? (
                  <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                {sample.stock === 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                  {sample.category}
                </div>
                <h3 className="font-semibold text-gray-900 mt-1">{sample.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sample.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Value: {sample.value}</span>
                  <span className={`text-xs ${sample.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {sample.stock > 0 ? `${sample.stock} left` : 'Out of stock'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onSelectSample(sample)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onRequest(sample.id)}
                    disabled={sample.stock === 0 || !userId}
                    className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Requests View
function RequestsView({
  requests,
  onRefresh
}: {
  requests: SampleRequest[]
  onRefresh: () => void
}) {
  const getStatusColor = (status: SampleRequest['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      ready: 'bg-green-100 text-green-700',
      claimed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-500'
    }
    return colors[status]
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No sample requests yet</p>
        <p className="text-sm mt-1">Browse the catalog to request free samples</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{request.productName}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Requested: {new Date(request.requestedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(request.status)}`}>
              {request.status}
            </span>
          </div>

          {request.status === 'ready' && (
            <div className="mt-4 bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-900">Pickup Information</div>
              <div className="mt-2 text-sm text-green-800">
                <div className="font-medium">{request.pickupLocation.name}</div>
                <div>{request.pickupLocation.address}</div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="bg-white rounded-lg px-4 py-2 border-2 border-dashed border-green-500">
                  <div className="text-xs text-green-600">Pickup Code</div>
                  <div className="text-xl font-bold text-green-700 tracking-wider">{request.pickupCode}</div>
                </div>
                {request.expiresAt && (
                  <div className="text-xs text-green-600">
                    Expires: {new Date(request.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {request.status === 'claimed' && request.feedback && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900">Your Feedback</div>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= request.feedback!.rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
              </div>
              {request.feedback.comment && (
                <p className="text-sm text-gray-600 mt-1">{request.feedback.comment}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Sample Detail Modal
function SampleDetailModal({
  sample,
  onClose,
  onRequest,
  userId
}: {
  sample: SampleProduct
  onClose: () => void
  onRequest: () => void
  userId?: string
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="h-56 bg-gray-100 relative">
          {sample.image ? (
            <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
            {sample.category}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mt-1">{sample.name}</h2>
          <p className="text-gray-600 mt-2">{sample.description}</p>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Value:</span>
              <span className="font-medium">{sample.value}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Stock:</span>
              <span className={`font-medium ${sample.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sample.stock > 0 ? `${sample.stock} available` : 'Out of stock'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">Terms & Conditions</div>
            <p className="text-sm text-gray-600 mt-1">{sample.terms}</p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onRequest}
              disabled={sample.stock === 0 || !userId}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sample.stock === 0 ? 'Out of Stock' : !userId ? 'Login to Request' : 'Request Sample'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
