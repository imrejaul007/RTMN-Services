import { logger } from '../../shared/logger';
'use client';

import React, { useState, useEffect } from 'react';
import { ContractTemplate as ContractTemplateType, ContractTerms, CreateTemplateInput } from '@nextabizz/shared-types';

// ============================================
// Types
// ============================================

interface ContractTemplateProps {
  template?: ContractTemplateType;
  onSave?: (template: CreateTemplateInput) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

// ============================================
// Constants
// ============================================

const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: '{{contractNumber}}', label: 'Contract Number', description: 'Unique contract identifier', example: 'CTR-2024-001' },
  { key: '{{merchantName}}', label: 'Merchant Name', description: 'Client/business name', example: 'ABC Restaurant' },
  { key: '{{supplierName}}', label: 'Supplier Name', description: 'Service provider name', example: 'CleanPro Services' },
  { key: '{{startDate}}', label: 'Start Date', description: 'Contract start date', example: 'January 1, 2024' },
  { key: '{{endDate}}', label: 'End Date', description: 'Contract end date', example: 'December 31, 2024' },
  { key: '{{totalValue}}', label: 'Total Value', description: 'Contract monetary value', example: '120,000' },
  { key: '{{currency}}', label: 'Currency', description: 'Currency code', example: 'INR' },
  { key: '{{paymentTerms}}', label: 'Payment Terms', description: 'Payment conditions', example: 'Net 30 days' },
  { key: '{{deliveryTerms}}', label: 'Delivery Terms', description: 'Delivery conditions', example: 'As per schedule' },
  { key: '{{terminationTerms}}', label: 'Termination Terms', description: 'Termination conditions', example: '30 days notice' },
  { key: '{{renewalType}}', label: 'Renewal Type', description: 'Type of renewal', example: 'Auto-Renewal' },
];

const DEFAULT_TERMS: ContractTerms = {
  paymentTerms: 'Net 30 days from invoice date',
  deliveryTerms: 'Services to be delivered as per agreed schedule',
  terminationTerms: 'Either party may terminate with 30 days written notice',
  warrantyTerms: 'Standard manufacturer/service warranty applies',
  penaltyTerms: 'Late delivery penalty: 1% per week of delayed amount',
  confidentialityTerms: 'Both parties agree to maintain strict confidentiality',
  intellectualPropertyTerms: 'All IP rights remain with original owner',
  liabilityTerms: 'Liability limited to contract value',
  forceMajeureTerms: 'Neither party liable for circumstances beyond control',
};

// ============================================
// Icons
// ============================================

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const VariableIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-amber-500 fill-current' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ============================================
// Preview Component
// ============================================

function TemplatePreview({
  content,
  variables,
}: {
  content: string;
  variables: Record<string, string>;
}) {
  const [copied, setCopied] = useState(false);

  const getProcessedContent = () => {
    let processed = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getProcessedContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DocumentIcon />
          <span className="text-sm font-medium text-gray-700">Preview</span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-6 max-h-96 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
          {getProcessedContent()}
        </pre>
      </div>
    </div>
  );
}

// ============================================
// Variable Selector Component
// ============================================

function VariableSelector({
  onInsert,
}: {
  onInsert: (variable: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <VariableIcon />
        <span className="text-sm font-medium text-gray-700">Insert Variable</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v.key}
            onClick={() => onInsert(v.key)}
            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm text-[#7C3AED]">{v.key}</span>
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to insert
              </span>
            </div>
            <p className="text-xs text-gray-500">{v.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Terms Editor Component
// ============================================

function TermsEditor({
  terms,
  onChange,
}: {
  terms: ContractTerms;
  onChange: (terms: ContractTerms) => void;
}) {
  const handleChange = (key: keyof ContractTerms, value: string) => {
    onChange({ ...terms, [key]: value });
  };

  const termFields: { key: keyof ContractTerms; label: string; required?: boolean }[] = [
    { key: 'paymentTerms', label: 'Payment Terms', required: true },
    { key: 'deliveryTerms', label: 'Delivery Terms', required: true },
    { key: 'terminationTerms', label: 'Termination Terms', required: true },
    { key: 'warrantyTerms', label: 'Warranty Terms' },
    { key: 'penaltyTerms', label: 'Penalty Terms' },
    { key: 'confidentialityTerms', label: 'Confidentiality Terms' },
    { key: 'intellectualPropertyTerms', label: 'Intellectual Property Terms' },
    { key: 'liabilityTerms', label: 'Liability Terms' },
    { key: 'forceMajeureTerms', label: 'Force Majeure Terms' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-4">Contract Terms</h3>
      <div className="space-y-4">
        {termFields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-gray-500 mb-1">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={terms[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Template Card Component
// ============================================

export function ContractTemplateCard({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  isSelected,
  onSelect,
}: {
  template: ContractTemplateType;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 transition-all cursor-pointer ${
        isSelected
          ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${template.isDefault ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
            <TemplateIcon />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{template.name}</h4>
              {template.isDefault && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  <StarIcon filled />
                  Default
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <EditIcon />
            Edit
          </button>
        )}
        {onSetDefault && !template.isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <StarIcon />
            Set Default
          </button>
        )}
        {onDelete && !template.isDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto"
          >
            <TrashIcon />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Contract Template Component
// ============================================

export default function ContractTemplate({
  template,
  onSave,
  onCancel,
  isEditing = false,
}: ContractTemplateProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [content, setContent] = useState(template?.content || '');
  const [terms, setTerms] = useState<ContractTerms>(template?.terms || DEFAULT_TERMS);
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'terms'>('editor');
  const [templates, setTemplates] = useState<ContractTemplateType[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch templates list
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/service-contracts?action=templates');
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data);
        }
      } catch (error) {
        logger.error('Failed to fetch templates:', error);
      }
    };

    if (!template) {
      fetchTemplates();
    }
  }, [template]);

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      alert('Template name and content are required');
      return;
    }

    const templateData: CreateTemplateInput = {
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
      terms,
      isDefault,
    };

    onSave?.(templateData);
  };

  const handleInsertVariable = (variable: string) => {
    setContent((prev) => prev + variable);
  };

  const handleCopyFromTemplate = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description || '');
      setContent(selectedTemplate.content);
      setTerms(selectedTemplate.terms);
    }
  };

  // If not editing, show template list
  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contract Templates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Reusable templates for recurring service contracts
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C3AED]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <ContractTemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Build a reusable contract template with customizable terms
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <XIcon />
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9]"
          >
            <SaveIcon />
            Save Template
          </button>
        </div>
      </div>

      {/* Template Name & Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              placeholder="e.g., Standard Service Agreement"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              placeholder="Brief description of this template"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-600">
            Set as default template for new contracts
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'editor', label: 'Content Editor' },
            { key: 'preview', label: 'Preview' },
            { key: 'terms', label: 'Terms' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#7C3AED] text-[#7C3AED]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {activeTab === 'editor' && (
          <>
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  placeholder="Enter your contract template content here. Use variables like {{merchantName}}, {{startDate}}, etc."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use template variables like {'{{merchantName}}'} to auto-fill values from contracts.
                </p>
              </div>
            </div>
            <div className="lg:col-span-1">
              <VariableSelector onInsert={handleInsertVariable} />

              {/* Copy from existing */}
              {templates.length > 0 && !template && (
                <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                  <span className="text-sm font-medium text-gray-700 mb-3 block">Start from existing</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleCopyFromTemplate(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                    defaultValue=""
                  >
                    <option value="">Select a template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'preview' && (
          <div className="lg:col-span-4">
            <TemplatePreview
              content={content}
              variables={{
                '{{contractNumber}}': 'CTR-2024-001',
                '{{merchantName}}': 'ABC Restaurant',
                '{{supplierName}}': 'Service Provider',
                '{{startDate}}': 'January 1, 2024',
                '{{endDate}}': 'December 31, 2024',
                '{{totalValue}}': '120,000',
                '{{currency}}': 'INR',
                '{{paymentTerms}}': terms.paymentTerms,
                '{{deliveryTerms}}': terms.deliveryTerms,
                '{{terminationTerms}}': terms.terminationTerms,
                '{{renewalType}}': 'Auto-Renewal',
              }}
            />
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="lg:col-span-4">
            <TermsEditor terms={terms} onChange={setTerms} />
          </div>
        )}
      </div>
    </div>
  );
}

// Export sub-components for independent use
export { TemplatePreview, VariableSelector, TermsEditor };
