'use client'

import { useState, useEffect } from 'react'

interface QRContent {
  default_content: {
    type: 'campaign' | 'url' | 'landing'
    value: string
  }
  time_based: TimeBasedContent[]
  location_based: LocationBasedContent[]
}

interface TimeBasedContent {
  id: string
  start_time: string
  end_time: string
  content: {
    type: 'campaign' | 'url' | 'landing'
    value: string
  }
  priority: number
}

interface LocationBasedContent {
  id: string
  lat: number
  lng: number
  radius_meters: number
  content: {
    type: 'campaign' | 'url' | 'landing'
    value: string
  }
  priority: number
}

interface QRContentManagerProps {
  qrId: string
  onUpdate?: (content: QRContent) => void
}

export default function QRContentManager({ qrId, onUpdate }: QRContentManagerProps) {
  const [content, setContent] = useState<QRContent>({
    default_content: { type: 'campaign', value: '' },
    time_based: [],
    location_based: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'default' | 'time' | 'location'>('default')

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/qr/${qrId}/content`)
        if (res.ok) {
          const data = await res.json()
          setContent(data.content || content)
        }
      } catch (error) {
        console.error('Failed to fetch QR content:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [qrId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/qr/${qrId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (res.ok && onUpdate) {
        onUpdate(content)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const addTimeBasedContent = () => {
    const newContent: TimeBasedContent = {
      id: `time_${Date.now()}`,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      content: { type: 'url', value: '' },
      priority: content.time_based.length + 1
    }
    setContent(prev => ({
      ...prev,
      time_based: [...prev.time_based, newContent]
    }))
  }

  const updateTimeBasedContent = (id: string, updates: Partial<TimeBasedContent>) => {
    setContent(prev => ({
      ...prev,
      time_based: prev.time_based.map(tc =>
        tc.id === id ? { ...tc, ...updates } : tc
      )
    }))
  }

  const removeTimeBasedContent = (id: string) => {
    setContent(prev => ({
      ...prev,
      time_based: prev.time_based.filter(tc => tc.id !== id)
    }))
  }

  const addLocationBasedContent = () => {
    const newContent: LocationBasedContent = {
      id: `loc_${Date.now()}`,
      lat: 0,
      lng: 0,
      radius_meters: 100,
      content: { type: 'url', value: '' },
      priority: content.location_based.length + 1
    }
    setContent(prev => ({
      ...prev,
      location_based: [...prev.location_based, newContent]
    }))
  }

  const updateLocationBasedContent = (id: string, updates: Partial<LocationBasedContent>) => {
    setContent(prev => ({
      ...prev,
      location_based: prev.location_based.map(lc =>
        lc.id === id ? { ...lc, ...updates } : lc
      )
    }))
  }

  const removeLocationBasedContent = (id: string) => {
    setContent(prev => ({
      ...prev,
      location_based: prev.location_based.filter(lc => lc.id !== id)
    }))
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading content...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">QR Content Manager</h3>
        <p className="text-sm text-gray-500">Configure dynamic content based on time and location</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('default')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'default'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Default Content
        </button>
        <button
          onClick={() => setActiveTab('time')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'time'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Time-Based ({content.time_based.length})
        </button>
        <button
          onClick={() => setActiveTab('location')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'location'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Location-Based ({content.location_based.length})
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'default' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Content Type</label>
              <select
                value={content.default_content.type}
                onChange={e => setContent(prev => ({
                  ...prev,
                  default_content: {
                    ...prev.default_content,
                    type: e.target.value as 'campaign' | 'url' | 'landing'
                  }
                }))}
                className="w-full border rounded-lg px-4 py-2"
              >
                <option value="campaign">Campaign Landing Page</option>
                <option value="url">Custom URL</option>
                <option value="landing">Specific Landing Page</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {content.default_content.type === 'campaign' && 'Campaign ID'}
                {content.default_content.type === 'url' && 'Redirect URL'}
                {content.default_content.type === 'landing' && 'Landing Page Slug'}
              </label>
              <input
                type="text"
                value={content.default_content.value}
                onChange={e => setContent(prev => ({
                  ...prev,
                  default_content: { ...prev.default_content, value: e.target.value }
                }))}
                className="w-full border rounded-lg px-4 py-2"
                placeholder={
                  content.default_content.type === 'url'
                    ? 'https://example.com/promo'
                    : 'Enter value'
                }
              />
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-4">
            {content.time_based.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No time-based content configured</p>
                <button
                  onClick={addTimeBasedContent}
                  className="mt-2 text-indigo-600 hover:text-indigo-700"
                >
                  + Add Time-Based Content
                </button>
              </div>
            ) : (
              <>
                {content.time_based.map((tc, idx) => (
                  <div key={tc.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Schedule {idx + 1}</span>
                      <button
                        onClick={() => removeTimeBasedContent(tc.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                        <input
                          type="datetime-local"
                          value={tc.start_time}
                          onChange={e => updateTimeBasedContent(tc.id, { start_time: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Time</label>
                        <input
                          type="datetime-local"
                          value={tc.end_time}
                          onChange={e => updateTimeBasedContent(tc.id, { end_time: e.target.value })}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Redirect URL</label>
                      <input
                        type="url"
                        value={tc.content.value}
                        onChange={e => updateTimeBasedContent(tc.id, {
                          content: { ...tc.content, value: e.target.value }
                        })}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={addTimeBasedContent}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
                >
                  + Add Another Time Slot
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-4">
            {content.location_based.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No location-based content configured</p>
                <button
                  onClick={addLocationBasedContent}
                  className="mt-2 text-indigo-600 hover:text-indigo-700"
                >
                  + Add Location-Based Content
                </button>
              </div>
            ) : (
              <>
                {content.location_based.map((lc, idx) => (
                  <div key={lc.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Location {idx + 1}</span>
                      <button
                        onClick={() => removeLocationBasedContent(lc.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={lc.lat}
                          onChange={e => updateLocationBasedContent(lc.id, { lat: parseFloat(e.target.value) })}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={lc.lng}
                          onChange={e => updateLocationBasedContent(lc.id, { lng: parseFloat(e.target.value) })}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Radius (m)</label>
                        <input
                          type="number"
                          value={lc.radius_meters}
                          onChange={e => updateLocationBasedContent(lc.id, { radius_meters: parseInt(e.target.value) })}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Redirect URL</label>
                      <input
                        type="url"
                        value={lc.content.value}
                        onChange={e => updateLocationBasedContent(lc.id, {
                          content: { ...lc.content, value: e.target.value }
                        })}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={addLocationBasedContent}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
                >
                  + Add Another Location
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Content Configuration'}
        </button>
      </div>
    </div>
  )
}
