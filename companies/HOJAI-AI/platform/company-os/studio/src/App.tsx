/**
 * CompanyOS Studio
 *
 * Web UI for creating and managing companies.
 */

import React, { useState } from 'react';
import { IndustrySelector, DepartmentSelector, AIWorkerSelector } from './components/IndustrySelector';
import { api } from './lib/api';

type Step = 'industry' | 'departments' | 'ai' | 'review' | 'creating' | 'complete';

interface CompanyConfig {
  name: string;
  industry: string;
  departments: string[];
  aiConfig: Record<string, { enabled: boolean; head: string }>;
}

export default function App() {
  const [step, setStep] = useState<Step>('industry');
  const [config, setConfig] = useState<CompanyConfig>({
    name: '',
    industry: '',
    departments: ['finance', 'hr'],
    aiConfig: {},
  });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIndustrySelect = (industry: string) => {
    setConfig({ ...config, industry });
    setStep('departments');
  };

  const handleDepartmentToggle = (dept: string, enabled: boolean) => {
    const newDepts = enabled
      ? [...config.departments, dept]
      : config.departments.filter(d => d !== dept);
    setConfig({ ...config, departments: newDepts });
  };

  const handleAIUpdate = (aiConfig: Record<string, { enabled: boolean; head: string }>) => {
    setConfig({ ...config, aiConfig });
  };

  const handleCreate = async () => {
    setStep('creating');
    setError(null);

    try {
      const result = await api.createCompany({
        name: config.name,
        industry: config.industry,
        departments: config.departments,
        ai_departments: config.aiConfig,
      });

      if (result.success) {
        setCompanyId(result.companyId);
        setStep('complete');
      } else {
        setError(result.error || 'Failed to create company');
        setStep('review');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
      setStep('review');
    }
  };

  const steps = [
    { id: 'industry', label: 'Industry' },
    { id: 'departments', label: 'Departments' },
    { id: 'ai', label: 'AI Workers' },
    { id: 'review', label: 'Review' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="studio">
      <header className="studio-header">
        <h1>🏗️ CompanyOS Studio</h1>
        <p>Create your company in minutes with AI workers</p>
      </header>

      <nav className="steps">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`step ${i <= currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
          >
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </nav>

      <main className="studio-content">
        {step === 'industry' && (
          <section className="step-content">
            <h2>Choose Your Industry</h2>
            <input
              type="text"
              placeholder="Company Name"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="company-name-input"
            />
            <IndustrySelector
              onSelect={handleIndustrySelect}
              selected={config.industry}
            />
          </section>
        )}

        {step === 'departments' && (
          <section className="step-content">
            <h2>Select Departments</h2>
            <DepartmentSelector
              onToggle={handleDepartmentToggle}
              selected={config.departments}
            />
            <div className="actions">
              <button onClick={() => setStep('industry')}>← Back</button>
              <button
                onClick={() => setStep('ai')}
                disabled={config.departments.length === 0}
              >
                Continue →
              </button>
            </div>
          </section>
        )}

        {step === 'ai' && (
          <section className="step-content">
            <h2>Configure AI Workers</h2>
            <AIWorkerSelector
              departments={config.departments}
              aiConfig={config.aiConfig}
              onUpdate={handleAIUpdate}
            />
            <div className="actions">
              <button onClick={() => setStep('departments')}>← Back</button>
              <button onClick={() => setStep('review')}>Continue →</button>
            </div>
          </section>
        )}

        {step === 'review' && (
          <section className="step-content">
            <h2>Review Your Company</h2>
            <div className="review-card">
              <div className="review-item">
                <span className="label">Company Name</span>
                <span className="value">{config.name || 'Unnamed Company'}</span>
              </div>
              <div className="review-item">
                <span className="label">Industry</span>
                <span className="value">{config.industry}</span>
              </div>
              <div className="review-item">
                <span className="label">Departments</span>
                <span className="value">{config.departments.join(', ')}</span>
              </div>
              <div className="review-item">
                <span className="label">AI Workers</span>
                <span className="value">
                  {Object.values(config.aiConfig).filter(a => a.enabled).length} enabled
                </span>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="actions">
              <button onClick={() => setStep('ai')}>← Back</button>
              <button
                className="primary"
                onClick={handleCreate}
                disabled={!config.name || !config.industry}
              >
                🚀 Create Company
              </button>
            </div>
          </section>
        )}

        {step === 'creating' && (
          <section className="step-content creating">
            <div className="spinner" />
            <h2>Creating Your Company...</h2>
            <p>Setting up departments, AI workers, and services</p>
          </section>
        )}

        {step === 'complete' && (
          <section className="step-content complete">
            <div className="success-icon">✅</div>
            <h2>Company Created!</h2>
            <p>Your company {config.name} is ready.</p>
            <div className="company-id">ID: {companyId}</div>
            <div className="actions">
              <button onClick={() => window.location.reload()}>
                Create Another Company
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
