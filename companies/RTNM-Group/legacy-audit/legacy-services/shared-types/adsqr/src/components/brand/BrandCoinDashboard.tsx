'use client'

import { useState, useEffect } from 'react'
import { BrandCoin, BrandCoinBalance, BrandCoinTransaction, CoinRedemptionCatalog } from '@/lib/rewards/brandCoins'

interface BrandCoinDashboardProps {
  brandId: string
}

export default function BrandCoinDashboard({ brandId }: BrandCoinDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'coins' | 'distributions' | 'catalog'>('overview')
  const [coins, setCoins] = useState<BrandCoin[]>([])
  const [selectedCoin, setSelectedCoin] = useState<BrandCoin | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchCoins()
  }, [brandId])

  const fetchCoins = async () => {
    try {
      const response = await fetch(`/api/brand-coins?brandId=${brandId}`)
      const data = await response.json()
      setCoins(data.coins || [])
      if (data.coins?.length > 0 && !selectedCoin) {
        setSelectedCoin(data.coins[0])
      }
    } catch (error) {
      console.error('Failed to fetch coins:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'coins', label: 'My Coins', icon: '🪙' },
            { id: 'distributions', label: 'Distributions', icon: '📤' },
            { id: 'catalog', label: 'Redemption Catalog', icon: '🎁' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-6 py-4 text-sm font-medium border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab coins={coins} brandId={brandId} />
        )}
        {activeTab === 'coins' && (
          <CoinsTab
            coins={coins}
            selectedCoin={selectedCoin}
            onSelectCoin={setSelectedCoin}
            onCreateCoin={() => setShowCreateModal(true)}
            onRefresh={fetchCoins}
          />
        )}
        {activeTab === 'distributions' && selectedCoin && (
          <DistributionsTab coin={selectedCoin} />
        )}
        {activeTab === 'catalog' && selectedCoin && (
          <CatalogTab coin={selectedCoin} />
        )}
      </div>

      {/* Create Coin Modal */}
      {showCreateModal && (
        <CreateCoinModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(coin) => {
            setCoins([...coins, coin])
            setSelectedCoin(coin)
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}

// Overview Tab
function OverviewTab({ coins, brandId }: { coins: BrandCoin[]; brandId: string }) {
  const totalSupply = coins.reduce((sum, c) => sum + c.totalSupply, 0)
  const totalCirculating = coins.reduce((sum, c) => sum + c.circulatingSupply, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Brand Coins Overview</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Create New Coin
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{coins.length}</div>
          <div className="text-indigo-100 mt-1">Active Coins</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{totalCirculating.toLocaleString()}</div>
          <div className="text-green-100 mt-1">Total Distributed</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">{totalSupply.toLocaleString()}</div>
          <div className="text-amber-100 mt-1">Total Supply</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold">
            {totalSupply > 0 ? Math.round((totalCirculating / totalSupply) * 100) : 0}%
          </div>
          <div className="text-purple-100 mt-1">Circulation Rate</div>
        </div>
      </div>

      {/* Coins List */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-4">Your Coins</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {coins.map((coin) => (
            <div key={coin.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: coin.primaryColor }}
              >
                {coin.symbol.substring(0, 2)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{coin.name}</div>
                <div className="text-sm text-gray-500">{coin.symbol}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">{coin.circulatingSupply.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Distributed</div>
              </div>
            </div>
          ))}
          {coins.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No coins created yet. Create your first brand coin!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Coins Tab
function CoinsTab({
  coins,
  selectedCoin,
  onSelectCoin,
  onCreateCoin,
  onRefresh
}: {
  coins: BrandCoin[]
  selectedCoin: BrandCoin | null
  onSelectCoin: (coin: BrandCoin) => void
  onCreateCoin: () => void
  onRefresh: () => void
}) {
  const [balances, setBalances] = useState<BrandCoinBalance[]>([])
  const [transactions, setTransactions] = useState<BrandCoinTransaction[]>([])

  useEffect(() => {
    if (selectedCoin) {
      fetchCoinData()
    }
  }, [selectedCoin])

  const fetchCoinData = async () => {
    if (!selectedCoin) return
    // Fetch balances and transactions would go here
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Manage Coins</h2>
        <button
          onClick={onCreateCoin}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create New Coin
        </button>
      </div>

      {/* Coin Selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {coins.map((coin) => (
          <button
            key={coin.id}
            onClick={() => onSelectCoin(coin)}
            className={`
              px-4 py-3 rounded-lg border-2 whitespace-nowrap transition-all
              ${selectedCoin?.id === coin.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="font-medium">{coin.name}</div>
            <div className="text-xs text-gray-500">{coin.symbol}</div>
          </button>
        ))}
      </div>

      {selectedCoin && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Coin Details */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4">Coin Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{selectedCoin.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Symbol</span>
                <span className="font-medium">{selectedCoin.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Value (INR)</span>
                <span className="font-medium">{selectedCoin.valueInRupees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Supply</span>
                <span className="font-medium">{selectedCoin.totalSupply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Circulating</span>
                <span className="font-medium">{selectedCoin.circulatingSupply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expiration</span>
                <span className="font-medium">{selectedCoin.expirationDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Min Redemption</span>
                <span className="font-medium">{selectedCoin.minRedemptionAmount} coins</span>
              </div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-medium text-gray-900 mb-4">Distribution</h3>
            <div className="h-40 flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="12"
                    strokeDasharray={`${(selectedCoin.circulatingSupply / selectedCoin.totalSupply) * 352} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedCoin.totalSupply > 0
                        ? Math.round((selectedCoin.circulatingSupply / selectedCoin.totalSupply) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Distributed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Distributions Tab
function DistributionsTab({ coin }: { coin: BrandCoin }) {
  const [distributions, setDistributions] = useState<any[]>([])
  const [showDistributeModal, setShowDistributeModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Distributions - {coin.name}</h2>
        <button
          onClick={() => setShowDistributeModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          New Distribution
        </button>
      </div>

      {/* Distributions List */}
      <div className="bg-gray-50 rounded-xl p-6">
        {distributions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No distributions yet. Create your first distribution to reward users!
          </div>
        ) : (
          <div className="space-y-4">
            {distributions.map((dist) => (
              <div key={dist.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{dist.name}</div>
                    <div className="text-sm text-gray-500">{dist.description}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    dist.status === 'active' ? 'bg-green-100 text-green-700' :
                    dist.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {dist.status}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-gray-500">
                  <span>Amount: {dist.amountPerUser} coins</span>
                  <span>Distributed: {dist.distributedCount} / {dist.maxRecipients}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Catalog Tab
function CatalogTab({ coin }: { coin: BrandCoin }) {
  const [catalog, setCatalog] = useState<CoinRedemptionCatalog[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Redemption Catalog - {coin.name}</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Reward
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {catalog.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {item.image && (
              <div className="h-32 bg-gray-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500 mt-1">{item.description}</div>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-indigo-600">
                  {item.coinCost} {coin.symbol}
                </span>
                <span className="text-sm text-gray-500">Stock: {item.stock}</span>
              </div>
            </div>
          </div>
        ))}
        {catalog.length === 0 && (
          <div className="col-span-3 text-center py-8 text-gray-500">
            No redemption items yet. Add rewards for users to redeem their coins!
          </div>
        )}
      </div>
    </div>
  )
}

// Create Coin Modal
function CreateCoinModal({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: (coin: BrandCoin) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    valueInRupees: 1,
    expirationDays: 365,
    totalSupply: 10000,
    minRedemptionAmount: 100,
    primaryColor: '#6366f1',
    secondaryColor: '#a5b4fc'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/brand-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          coinData: formData
        })
      })

      const data = await response.json()
      if (data.coin) {
        onCreated(data.coin)
      }
    } catch (error) {
      console.error('Failed to create coin:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Brand Coin</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Coin Name</span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Symbol</span>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
              maxLength={5}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
              rows={2}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Value (INR)</span>
              <input
                type="number"
                value={formData.valueInRupees}
                onChange={(e) => setFormData({ ...formData, valueInRupees: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                step={0.01}
                min={0.01}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Total Supply</span>
              <input
                type="number"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
                min={1}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Expiration (days)</span>
            <input
              type="number"
              value={formData.expirationDays}
              onChange={(e) => setFormData({ ...formData, expirationDays: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2"
              min={1}
            />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Coin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
