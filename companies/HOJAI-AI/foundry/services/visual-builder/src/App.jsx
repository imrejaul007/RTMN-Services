/**
 * HOJAI Visual Workflow Builder - Main App
 */

import React, { useState, useEffect } from 'react';
import WorkflowCanvas from './components/Canvas.jsx';

const API_BASE = process.env.API_URL || '';

function App() {
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch workflows and templates on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [workflowsRes, templatesRes] = await Promise.all([
          fetch(`${API_BASE}/api/workflows`),
          fetch(`${API_BASE}/api/templates`)
        ]);
        const workflowsData = await workflowsRes.json();
        const templatesData = await templatesRes.json();
        setWorkflows(workflowsData.workflows || []);
        setTemplates(templatesData.templates || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Create new workflow
  const createWorkflow = async (templateId) => {
    try {
      const res = await fetch(`${API_BASE}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, name: 'New Workflow' }),
      });
      const workflow = await res.json();
      setCurrentWorkflow(workflow);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  // Save workflow
  const saveWorkflow = async (data) => {
    if (!currentWorkflow) return;
    try {
      await fetch(`${API_BASE}/api/workflows/${currentWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      alert('Workflow saved!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}>⏳</div>
        <div>Loading Visual Builder...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🎨 HOJAI Visual Builder</div>
        <div style={styles.nav}>
          <span style={styles.breadcrumb}>
            {currentWorkflow ? currentWorkflow.name : 'Select a workflow'}
          </span>
        </div>
      </header>

      {!currentWorkflow ? (
        /* Workflow Selection */
        <div style={styles.selection}>
          <h2 style={styles.sectionTitle}>Start from Template</h2>
          <div style={styles.templateGrid}>
            {templates.map(template => (
              <div
                key={template.id}
                style={styles.templateCard}
                onClick={() => createWorkflow(template.id)}
              >
                <div style={styles.templateIcon}>
                  {getCategoryIcon(template.category)}
                </div>
                <div style={styles.templateName}>{template.name}</div>
                <div style={styles.templateCategory}>{template.category}</div>
                <div style={styles.templateDesc}>{template.description}</div>
              </div>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Your Workflows</h2>
          {workflows.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <div>No workflows yet. Start from a template above.</div>
            </div>
          ) : (
            <div style={styles.workflowList}>
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  style={styles.workflowItem}
                  onClick={() => setCurrentWorkflow(workflow)}
                >
                  <div style={styles.workflowName}>{workflow.name}</div>
                  <div style={styles.workflowMeta}>
                    {workflow.nodes?.length || 0} nodes
                    {' • '}
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Workflow Canvas */
        <WorkflowCanvas
          workflowId={currentWorkflow.id}
          workflow={currentWorkflow}
          onSave={saveWorkflow}
          onBack={() => setCurrentWorkflow(null)}
        />
      )}
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    sales: '💰',
    marketing: '📢',
    hr: '👥',
    finance: '💳',
    support: '🎧',
    founder: '🚀',
    restaurant: '🍽️',
    healthcare: '🏥',
    real_estate: '🏠',
    commerce: '🛒',
  };
  return icons[category] || '⚙️';
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
    color: '#64748b',
  },
  spinner: {
    fontSize: '32px',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
  },
  nav: {
    display: 'flex',
    gap: '16px',
  },
  breadcrumb: {
    fontSize: '14px',
    color: '#64748b',
  },
  selection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
    marginTop: '32px',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  templateCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s',
  },
  templateIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  templateName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '4px',
  },
  templateCategory: {
    fontSize: '12px',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  templateDesc: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  empty: {
    textAlign: 'center',
    padding: '48px',
    color: '#64748b',
    background: 'white',
    borderRadius: '12px',
    border: '2px dashed #e2e8f0',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  workflowList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  workflowItem: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
  },
  workflowName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '4px',
  },
  workflowMeta: {
    fontSize: '12px',
    color: '#64748b',
  },
};

export default App;
