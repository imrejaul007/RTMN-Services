import { logger } from '../../shared/logger';
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ServiceOffering {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  description: string;
  pricingModel: string[];
  hourlyRate?: number;
  projectRate?: number;
  contractMinValue?: number;
  serviceAreas: string[];
  certifications: string;
  portfolioUrls: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  warrantyOffered: boolean;
  warrantyPeriod?: string;
  status: 'active' | 'inactive' | 'pending';
  views: number;
  inquiries: number;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockServices: ServiceOffering[] = [
  {
    id: '1',
    categoryId: '1',
    categoryName: 'Catering Services',
    categoryIcon: '🍽️',
    description: 'Professional catering services for corporate events, weddings, and private parties. We specialize in multi-cuisine vegetarian food with a focus on South Indian and North Indian delicacies. Our team has over 15 years of experience serving events with 50 to 5000+ guests.',
    pricingModel: ['hourly', 'project'],
    hourlyRate: 1500,
    projectRate: 25000,
    serviceAreas: ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai'],
    certifications: 'FSSAI License, ISO 22000:2018, Food Safety Certification',
    portfolioUrls: ['https://example.com/catering-portfolio'],
    insuranceProvider: 'Tata AIG',
    insurancePolicyNumber: 'POL123456789',
    insuranceExpiry: '2025-12-31',
    warrantyOffered: true,
    warrantyPeriod: '30',
    status: 'active',
    views: 245,
    inquiries: 12,
    createdAt: '2024-01-10T10:30:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
  },
  {
    id: '2',
    categoryId: '2',
    categoryName: 'Event Management',
    categoryIcon: '🎉',
    description: 'Full-service event planning and management for corporate events, product launches, conferences, and exhibitions. We handle everything from venue selection to execution, ensuring seamless delivery of memorable events.',
    pricingModel: ['project', 'contract'],
    projectRate: 150000,
    contractMinValue: 50000,
    serviceAreas: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'],
    certifications: 'IAEE Member, Event Management Certification',
    portfolioUrls: ['https://example.com/events-portfolio', 'https://behance.net/example'],
    warrantyOffered: false,
    status: 'active',
    views: 189,
    inquiries: 8,
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-01-12T11:15:00Z',
  },
  {
    id: '3',
    categoryId: '3',
    categoryName: 'Transportation & Logistics',
    categoryIcon: '🚚',
    description: 'Reliable goods transportation and logistics services across Maharashtra. We specialize in temperature-controlled transport for food products, ensuring safe and timely delivery to restaurants and retailers.',
    pricingModel: ['hourly', 'contract'],
    hourlyRate: 800,
    contractMinValue: 25000,
    serviceAreas: ['Mumbai', 'Pune', 'Thane', 'Nashik', 'Aurangabad'],
    certifications: 'GST Registered, Transport License, Vehicle Insurance',
    portfolioUrls: [],
    insuranceProvider: 'United India Insurance',
    insurancePolicyNumber: 'TRN987654321',
    insuranceExpiry: '2025-06-30',
    warrantyOffered: true,
    warrantyPeriod: '90',
    status: 'active',
    views: 156,
    inquiries: 15,
    createdAt: '2024-01-02T08:45:00Z',
    updatedAt: '2024-01-08T16:30:00Z',
  },
  {
    id: '4',
    categoryId: '7',
    categoryName: 'IT Services',
    categoryIcon: '💻',
    description: 'Software development, website design, and IT support services for small to medium businesses. Specializing in e-commerce solutions, inventory management systems, and mobile app development.',
    pricingModel: ['hourly', 'project'],
    hourlyRate: 2000,
    projectRate: 100000,
    serviceAreas: ['Mumbai', 'Bangalore', 'Remote'],
    certifications: 'ISO 27001:2013, NASSCOM Member, MSME Certified',
    portfolioUrls: ['https://example.com/it-portfolio', 'https://github.com/example'],
    warrantyOffered: true,
    warrantyPeriod: '180',
    status: 'inactive',
    views: 98,
    inquiries: 5,
    createdAt: '2023-12-20T11:00:00Z',
    updatedAt: '2024-01-03T10:00:00Z',
  },
  {
    id: '5',
    categoryId: '4',
    categoryName: 'Cleaning Services',
    categoryIcon: '🧹',
    description: 'Professional commercial and residential cleaning services including deep cleaning, sanitization, and disinfection services. We use eco-friendly products and trained staff for spotless results.',
    pricingModel: ['hourly', 'project'],
    hourlyRate: 500,
    projectRate: 8000,
    serviceAreas: ['Mumbai', 'Pune', 'Thane'],
    certifications: 'ISO 9001:2015, Green Cleaning Certified',
    portfolioUrls: [],
    warrantyOffered: true,
    warrantyPeriod: '7',
    status: 'pending',
    views: 67,
    inquiries: 3,
    createdAt: '2024-01-14T15:30:00Z',
    updatedAt: '2024-01-14T15:30:00Z',
  },
];

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

const pricingLabels: Record<string, string> = {
  hourly: 'Hourly',
  project: 'Project',
  contract: 'Contract',
};

export default function ServicesPage() {
  const router = useRouter();
  const [services] = useState<ServiceOffering[]>(mockServices);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serviceAreas.some((area) =>
        area.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus = selectedStatus === 'all' || service.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices.map((s) => s.id));
    }
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleBulkAction = (action: string) => {
    if (action === 'activate') {
      logger.info('Activating services:', selectedServices);
    } else if (action === 'deactivate') {
      logger.info('Deactivating services:', selectedServices);
    }
    setSelectedServices([]);
  };

  const handleDelete = (serviceId: string) => {
    logger.info('Deleting service:', serviceId);
    setShowDeleteConfirm(null);
  };

  const formatPricing = (service: ServiceOffering): string => {
    const parts: string[] = [];
    if (service.hourlyRate) parts.push(`₹${service.hourlyRate.toLocaleString('en-IN')}/hr`);
    if (service.projectRate) parts.push(`₹${service.projectRate.toLocaleString('en-IN')}/project`);
    if (service.contractMinValue) parts.push(`₹${service.contractMinValue.toLocaleString('en-IN')}/mo min`);
    return parts.join(' | ') || 'Contact for pricing';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Offerings</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your service catalog and offerings</p>
          </div>
          <Link
            href="/dashboard/services/new"
            className="mt-4 sm:mt-0 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2 w-fit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add Service</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search services by name, description, or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedServices.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-purple-900">
              {selectedServices.length} service(s) selected
            </span>
            <div className="flex space-x-3">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
              >
                Activate Selected
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Deactivate Selected
              </button>
              <button
                onClick={() => setSelectedServices([])}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Services List */}
        {filteredServices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first service offering'}
            </p>
            {!searchTerm && selectedStatus === 'all' && (
              <Link
                href="/dashboard/services/new"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Service
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-purple-200 transition-colors"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Checkbox & Icon */}
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center h-5 mt-1">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={() => handleSelectService(service.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </div>
                      <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {service.categoryIcon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {service.categoryName}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[service.status].badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[service.status].dot}`}></span>
                            {statusConfig[service.status].label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/services/${service.id}`}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => setShowDeleteConfirm(service.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {service.description}
                      </p>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Pricing</div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatPricing(service)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Service Areas</div>
                          <div className="text-sm font-medium text-gray-900">
                            {service.serviceAreas.length} location{service.serviceAreas.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Views</div>
                          <div className="text-sm font-medium text-gray-900">{service.views}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Inquiries</div>
                          <div className="text-sm font-medium text-purple-600">{service.inquiries}</div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {service.pricingModel.map((model) => (
                          <span
                            key={model}
                            className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded"
                          >
                            {pricingLabels[model] || model}
                          </span>
                        ))}
                        {service.warrantyOffered && (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            {service.warrantyPeriod} day warranty
                          </span>
                        )}
                        {service.certifications && (
                          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                            Certified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 lg:hidden">
                    <div className="text-xs text-gray-500">
                      Updated {new Date(service.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/dashboard/services/${service.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(service.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {filteredServices.length > 0 && (
          <div className="mt-6 px-4 text-sm text-gray-500">
            Showing {filteredServices.length} of {services.length} service{services.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowDeleteConfirm(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Service</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete this service? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
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
