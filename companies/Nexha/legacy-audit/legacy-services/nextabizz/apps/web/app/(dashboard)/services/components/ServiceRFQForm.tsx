'use client';

import { useState, useCallback } from 'react';

export interface ServiceRFQFormData {
  category: string;
  categorySlug: string;
  description: string;
  preferredTiming: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  serviceLocation: {
    type: 'onsite' | 'remote' | 'hybrid';
    address?: string;
    city?: string;
    pincode?: string;
  };
  budgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  attachments: File[];
  preferredDays: string[];
  preferredTimeSlot: string;
  additionalNotes: string;
}

interface ServiceRFQFormProps {
  category: string;
  categorySlug: string;
  onSubmit: (data: ServiceRFQFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const urgencyOptions = [
  { value: 'low', label: 'Low Priority', description: 'Flexible timeline, no rush', color: 'emerald' },
  { value: 'medium', label: 'Standard', description: 'Within 1-2 weeks', color: 'blue' },
  { value: 'high', label: 'High Priority', description: 'Within 3-5 days', color: 'amber' },
  { value: 'urgent', label: 'Urgent', description: 'Immediate attention required', color: 'rose' },
] as const;

const timeSlotOptions = [
  { value: 'morning', label: 'Morning (9AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 4PM)' },
  { value: 'evening', label: 'Evening (4PM - 7PM)' },
  { value: 'anytime', label: 'Anytime' },
];

const dayOptions = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const urgencyColors: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', ring: 'ring-emerald-500' },
  medium: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', ring: 'ring-blue-500' },
  high: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', ring: 'ring-amber-500' },
  urgent: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', ring: 'ring-rose-500' },
};

export default function ServiceRFQForm({
  category,
  categorySlug,
  onSubmit,
  isSubmitting = false,
}: ServiceRFQFormProps) {
  const [formData, setFormData] = useState<ServiceRFQFormData>({
    category,
    categorySlug,
    description: '',
    preferredTiming: '',
    urgency: 'medium',
    serviceLocation: {
      type: 'onsite',
      address: '',
      city: '',
      pincode: '',
    },
    budgetRange: {
      min: 0,
      max: 0,
      currency: 'INR',
    },
    attachments: [],
    preferredDays: [],
    preferredTimeSlot: 'anytime',
    additionalNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileInputKey, setFileInputKey] = useState(0);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the service you need';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Please provide more details (at least 20 characters)';
    }

    if (formData.serviceLocation.type === 'onsite' || formData.serviceLocation.type === 'hybrid') {
      if (!formData.serviceLocation.address?.trim()) {
        newErrors.address = 'Please provide the service location address';
      }
      if (!formData.serviceLocation.city?.trim()) {
        newErrors.city = 'Please provide the city';
      }
      if (!formData.serviceLocation.pincode?.trim()) {
        newErrors.pincode = 'Please provide the pincode';
      } else if (!/^\d{6}$/.test(formData.serviceLocation.pincode)) {
        newErrors.pincode = 'Please enter a valid 6-digit pincode';
      }
    }

    if (formData.budgetRange.min && formData.budgetRange.max) {
      if (formData.budgetRange.min > formData.budgetRange.max) {
        newErrors.budgetRange = 'Minimum budget cannot exceed maximum budget';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds 10MB limit`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" is not a supported format`);
        return false;
      }
      return true;
    });
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...validFiles] }));
    setFileInputKey(prev => prev + 1);
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Category Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400">Requesting service for</p>
            <p className="font-semibold text-white">{category}</p>
          </div>
        </div>
      </div>

      {/* Description of Work */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-200">
            Description of Work Needed <span className="text-rose-400">*</span>
          </span>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Please describe the service you need in detail. Include specific requirements, scope of work, and any special considerations..."
            rows={5}
            className="mt-2 w-full px-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-rose-400">{errors.description}</p>
          )}
          <p className="mt-1.5 text-xs text-gray-500">
            {formData.description.length}/1000 characters
          </p>
        </label>
      </div>

      {/* Urgency Level */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-200">
          Urgency Level
        </label>
        <div className="grid grid-cols-2 gap-3">
          {urgencyOptions.map(option => {
            const colors = urgencyColors[option.value];
            const isSelected = formData.urgency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, urgency: option.value }))}
                className={`
                  relative p-4 rounded-xl border text-left transition-all duration-200
                  ${isSelected
                    ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}`
                    : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-gray-500'
                  }
                `}
              >
                <p className={`font-medium ${isSelected ? colors.text : 'text-white'}`}>
                  {option.label}
                </p>
                <p className="text-xs mt-1 text-gray-400">{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Location */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-200">
          Service Location
        </label>

        {/* Location Type */}
        <div className="flex gap-3">
          {(['onsite', 'remote', 'hybrid'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData(prev => ({
                ...prev,
                serviceLocation: { ...prev.serviceLocation, type }
              }))}
              className={`
                flex-1 py-3 px-4 rounded-xl border text-sm font-medium capitalize transition-all
                ${formData.serviceLocation.type === type
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-[#1a1a2e] border-[#2d2d44] text-gray-300 hover:border-gray-500'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Address Fields */}
        {(formData.serviceLocation.type === 'onsite' || formData.serviceLocation.type === 'hybrid') && (
          <div className="space-y-4 pl-4 border-l-2 border-violet-500/30">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Street Address</label>
              <input
                type="text"
                value={formData.serviceLocation.address}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  serviceLocation: { ...prev.serviceLocation, address: e.target.value }
                }))}
                placeholder="Enter complete address"
                className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              {errors.serviceLocation && (
                <p className="mt-1 text-xs text-rose-400">{errors.serviceLocation}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.serviceLocation.city}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    serviceLocation: { ...prev.serviceLocation, city: e.target.value }
                  }))}
                  placeholder="Enter city"
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-rose-400">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={formData.serviceLocation.pincode}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    serviceLocation: { ...prev.serviceLocation, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }
                  }))}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                {errors.pincode && (
                  <p className="mt-1 text-xs text-rose-400">{errors.pincode}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preferred Schedule */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-200">
          Preferred Schedule
        </label>

        {/* Preferred Days */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Preferred Days</p>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                  ${formData.preferredDays.includes(day.value)
                    ? 'bg-violet-500 text-white'
                    : 'bg-[#1a1a2e] text-gray-400 border border-[#2d2d44] hover:border-gray-500'
                  }
                `}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slot */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Preferred Time Slot</label>
          <select
            value={formData.preferredTimeSlot}
            onChange={e => setFormData(prev => ({ ...prev, preferredTimeSlot: e.target.value }))}
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            {timeSlotOptions.map(slot => (
              <option key={slot.value} value={slot.value} className="bg-[#1a1a2e]">
                {slot.label}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred Timing */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Project Start Date</label>
          <input
            type="date"
            value={formData.preferredTiming}
            onChange={e => setFormData(prev => ({ ...prev, preferredTiming: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Budget Range */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-200">
          Budget Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Minimum (INR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={formData.budgetRange.min || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  budgetRange: { ...prev.budgetRange, min: parseInt(e.target.value) || 0 }
                }))}
                placeholder="0"
                min={0}
                className="w-full pl-8 pr-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Maximum (INR)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={formData.budgetRange.max || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  budgetRange: { ...prev.budgetRange, max: parseInt(e.target.value) || 0 }
                }))}
                placeholder="No limit"
                min={0}
                className="w-full pl-8 pr-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        {errors.budgetRange && (
          <p className="text-xs text-rose-400">{errors.budgetRange}</p>
        )}
        <p className="text-xs text-gray-500">
          Leave blank if you prefer to receive quotes without a budget constraint
        </p>
      </div>

      {/* Attachments */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-200">
          Attachments <span className="text-gray-500 font-normal">(Optional)</span>
        </label>
        <div className="border-2 border-dashed border-[#2d2d44] rounded-xl p-6 text-center hover:border-violet-500/50 transition-colors">
          <input
            key={fileInputKey}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-gray-300">
              <span className="text-violet-400 font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, GIF or PDF (max 10MB each)
            </p>
          </label>
        </div>

        {/* File List */}
        {formData.attachments.length > 0 && (
          <div className="space-y-2">
            {formData.attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-200">
            Additional Notes <span className="text-gray-500 font-normal">(Optional)</span>
          </span>
          <textarea
            value={formData.additionalNotes}
            onChange={e => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
            placeholder="Any additional information that might help service providers understand your requirements..."
            rows={3}
            className="mt-2 w-full px-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
        </label>
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3.5 px-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting Request...
            </span>
          ) : (
            'Submit Service Request'
          )}
        </button>
      </div>

      {/* Privacy Note */}
      <p className="text-xs text-gray-500 text-center">
        Your request will be shared with verified service providers. Your contact details are kept private.
      </p>
    </form>
  );
}
