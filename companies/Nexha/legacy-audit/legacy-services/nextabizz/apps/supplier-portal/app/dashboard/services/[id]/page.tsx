import { logger } from '../../shared/logger';
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ServiceOfferingForm, { ServiceOfferingFormData } from '../../../../components/ServiceOfferingForm';

interface ServiceOffering {
  id: string;
  categoryId: string;
  description: string;
  pricingModel: string;
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

// Mock data - in production, fetch from API
const mockServiceData: Record<string, ServiceOffering> = {
  '1': {
    id: '1',
    categoryId: '1',
    description: 'Professional catering services for corporate events, weddings, and private parties. We specialize in multi-cuisine vegetarian food with a focus on South Indian and North Indian delicacies. Our team has over 15 years of experience serving events with 50 to 5000+ guests.',
    pricingModel: 'hourly,project',
    hourlyRate: '1500',
    projectRate: '25000',
    contractMinValue: '',
    serviceAreas: ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai'],
    certifications: 'FSSAI License, ISO 22000:2018, Food Safety Certification',
    portfolioUrls: 'https://example.com/catering-portfolio',
    insuranceProvider: 'Tata AIG',
    insurancePolicyNumber: 'POL123456789',
    insuranceExpiry: '2025-12-31',
    warrantyOffered: true,
    warrantyPeriod: '30',
    termsConditions: 'Payment terms: 50% advance, 50% on delivery. Cancellation: Full refund if cancelled 7 days before event. Transport charges extra for locations beyond 50km.',
  },
  '2': {
    id: '2',
    categoryId: '2',
    description: 'Full-service event planning and management for corporate events, product launches, conferences, and exhibitions. We handle everything from venue selection to execution, ensuring seamless delivery of memorable events.',
    pricingModel: 'project,contract',
    hourlyRate: '',
    projectRate: '150000',
    contractMinValue: '50000',
    serviceAreas: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'],
    certifications: 'IAEE Member, Event Management Certification',
    portfolioUrls: 'https://example.com/events-portfolio\nhttps://behance.net/example',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    warrantyOffered: false,
    warrantyPeriod: '',
    termsConditions: '',
  },
  '3': {
    id: '3',
    categoryId: '3',
    description: 'Reliable goods transportation and logistics services across Maharashtra. We specialize in temperature-controlled transport for food products, ensuring safe and timely delivery to restaurants and retailers.',
    pricingModel: 'hourly,contract',
    hourlyRate: '800',
    projectRate: '',
    contractMinValue: '25000',
    serviceAreas: ['Mumbai', 'Pune', 'Thane', 'Nashik', 'Aurangabad'],
    certifications: 'GST Registered, Transport License, Vehicle Insurance',
    portfolioUrls: '',
    insuranceProvider: 'United India Insurance',
    insurancePolicyNumber: 'TRN987654321',
    insuranceExpiry: '2025-06-30',
    warrantyOffered: true,
    warrantyPeriod: '90',
    termsConditions: 'Delivery timeline guaranteed. Compensation for delays. Insurance coverage for goods in transit.',
  },
};

const categoryNames: Record<string, string> = {
  '1': 'Catering Services',
  '2': 'Event Management',
  '3': 'Transportation & Logistics',
  '4': 'Cleaning Services',
  '5': 'Security Services',
  '6': 'Maintenance & Repairs',
  '7': 'IT Services',
};

const categoryIcons: Record<string, string> = {
  '1': '🍽️',
  '2': '🎉',
  '3': '🚚',
  '4': '🧹',
  '5': '🛡️',
  '6': '🔧',
  '7': '💻',
};

const statusConfig = {
  active: {
    label: 'Active',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
  },
  inactive: {
    label: 'Inactive',
    badge: 'bg-gray-100 text-gray-800',
    dot: 'bg-gray-500',
  },
  pending: {
    label: 'Pending Review',
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
  },
};

const mockServiceStatus: Record<string, 'active' | 'inactive' | 'pending'> = {
  '1': 'active',
  '2': 'active',
  '3': 'inactive',
};

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [initialData, setInitialData] = useState<Partial<ServiceOfferingFormData> | null>(null);
  const [originalData, setOriginalData] = useState<string>('');

  useEffect(() => {
    // Simulate API call to fetch service data
    const fetchService = async () => {
      setIsLoading(true);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const service = mockServiceData[id];

      if (service) {
        const formData: Partial<ServiceOfferingFormData> = {
          categoryId: service.categoryId,
          description: service.description,
          pricingModel: service.pricingModel as 'hourly' | 'project' | 'contract' | '',
          hourlyRate: service.hourlyRate,
          projectRate: service.projectRate,
          contractMinValue: service.contractMinValue,
          serviceAreas: service.serviceAreas,
          certifications: service.certifications,
          portfolioUrls: service.portfolioUrls,
          insuranceProvider: service.insuranceProvider,
          insurancePolicyNumber: service.insurancePolicyNumber,
          insuranceExpiry: service.insuranceExpiry,
          warrantyOffered: service.warrantyOffered,
          warrantyPeriod: service.warrantyPeriod,
          termsConditions: service.termsConditions,
        };

        setInitialData(formData);
        setOriginalData(JSON.stringify(formData));
      }

      setIsLoading(false);
    };

    fetchService();
  }, [id]);

  const handleSubmit = async (data: ServiceOfferingFormData) => {
    setIsSubmitting(true);

    // Simulate API call
    logger.info('Updating service:', id, data);

    try {
      // In production, this would be an API call:
      // const response = await fetch(`/api/service-offerings/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      // const result = await response.json();

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setShowSuccess(true);

      // Redirect after showing success message
      setTimeout(() => {
        router.push('/dashboard/services');
      }, 2000);
    } catch (error) {
      logger.error('Error updating service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const currentData = JSON.stringify(initialData);
    if (currentData !== originalData) {
      setShowDiscard(true);
    } else {
      router.push('/dashboard/services');
    }
  };

  const serviceStatus = mockServiceStatus[id] || 'pending';
  const categoryName = categoryNames[initialData?.categoryId || ''] || '';
  const categoryIcon = categoryIcons[initialData?.categoryId || ''] || '📋';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Service Not Found</h3>
          <p className="text-gray-500 mb-4">
            The service you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/dashboard/services"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/services" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">NB</span>
                </div>
                <span className="text-xl font-bold text-gray-900">NextaBizz</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">FS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/orders" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Orders
            </Link>
            <Link href="/dashboard/products" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              Products
            </Link>
            <Link href="/dashboard/services" className="border-b-2 border-purple-600 text-purple-600 py-4 px-1 text-sm font-medium">
              Services
            </Link>
            <Link href="/dashboard/rfqs" className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 text-sm font-medium">
              RFQs
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/services" className="hover:text-purple-600">
              Services
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900">Edit Service</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">
                {categoryIcon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {categoryName || 'Service'}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[serviceStatus].badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[serviceStatus].dot}`}></span>
                    {statusConfig[serviceStatus].label}
                  </span>
                  <span className="text-sm text-gray-500">ID: {id}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDiscard(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Discard Changes
              </button>
              <Link
                href="/dashboard/services/new"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add New</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-900">Changes require review</h4>
              <p className="text-sm text-amber-700 mt-1">
                Your changes will be reviewed before going live. The service status will change to &quot;Pending Review&quot; until approved.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <ServiceOfferingForm
          initialData={initialData || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </main>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity"></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Service Updated Successfully!</h3>
              <p className="text-gray-500 mb-4">
                Your changes have been saved and are pending review.
              </p>
              <div className="flex justify-center">
                <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redirecting...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDiscard(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Discard Changes?</h3>
                <p className="text-gray-500 mb-6">
                  You have unsaved changes. Are you sure you want to discard them?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDiscard(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={() => {
                      setShowDiscard(false);
                      router.push('/dashboard/services');
                    }}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
