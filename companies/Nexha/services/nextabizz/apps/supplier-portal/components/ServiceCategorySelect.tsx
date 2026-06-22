'use client';

import { useState, useEffect } from 'react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

// Mock categories - in production, fetch from service_categories table
const mockCategories: ServiceCategory[] = [
  { id: '1', name: 'Catering Services', description: 'Food preparation and serving for events', icon: '🍽️' },
  { id: '2', name: 'Event Management', description: 'Full-service event planning and coordination', icon: '🎉' },
  { id: '3', name: 'Transportation & Logistics', description: 'Goods transportation and delivery services', icon: '🚚' },
  { id: '4', name: 'Cleaning Services', description: 'Commercial and residential cleaning', icon: '🧹' },
  { id: '5', name: 'Security Services', description: 'On-site security and surveillance', icon: '🛡️' },
  { id: '6', name: 'Maintenance & Repairs', description: 'Equipment and facility maintenance', icon: '🔧' },
  { id: '7', name: 'IT Services', description: 'Software development, IT support, and consulting', icon: '💻' },
  { id: '8', name: 'Marketing & Advertising', description: 'Digital marketing, branding, and promotions', icon: '📢' },
  { id: '9', name: 'Consulting Services', description: 'Business and management consulting', icon: '📊' },
  { id: '10', name: 'Staffing Solutions', description: 'Temporary and permanent staffing', icon: '👥' },
  { id: '11', name: 'Printing & Graphics', description: 'Printing, design, and signage services', icon: '🖨️' },
  { id: '12', name: 'Photography & Videography', description: 'Professional media production', icon: '📷' },
  { id: '13', name: 'Equipment Rental', description: 'Rental of machinery and equipment', icon: '🏗️' },
  { id: '14', name: 'Pest Control', description: 'Pest management and extermination', icon: '🐜' },
  { id: '15', name: 'Landscaping', description: 'Garden design and grounds maintenance', icon: '🌳' },
  { id: '16', name: 'Electrical Services', description: 'Electrical installation and repairs', icon: '⚡' },
  { id: '17', name: 'Plumbing Services', description: 'Pipe fitting and water system maintenance', icon: '🔧' },
  { id: '18', name: 'HVAC Services', description: 'Heating, ventilation, and air conditioning', icon: '❄️' },
  { id: '19', name: 'Waste Management', description: 'Waste collection and disposal services', icon: '🗑️' },
  { id: '20', name: 'Other Services', description: 'Other professional services', icon: '📋' },
];

interface ServiceCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function ServiceCategorySelect({
  value,
  onChange,
  error,
  disabled = false,
}: ServiceCategorySelectProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>(mockCategories);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // In production: fetch categories from API
    // const fetchCategories = async () => {
    //   const response = await fetch('/api/service-categories');
    //   const data = await response.json();
    //   setCategories(data);
    //   setIsLoading(false);
    // };
    // fetchCategories();

    setIsLoading(false);
  }, []);

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Service Category <span className="text-red-500">*</span>
      </label>

      {isLoading ? (
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="mb-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={disabled}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto bg-white">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No categories found
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onChange(category.id)}
                    disabled={disabled}
                    className={`w-full px-4 py-3 text-left flex items-start space-x-3 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      value === category.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          value === category.id
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {value === category.id && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {category.icon && (
                          <span className="text-lg">{category.icon}</span>
                        )}
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {category.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex items-center space-x-2">
            {selectedCategory.icon && (
              <span className="text-lg">{selectedCategory.icon}</span>
            )}
            <span className="text-sm font-medium text-purple-900">
              Selected: {selectedCategory.name}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
