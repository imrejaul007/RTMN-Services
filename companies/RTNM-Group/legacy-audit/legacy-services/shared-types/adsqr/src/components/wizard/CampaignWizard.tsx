'use client'

import { useState, useEffect, useCallback } from 'react'
import { WizardFormData } from '@/app/campaigns/create/page'
import FestivalTemplate from '@/components/templates/FestivalTemplate'
import { FESTIVAL_TEMPLATES, FestivalId } from '@/lib/templates/festivalConfig'

interface CampaignWizardProps {
  onSubmit: (data: WizardFormData) => Promise<void>
  isSubmitting: boolean
}

const STEPS = [
  { id: 1, name: 'Campaign Type', description: 'Choose your campaign goal' },
  { id: 2, name: 'Offer Details', description: 'Set up your reward offer' },
  { id: 3, name: 'Budget & Duration', description: 'Set campaign budget and timeline' },
  { id: 4, name: 'Locations', description: 'Add QR code locations' },
  { id: 5, name: 'Review & Launch', description: 'Preview and go live' }
]

const STORAGE_KEY = 'campaign_wizard_draft'

export default function CampaignWizard({ onSubmit, isSubmitting }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<WizardFormData>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return {}
        }
      }
    }
    return {}
  })

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData])

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleSubmit = async () => {
    const requiredFields: (keyof WizardFormData)[] = [
      'campaignType', 'name', 'offer', 'budget', 'durationDays', 'locations'
    ]

    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please complete ${field} field`)
        return
      }
    }

    await onSubmit(formData as WizardFormData)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.campaignType
      case 2:
        return !!formData.name && !!formData.offer?.type
      case 3:
        return !!formData.budget && formData.budget > 0 && !!formData.durationDays
      case 4:
        return formData.locations && formData.locations.length > 0
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Progress Steps */}
      <div className="border-b border-gray-200">
        <nav aria-label="Progress">
          <ol className="flex">
            {STEPS.map((step, idx) => (
              <li key={step.id} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    ${currentStep > step.id ? 'bg-green-500 text-white' : ''}
                    ${currentStep === step.id ? 'bg-indigo-600 text-white' : ''}
                    ${currentStep < step.id ? 'bg-gray-200 text-gray-500' : ''}
                  `}>
                    {currentStep > step.id ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-1/2 w-full h-0.5 bg-gray-200" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-8">
        {currentStep === 1 && (
          <Step1CampaignType
            value={formData.campaignType}
            onChange={(v) => updateFormData({ campaignType: v })}
          />
        )}
        {currentStep === 2 && (
          <Step2OfferDetails
            value={formData}
            onChange={updateFormData}
          />
        )}
        {currentStep === 3 && (
          <Step3BudgetDuration
            value={formData}
            onChange={updateFormData}
          />
        )}
        {currentStep === 4 && (
          <Step4Locations
            value={formData.locations || []}
            onChange={(locs) => updateFormData({ locations: locs })}
          />
        )}
        {currentStep === 5 && (
          <Step5Preview
            formData={formData}
            onApplyTemplate={(id) => updateFormData({ festivalId: id })}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Back
        </button>

        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canProceed()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              'Launch Campaign'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Step 1: Campaign Type Selection
function Step1CampaignType({
  value,
  onChange
}: {
  value?: 'scan' | 'visit' | 'purchase'
  onChange: (v: 'scan' | 'visit' | 'purchase') => void
}) {
  const types = [
    {
      id: 'scan',
      name: 'Scan Campaign',
      description: 'Reward users for scanning your QR code',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      rewards: { scan: '10-25', visit: '-', purchase: '-' }
    },
    {
      id: 'visit',
      name: 'Visit Campaign',
      description: 'Reward users who visit your store',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      rewards: { scan: '5-10', visit: '25-50', purchase: '-' }
    },
    {
      id: 'purchase',
      name: 'Purchase Campaign',
      description: 'Reward users for making a purchase',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      rewards: { scan: '5', visit: '10', purchase: '50-100' }
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Choose Campaign Type</h2>
        <p className="text-gray-500 mt-1">Select the type of engagement you want to reward</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {types.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id as 'scan' | 'visit' | 'purchase')}
            className={`
              p-6 rounded-xl border-2 text-left transition-all
              ${value === type.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className={`mb-4 ${value === type.id ? 'text-indigo-600' : 'text-gray-400'}`}>
              {type.icon}
            </div>
            <h3 className="font-semibold text-gray-900">{type.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{type.description}</p>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-400">Reward Range (coins)</div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded">Scan: {type.rewards.scan}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Visit: {type.rewards.visit}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">Buy: {type.rewards.purchase}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Step 2: Offer Details
function Step2OfferDetails({
  value,
  onChange
}: {
  value: Partial<WizardFormData>
  onChange: (updates: Partial<WizardFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Set Up Your Offer</h2>
        <p className="text-gray-500 mt-1">Define the reward for user engagement</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Campaign Name</span>
            <input
              type="text"
              value={value.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g., Summer Sale 2024"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              value={value.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe your campaign..."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Reward Type</span>
            <select
              value={value.offer?.type || ''}
              onChange={(e) => onChange({
                offer: { ...value.offer, type: e.target.value as 'coins' | 'discount' | 'sample' | 'coupon' }
              })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select reward type</option>
              <option value="coins">REZ Coins</option>
              <option value="discount">Discount</option>
              <option value="sample">Free Sample</option>
              <option value="coupon">Coupon Code</option>
            </select>
          </label>

          {value.offer?.type === 'coins' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Coins Amount</span>
              <input
                type="number"
                value={value.offer?.coinsAmount || ''}
                onChange={(e) => onChange({
                  offer: { ...value.offer, coinsAmount: parseInt(e.target.value) || 0 }
                })}
                placeholder="e.g., 50"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </label>
          )}

          {value.offer?.type === 'discount' && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Discount Percentage</span>
                <input
                  type="number"
                  value={value.offer?.discountPercent || ''}
                  onChange={(e) => onChange({
                    offer: { ...value.offer, discountPercent: parseInt(e.target.value) || 0 }
                  })}
                  placeholder="e.g., 20"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Coupon Code (optional)</span>
                <input
                  type="text"
                  value={value.offer?.discountCode || ''}
                  onChange={(e) => onChange({
                    offer: { ...value.offer, discountCode: e.target.value }
                  })}
                  placeholder="e.g., SUMMER20"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </label>
            </>
          )}

          {value.offer?.type === 'sample' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Sample Product</span>
              <input
                type="text"
                value={value.offer?.sampleProduct || ''}
                onChange={(e) => onChange({
                  offer: { ...value.offer, sampleProduct: e.target.value }
                })}
                placeholder="e.g., Perfume Mini Pack"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </label>
          )}
        </div>
      </div>

      {/* Reward Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Reward Preview</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">
              {value.scanReward || 10}
            </div>
            <div className="text-sm text-gray-500">Coins per Scan</div>
            <input
              type="number"
              value={value.scanReward || 10}
              onChange={(e) => onChange({ scanReward: parseInt(e.target.value) || 10 })}
              className="mt-2 w-full text-center border border-gray-200 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">
              {value.visitReward || 25}
            </div>
            <div className="text-sm text-gray-500">Coins per Visit</div>
            <input
              type="number"
              value={value.visitReward || 25}
              onChange={(e) => onChange({ visitReward: parseInt(e.target.value) || 25 })}
              className="mt-2 w-full text-center border border-gray-200 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600">
              {value.purchaseReward || 50}
            </div>
            <div className="text-sm text-gray-500">Coins per Purchase</div>
            <input
              type="number"
              value={value.purchaseReward || 50}
              onChange={(e) => onChange({ purchaseReward: parseInt(e.target.value) || 50 })}
              className="mt-2 w-full text-center border border-gray-200 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 3: Budget & Duration
function Step3BudgetDuration({
  value,
  onChange
}: {
  value: Partial<WizardFormData>
  onChange: (updates: Partial<WizardFormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Budget & Duration</h2>
        <p className="text-gray-500 mt-1">Set your campaign budget and timeline</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Total Budget (coins)</span>
            <input
              type="number"
              value={value.budget || ''}
              onChange={(e) => onChange({ budget: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 10000"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Daily Limit (coins)</span>
            <input
              type="number"
              value={value.dailyLimit || ''}
              onChange={(e) => onChange({ dailyLimit: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 500"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum coins to distribute per day</p>
          </label>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Campaign Duration</span>
            <select
              value={value.durationDays || ''}
              onChange={(e) => onChange({ durationDays: parseInt(e.target.value) || 0 })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select duration</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>

          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="text-sm text-indigo-900">
              <span className="font-medium">Estimated Total Scans:</span>{' '}
              {value.budget && value.scanReward
                ? Math.floor(value.budget / value.scanReward)
                : '-'}
            </div>
            <div className="text-sm text-indigo-900 mt-1">
              <span className="font-medium">Avg. Daily Scans:</span>{' '}
              {value.budget && value.scanReward && value.durationDays
                ? Math.floor((value.budget / value.scanReward) / value.durationDays)
                : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Budget Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Campaign Duration</span>
            <span className="font-medium">{value.durationDays || 0} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Daily Limit</span>
            <span className="font-medium">{value.dailyLimit || 0} coins</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-gray-700">Max Total Budget</span>
            <span className="font-bold text-indigo-600">
              {Math.min((value.dailyLimit || 0) * (value.durationDays || 0), value.budget || 0)} coins
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4: Locations
function Step4Locations({
  value,
  onChange
}: {
  value: WizardFormData['locations']
  onChange: (locs: WizardFormData['locations']) => void
}) {
  const [newLocation, setNewLocation] = useState<Partial<WizardFormData['locations'][0]>>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    type: 'store'
  })
  const [showMap, setShowMap] = useState(false)

  const addLocation = () => {
    if (!newLocation.name || !newLocation.address) return

    const loc: WizardFormData['locations'][0] = {
      id: `loc_${Date.now()}`,
      name: newLocation.name || '',
      address: newLocation.address || '',
      lat: newLocation.lat || 0,
      lng: newLocation.lng || 0,
      type: newLocation.type || 'store'
    }

    onChange([...value, loc])
    setNewLocation({ name: '', address: '', lat: 0, lng: 0, type: 'store' })
  }

  const removeLocation = (id: string) => {
    onChange(value.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Add Locations</h2>
        <p className="text-gray-500 mt-1">Add QR code placement locations</p>
      </div>

      {/* Add Location Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Location Name</span>
            <input
              type="text"
              value={newLocation.name || ''}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              placeholder="e.g., Main Store"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Location Type</span>
            <select
              value={newLocation.type || 'store'}
              onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value as 'store' | 'event' | 'transit' | 'outdoor' })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="store">Store</option>
              <option value="event">Event</option>
              <option value="transit">Transit</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Address</span>
          <input
            type="text"
            value={newLocation.address || ''}
            onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
            placeholder="Full address"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Latitude</span>
            <input
              type="number"
              step="any"
              value={newLocation.lat || ''}
              onChange={(e) => setNewLocation({ ...newLocation, lat: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 28.6139"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Longitude</span>
            <input
              type="number"
              step="any"
              value={newLocation.lng || ''}
              onChange={(e) => setNewLocation({ ...newLocation, lng: parseFloat(e.target.value) || 0 })}
              placeholder="e.g., 77.2090"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50"
          >
            {showMap ? 'Hide Map' : 'Pick on Map'}
          </button>
          <button
            type="button"
            onClick={addLocation}
            disabled={!newLocation.name || !newLocation.address}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700"
          >
            Add Location
          </button>
        </div>
      </div>

      {/* Location List */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            Added Locations ({value.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {value.map((loc, idx) => (
              <div key={loc.id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-900">{loc.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{loc.address}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-xs rounded text-gray-600 capitalize">
                    {loc.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeLocation(loc.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {value.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No locations added yet</p>
        </div>
      )}
    </div>
  )
}

// Step 5: Preview & Launch
function Step5Preview({
  formData,
  onApplyTemplate
}: {
  formData: Partial<WizardFormData>
  onApplyTemplate: (id: string) => void
}) {
  const festivalTemplates = Object.entries(FESTIVAL_TEMPLATES).map(([id, template]) => ({
    id,
    ...template
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review & Launch</h2>
        <p className="text-gray-500 mt-1">Review your campaign and apply festive themes</p>
      </div>

      {/* Festival Templates */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Apply Festival Theme (Optional)</h3>
        <div className="grid grid-cols-4 gap-3">
          {festivalTemplates.map((festival) => (
            <button
              key={festival.id}
              onClick={() => onApplyTemplate(festival.id)}
              className={`
                p-3 rounded-lg border-2 text-center transition-all
                ${formData.festivalId === festival.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="text-2xl mb-1">{festival.emoji}</div>
              <div className="text-xs font-medium text-gray-700">{festival.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Campaign Summary</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Campaign Name</span>
              <span className="font-medium">{formData.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Campaign Type</span>
              <span className="font-medium capitalize">{formData.campaignType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reward Type</span>
              <span className="font-medium capitalize">{formData.offer?.type || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Festival Theme</span>
              <span className="font-medium">
                {formData.festivalId ? FESTIVAL_TEMPLATES[formData.festivalId as FestivalId]?.name : '-'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Budget</span>
              <span className="font-medium">{formData.budget || 0} coins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium">{formData.durationDays || 0} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Locations</span>
              <span className="font-medium">{formData.locations?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Est. Total Scans</span>
              <span className="font-medium">
                {formData.budget && formData.scanReward
                  ? Math.floor(formData.budget / formData.scanReward)
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center gap-6">
        <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">QR Codes will be generated</h4>
          <p className="text-sm text-gray-500 mt-1">
            {formData.locations?.length || 0} QR codes will be created for each location
          </p>
          <p className="text-xs text-gray-400 mt-2">
            QR codes will be available in the campaign dashboard after launch
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="text-sm text-gray-500">
        By launching this campaign, you agree to our Terms of Service and confirm that all information provided is accurate.
      </div>
    </div>
  )
}
