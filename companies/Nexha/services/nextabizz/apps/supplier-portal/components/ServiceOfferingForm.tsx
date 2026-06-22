'use client';

import { useState, useEffect } from 'react';
import ServiceCategorySelect from './ServiceCategorySelect';

export interface ServiceOfferingFormData {
  categoryId: string;
  description: string;
  pricingModel: 'hourly' | 'project' | 'contract' | '';
  hourlyRate: string;
  projectRate: string;
  contractMinValue: string;
  serviceAreas: string[];
  certifications: string;
  portfolioUrls: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  warrantyOffered: boolean;
  warrantyPeriod: string;
  termsConditions: string;
}

interface ServiceOfferingFormProps {
  initialData?: Partial<ServiceOfferingFormData>;
  onSubmit: (data: ServiceOfferingFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const indianCities = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut',
  'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
  'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior',
  'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati',
];

const pricingModels = [
  { value: 'hourly', label: 'Hourly Rate', description: 'Charged per hour of service' },
  { value: 'project', label: 'Project Rate', description: 'Fixed price per project' },
  { value: 'contract', label: 'Contract Rate', description: 'Monthly/annual contract basis' },
  { value: 'hourly,project', label: 'Hourly + Project', description: 'Both hourly and project rates available' },
  { value: 'hourly,contract', label: 'Hourly + Contract', description: 'Hourly and contract pricing' },
  { value: 'project,contract', label: 'Project + Contract', description: 'Project and contract pricing' },
  { value: 'hourly,project,contract', label: 'All Models', description: 'All pricing models available' },
];

const warrantyPeriods = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
];

export default function ServiceOfferingForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ServiceOfferingFormProps) {
  const [formData, setFormData] = useState<ServiceOfferingFormData>({
    categoryId: '',
    description: '',
    pricingModel: '',
    hourlyRate: '',
    projectRate: '',
    contractMinValue: '',
    serviceAreas: [],
    certifications: '',
    portfolioUrls: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    warrantyOffered: false,
    warrantyPeriod: '',
    termsConditions: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = indianCities.filter(
    (city) =>
      city.toLowerCase().includes(citySearch.toLowerCase()) &&
      !formData.serviceAreas.includes(city)
  );

  const handleChange = (
    field: keyof ServiceOfferingFormData,
    value: string | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addServiceArea = (city: string) => {
    if (!formData.serviceAreas.includes(city)) {
      handleChange('serviceAreas', [...formData.serviceAreas, city]);
    }
    setCitySearch('');
    setShowCityDropdown(false);
  };

  const removeServiceArea = (city: string) => {
    handleChange(
      'serviceAreas',
      formData.serviceAreas.filter((a) => a !== city)
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a service category';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (!formData.pricingModel) {
      newErrors.pricingModel = 'Please select a pricing model';
    }

    if (
      formData.pricingModel.includes('hourly') &&
      !formData.hourlyRate.trim()
    ) {
      newErrors.hourlyRate = 'Hourly rate is required';
    }

    if (
      formData.pricingModel.includes('project') &&
      !formData.projectRate.trim()
    ) {
      newErrors.projectRate = 'Project rate is required';
    }

    if (
      formData.pricingModel.includes('contract') &&
      !formData.contractMinValue.trim()
    ) {
      newErrors.contractMinValue = 'Minimum contract value is required';
    }

    if (formData.serviceAreas.length === 0) {
      newErrors.serviceAreas = 'Please add at least one service area';
    }

    if (
      formData.insurancePolicyNumber &&
      !formData.insuranceExpiry
    ) {
      newErrors.insuranceExpiry = 'Insurance expiry date is required when policy number is provided';
    }

    if (
      formData.warrantyOffered &&
      !formData.warrantyPeriod
    ) {
      newErrors.warrantyPeriod = 'Warranty period is required when warranty is offered';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Basic Information
        </h3>

        <div className="space-y-6">
          <ServiceCategorySelect
            value={formData.categoryId}
            onChange={(value) => handleChange('categoryId', value)}
            error={errors.categoryId}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description of Services Offered <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your services in detail. Include information about your experience, quality of service, turnaround time, and any special offerings..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Minimum 50 characters required
                </p>
              )}
              <p className="text-sm text-gray-400">
                {formData.description.length}/2000
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Pricing Model
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Pricing Models <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pricingModels.map((model) => {
                const isSelected = formData.pricingModel
                  .split(',')
                  .includes(model.value.split(',')[0]);
                return (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => {
                      if (model.value.includes(',')) {
                        // For multi-option models, toggle individual options
                        const currentModels = formData.pricingModel
                          ? formData.pricingModel.split(',')
                          : [];
                        const firstOption = model.value.split(',')[0];
                        if (currentModels.includes(firstOption)) {
                          handleChange(
                            'pricingModel',
                            currentModels
                              .filter((m) => m !== firstOption)
                              .join(',')
                          );
                        } else {
                          handleChange('pricingModel', [...currentModels, firstOption].join(','));
                        }
                      } else {
                        handleChange('pricingModel', model.value);
                      }
                    }}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{model.label}</div>
                        <div className="text-sm text-gray-500">{model.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.pricingModel && (
              <p className="text-sm text-red-600 mt-2">{errors.pricingModel}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.pricingModel.includes('hourly') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (INR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => handleChange('hourlyRate', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                      errors.hourlyRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    /hour
                  </span>
                </div>
                {errors.hourlyRate && (
                  <p className="text-sm text-red-600 mt-1">{errors.hourlyRate}</p>
                )}
              </div>
            )}

            {formData.pricingModel.includes('project') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Rate (INR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.projectRate}
                    onChange={(e) => handleChange('projectRate', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                      errors.projectRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    /project
                  </span>
                </div>
                {errors.projectRate && (
                  <p className="text-sm text-red-600 mt-1">{errors.projectRate}</p>
                )}
              </div>
            )}

            {formData.pricingModel.includes('contract') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min. Contract Value (INR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.contractMinValue}
                    onChange={(e) => handleChange('contractMinValue', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                      errors.contractMinValue ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    /month
                  </span>
                </div>
                {errors.contractMinValue && (
                  <p className="text-sm text-red-600 mt-1">{errors.contractMinValue}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          Service Area
        </h3>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Cities/Regions <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <input
                type="text"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder="Search for a city..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>

            {showCityDropdown && filteredCities.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => addServiceArea(city)}
                    className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.serviceAreas && (
            <p className="text-sm text-red-600">{errors.serviceAreas}</p>
          )}

          {formData.serviceAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.serviceAreas.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => removeServiceArea(city)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-2">
            {formData.serviceAreas.length} city/region{formData.serviceAreas.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      {/* Certifications & Licenses */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </span>
          Certifications & Licenses
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certifications, Licenses & Qualifications
          </label>
          <textarea
            rows={4}
            value={formData.certifications}
            onChange={(e) => handleChange('certifications', e.target.value)}
            placeholder="List your certifications, licenses, and qualifications. For example: ISO 9001:2015, FSSAI License No: XXXXXX, GST No: XXXXXX, MSME Certificate, Industry-specific certifications, etc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-sm text-gray-500 mt-1">
            Include license numbers and validity where applicable
          </p>
        </div>
      </div>

      {/* Portfolio */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          Portfolio & Work Samples
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Portfolio URLs
          </label>
          <textarea
            rows={3}
            value={formData.portfolioUrls}
            onChange={(e) => handleChange('portfolioUrls', e.target.value)}
            placeholder="Enter URLs to your portfolio, website, case studies, or work samples. One URL per line.&#10;&#10;Example:&#10;https://www.example.com/portfolio&#10;https://www.behance.net/example&#10;https://drive.google.com/..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter one URL per line
          </p>
        </div>
      </div>

      {/* Insurance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          Insurance Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <input
              type="text"
              value={formData.insuranceProvider}
              onChange={(e) => handleChange('insuranceProvider', e.target.value)}
              placeholder="e.g., HDFC ERGO, ICICI Lombard"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Policy Number
            </label>
            <input
              type="text"
              value={formData.insurancePolicyNumber}
              onChange={(e) => handleChange('insurancePolicyNumber', e.target.value)}
              placeholder="Policy number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Policy Expiry Date
            </label>
            <input
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => handleChange('insuranceExpiry', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none ${
                errors.insuranceExpiry ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.insuranceExpiry && (
              <p className="text-sm text-red-600 mt-1">{errors.insuranceExpiry}</p>
            )}
          </div>
        </div>
      </div>

      {/* Warranty */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Warranty Information
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex items-center h-5 mt-1">
              <input
                id="warrantyOffered"
                type="checkbox"
                checked={formData.warrantyOffered}
                onChange={(e) => handleChange('warrantyOffered', e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="warrantyOffered" className="font-medium text-gray-900">
                Warranty Offered
              </label>
              <p className="text-sm text-gray-500">
                Check if you provide warranty for your services
              </p>
            </div>
          </div>

          {formData.warrantyOffered && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warranty Period <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {warrantyPeriods.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => handleChange('warrantyPeriod', period.value)}
                    className={`p-3 border rounded-lg text-center transition-all ${
                      formData.warrantyPeriod === period.value
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <span className="font-medium">{period.label}</span>
                  </button>
                ))}
              </div>
              {errors.warrantyPeriod && (
                <p className="text-sm text-red-600 mt-2">{errors.warrantyPeriod}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          Terms & Conditions
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Terms
          </label>
          <textarea
            rows={4}
            value={formData.termsConditions}
            onChange={(e) => handleChange('termsConditions', e.target.value)}
            placeholder="Enter any specific terms and conditions for your services, such as payment terms, cancellation policy, scope of services, etc."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-sm text-gray-500 mt-1">
            This will be displayed to potential clients viewing your services
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Service</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
