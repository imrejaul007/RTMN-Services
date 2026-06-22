import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Heart, AlertTriangle, MessageSquare, Palette, Package } from 'lucide-react'
import {
  getCustomerContext,
  getCustomerIntelligence,
  addStylistNote,
  recordServiceComplete,
  recordHairColor,
  recordProductReaction,
  getServicePlan,
  type StylistCustomer,
  type CustomerIntelligence,
} from '../lib/api'

export default function CustomerView() {
  const { customerId } = useParams<{ customerId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState<'treatment' | 'preference' | 'allergy' | 'concern' | 'general'>('general')

  const { data: context, isLoading: contextLoading } = useQuery({
    queryKey: ['customer-context', customerId],
    queryFn: () => getCustomerContext(customerId!),
    enabled: !!customerId,
  })

  const { data: intelligence } = useQuery({
    queryKey: ['customer-intelligence', customerId],
    queryFn: () => getCustomerIntelligence(customerId!),
    enabled: !!customerId,
  })

  const { data: servicePlan } = useQuery({
    queryKey: ['service-plan', customerId],
    queryFn: () => getServicePlan(customerId!),
    enabled: !!customerId,
  })

  const noteMutation = useMutation({
    mutationFn: () => addStylistNote(customerId!, noteText, noteCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-context', customerId] })
      setNoteText('')
    },
  })

  if (!customerId) return null

  if (contextLoading) {
    return <div className="p-6 text-center">Loading customer data...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{context?.name || 'Customer'}</h1>
            <p className="text-sm text-gray-500">{context?.phone}</p>
          </div>
          <TierBadge tier={intelligence?.customerTier || 'new'} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Beauty Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-500" />
            Beauty Profile
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <ProfileItem label="Hair Type" value={context?.hairType || 'Not set'} />
            <ProfileItem label="Hair Texture" value={context?.hairTexture || 'Not set'} />
            <ProfileItem label="Scalp" value={context?.scalpCondition || 'Not set'} />
            <ProfileItem label="Skin" value={context?.skinType || 'Not set'} />
          </div>
          {context?.allergies && context.allergies.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                <AlertTriangle className="w-4 h-4" />
                Allergies
              </div>
              <p className="text-sm text-red-600">{context.allergies.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Current Color */}
        {context?.currentColorFormula && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Color Formula</h2>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: context.currentColorFormula.color }}
              />
              <div>
                <p className="font-medium text-gray-900">{context.currentColorFormula.color}</p>
                <p className="text-sm text-gray-500">{context.currentColorFormula.brand}</p>
              </div>
            </div>
          </div>
        )}

        {/* Visit Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" />
            Visit History
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-600">{intelligence?.visitStats.totalVisits || 0}</p>
              <p className="text-xs text-gray-500">Total Visits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-600">₹{(intelligence?.visitStats.totalSpent || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-600">{intelligence?.visitStats.daysSinceLastVisit || 999}</p>
              <p className="text-xs text-gray-500">Days Since Visit</p>
            </div>
          </div>
        </div>

        {/* Active Notes */}
        {context?.activeNotes && context.activeNotes.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-500" />
              Stylist Notes
            </h2>
            <div className="space-y-3">
              {context.activeNotes.map((note, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      note.category === 'allergy' ? 'bg-red-100 text-red-700' :
                      note.category === 'concern' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {note.category}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(note.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Note */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h2>
          <div className="space-y-3">
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as typeof noteCategory)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="general">General</option>
              <option value="treatment">Treatment</option>
              <option value="preference">Preference</option>
              <option value="allergy">Allergy</option>
              <option value="concern">Concern</option>
            </select>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
            <button
              onClick={() => noteMutation.mutate()}
              disabled={!noteText.trim() || noteMutation.isPending}
              className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {noteMutation.isPending ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        {/* Service Recommendations */}
        {servicePlan?.recommendations && servicePlan.recommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-500" />
              Service Recommendations
            </h2>
            <div className="space-y-3">
              {servicePlan.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                <div key={idx} className="p-3 bg-brand-50 rounded-lg border border-brand-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{rec.serviceName}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products to Avoid */}
        {context?.productsToAvoid && context.productsToAvoid.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Products to Avoid
            </h2>
            <div className="flex flex-wrap gap-2">
              {context.productsToAvoid.map((product, idx) => (
                <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  {product}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-900 capitalize">{value}</p>
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    regular: 'bg-blue-100 text-blue-700',
    vip: 'bg-purple-100 text-purple-700',
    'at-risk': 'bg-amber-100 text-amber-700',
    churned: 'bg-red-100 text-red-700',
  }

  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${styles[tier] || styles.new}`}>
      {tier.replace('-', ' ')}
    </span>
  )
}
