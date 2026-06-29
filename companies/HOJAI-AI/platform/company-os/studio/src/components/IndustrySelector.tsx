/**
 * Industry Selector Component
 *
 * UI component for selecting industry when creating a company.
 */

import React, { useState } from 'react';

interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  services: number;
  templates: number;
}

const INDUSTRIES: Industry[] = [
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    description: 'POS, Kitchen Display, Menu Management, Reservations',
    services: 7,
    templates: 12,
  },
  {
    id: 'beauty',
    name: 'Beauty & Salon',
    icon: '💅',
    description: 'Appointments, Stylists, Memberships, Inventory',
    services: 5,
    templates: 8,
  },
  {
    id: 'hotel',
    name: 'Hotel',
    icon: '🏨',
    description: 'PMS, Housekeeping, Channel Manager, Billing',
    services: 5,
    templates: 10,
  },
  {
    id: 'retail',
    name: 'Retail Store',
    icon: '🛒',
    description: 'POS, Inventory, Loyalty, Analytics',
    services: 6,
    templates: 15,
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    description: 'EMR, Appointments, Pharmacy, Lab, Billing',
    services: 5,
    templates: 6,
  },
  {
    id: 'education',
    name: 'Education',
    icon: '🎓',
    description: 'LMS, Enrollments, Assessments, Certificates',
    services: 5,
    templates: 8,
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    icon: '🏠',
    description: 'Property Listings, Leads, Documents, Transactions',
    services: 4,
    templates: 5,
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: '🏭',
    description: 'Production, Inventory, Quality, Compliance',
    services: 4,
    templates: 6,
  },
];

interface IndustrySelectorProps {
  onSelect: (industry: string) => void;
  selected?: string;
}

export function IndustrySelector({ onSelect, selected }: IndustrySelectorProps) {
  const [search, setSearch] = useState('');

  const filteredIndustries = INDUSTRIES.filter(
    (ind) =>
      ind.name.toLowerCase().includes(search.toLowerCase()) ||
      ind.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="industry-selector">
      <div className="search-box">
        <input
          type="text"
          placeholder="Search industries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="industries-grid">
        {filteredIndustries.map((industry) => (
          <div
            key={industry.id}
            className={`industry-card ${selected === industry.id ? 'selected' : ''}`}
            onClick={() => onSelect(industry.id)}
          >
            <div className="industry-icon">{industry.icon}</div>
            <h3 className="industry-name">{industry.name}</h3>
            <p className="industry-description">{industry.description}</p>
            <div className="industry-meta">
              <span>{industry.services} services</span>
              <span>{industry.templates} templates</span>
            </div>
          </div>
        ))}
      </div>

      {filteredIndustries.length === 0 && (
        <div className="no-results">
          No industries found for "{search}"
        </div>
      )}
    </div>
  );
}

interface DepartmentSelectorProps {
  onToggle: (department: string, enabled: boolean) => void;
  selected: string[];
}

const DEPARTMENTS = [
  { id: 'finance', name: 'Finance', icon: '💰', description: 'Accounting, Invoicing, Payments' },
  { id: 'hr', name: 'HR', icon: '👥', description: 'Recruitment, Payroll, Performance' },
  { id: 'marketing', name: 'Marketing', icon: '📢', description: 'Campaigns, Content, Analytics' },
  { id: 'sales', name: 'Sales', icon: '💼', description: 'CRM, Leads, Pipeline, Quotes' },
  { id: 'operations', name: 'Operations', icon: '⚙️', description: 'Scheduling, Quality, SOPs' },
  { id: 'legal', name: 'Legal', icon: '⚖️', description: 'Contracts, Compliance, Risk' },
];

export function DepartmentSelector({ onToggle, selected }: DepartmentSelectorProps) {
  return (
    <div className="department-selector">
      <h3>Select Departments</h3>
      <p className="helper-text">
        Choose the departments to install with your company. Each department comes with AI workers.
      </p>

      <div className="departments-grid">
        {DEPARTMENTS.map((dept) => (
          <div
            key={dept.id}
            className={`department-card ${selected.includes(dept.id) ? 'selected' : ''}`}
            onClick={() => onToggle(dept.id, !selected.includes(dept.id))}
          >
            <div className="dept-icon">{dept.icon}</div>
            <div className="dept-info">
              <h4>{dept.name}</h4>
              <p>{dept.description}</p>
            </div>
            <div className="dept-check">
              {selected.includes(dept.id) ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AIDepartmentConfig {
  [key: string]: {
    enabled: boolean;
    head: string;
  };
}

interface AIWorkerSelectorProps {
  departments: string[];
  aiConfig: AIDepartmentConfig;
  onUpdate: (config: AIDepartmentConfig) => void;
}

const AI_WORKERS: Record<string, { id: string; name: string; description: string }[]> = {
  finance: [
    { id: 'ai-cfo', name: 'AI CFO', description: 'Financial planning & strategy' },
    { id: 'ai-accountant', name: 'AI Accountant', description: 'Bookkeeping & compliance' },
    { id: 'ai-treasury', name: 'AI Treasury', description: 'Cash flow management' },
  ],
  hr: [
    { id: 'ai-recruiter', name: 'AI Recruiter', description: 'Talent sourcing & screening' },
    { id: 'ai-payroll', name: 'AI Payroll', description: 'Payroll processing' },
  ],
  marketing: [
    { id: 'ai-cmo', name: 'AI CMO', description: 'Marketing strategy' },
    { id: 'ai-content', name: 'AI Content', description: 'Content creation' },
  ],
  sales: [
    { id: 'ai-sdr', name: 'AI SDR', description: 'Lead qualification' },
    { id: 'ai-closer', name: 'AI Closer', description: 'Deal negotiation' },
  ],
  operations: [
    { id: 'ai-ops', name: 'AI Ops Manager', description: 'Process optimization' },
  ],
  legal: [
    { id: 'ai-legal', name: 'AI Legal Counsel', description: 'Contract review' },
  ],
};

export function AIWorkerSelector({ departments, aiConfig, onUpdate }: AIWorkerSelectorProps) {
  const handleToggle = (deptId: string, enabled: boolean) => {
    const newConfig = { ...aiConfig };
    if (!newConfig[deptId]) {
      newConfig[deptId] = { enabled, head: '' };
    } else {
      newConfig[deptId] = { ...newConfig[deptId], enabled };
    }
    onUpdate(newConfig);
  };

  const handleHeadChange = (deptId: string, head: string) => {
    const newConfig = { ...aiConfig };
    if (!newConfig[deptId]) {
      newConfig[deptId] = { enabled: true, head };
    } else {
      newConfig[deptId] = { ...newConfig[deptId], head };
    }
    onUpdate(newConfig);
  };

  return (
    <div className="ai-worker-selector">
      <h3>AI Workers</h3>
      <p className="helper-text">
        Configure AI workers for each department. Each worker is pre-trained for your industry.
      </p>

      {departments.map((deptId) => {
        const workers = AI_WORKERS[deptId] || [];
        const config = aiConfig[deptId] || { enabled: false, head: '' };

        return (
          <div key={deptId} className="dept-workers">
            <div className="dept-header">
              <h4>{DEPARTMENTS.find((d) => d.id === deptId)?.name || deptId}</h4>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleToggle(deptId, e.target.checked)}
                />
                <span>Enable AI Workers</span>
              </label>
            </div>

            {config.enabled && (
              <div className="workers-list">
                {workers.map((worker) => (
                  <div key={worker.id} className="worker-option">
                    <input
                      type="radio"
                      name={`head-${deptId}`}
                      value={worker.id}
                      checked={config.head === worker.id}
                      onChange={() => handleHeadChange(deptId, worker.id)}
                    />
                    <div className="worker-info">
                      <strong>{worker.name}</strong>
                      <span>{worker.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default IndustrySelector;
