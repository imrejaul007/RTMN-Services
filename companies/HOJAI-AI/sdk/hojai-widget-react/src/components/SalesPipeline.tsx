/**
 * SalesPipeline - Kanban-style sales pipeline component
 *
 * Features:
 * - Kanban board with columns for each stage
 * - Cards showing deal value, contact, probability
 * - Drag-and-drop between stages
 * - Quick actions (call, email, add note)
 * - Deal detail modal
 * - Add new deal form
 * - Filters (by owner, value range, date)
 * - Summary stats (total value, deal count, avg deal size)
 */

import * as React from 'react';

// Types
export interface Deal {
  dealId: string;
  title: string;
  description: string;
  value: number;
  currency: 'INR' | 'USD';
  stage: PipelineStage;
  probability: number;
  contactId?: string;
  contactName: string;
  contactEmail?: string;
  owner: string;
  products: DealProduct[];
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: string;
  notes: string[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  commission?: number;
}

export interface DealProduct {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface Activity {
  type: string;
  description: string;
  timestamp: string;
}

export interface Quote {
  quoteId: string;
  quoteNumber: string;
  dealId?: string;
  contactId?: string;
  contactName: string;
  contactEmail?: string;
  items: QuoteItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  validUntil: string;
  terms: string;
  status: QuoteStatus;
  sentAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface QuoteItem {
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface PipelineStageConfig {
  id: PipelineStage;
  name: string;
  probability: number;
  color: string;
}

export interface PipelineData {
  stages: Record<PipelineStage, PipelineStageData>;
  summary: PipelineSummary;
}

export interface PipelineStageData extends PipelineStageConfig {
  deals: Deal[];
}

export interface PipelineSummary {
  totalValue: number;
  totalWeightedValue: number;
  dealCount: number;
  avgDealSize: number;
}

export interface NewDealForm {
  title: string;
  description: string;
  value: string;
  currency: 'INR' | 'USD';
  contactName: string;
  contactEmail: string;
  owner: string;
  expectedCloseDate: string;
}

interface SalesPipelineProps {
  apiBaseUrl: string;
  apiKey: string;
  companyId?: string;
  currency?: string;
  onDealCreated?: (deal: Deal) => void;
  onDealUpdated?: (deal: Deal) => void;
  onDealMoved?: (dealId: string, fromStage: PipelineStage, toStage: PipelineStage) => void;
}

// Pipeline stage configuration
const PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: 'lead', name: 'Lead', probability: 10, color: '#94A3B8' },
  { id: 'qualified', name: 'Qualified', probability: 25, color: '#3B82F6' },
  { id: 'proposal', name: 'Proposal Sent', probability: 50, color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', probability: 75, color: '#8B5CF6' },
  { id: 'won', name: 'Won', probability: 100, color: '#22C55E' },
  { id: 'lost', name: 'Lost', probability: 0, color: '#EF4444' }
];

// Main component
export const SalesPipeline: React.FC<SalesPipelineProps> = ({
  apiBaseUrl,
  apiKey,
  companyId = 'default',
  currency = '₹',
  onDealCreated,
  onDealUpdated,
  onDealMoved
}) => {
  const [pipelineData, setPipelineData] = React.useState<PipelineData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = React.useState<Deal | null>(null);
  const [showNewDealForm, setShowNewDealForm] = React.useState(false);
  const [filters, setFilters] = React.useState({
    owner: '',
    minValue: '',
    maxValue: ''
  });
  const [draggedDeal, setDraggedDeal] = React.useState<Deal | null>(null);

  // Fetch pipeline data
  const fetchPipeline = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/pipeline`, {
        headers: {
          'X-API-Key': apiKey,
          'X-Company-Id': companyId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pipeline');
      }

      const data = await response.json();
      setPipelineData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, apiKey, companyId]);

  React.useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Move deal to new stage
  const moveDeal = async (dealId: string, newStage: PipelineStage) => {
    const deal = Object.values(pipelineData?.stages || {})
      .flatMap(s => s.deals)
      .find(d => d.dealId === dealId);

    if (!deal || deal.stage === newStage) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/deals/${dealId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Company-Id': companyId
        },
        body: JSON.stringify({ stage: newStage })
      });

      if (!response.ok) {
        throw new Error('Failed to move deal');
      }

      onDealMoved?.(dealId, deal.stage, newStage);
      fetchPipeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move deal');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: PipelineStage) => {
    if (draggedDeal) {
      moveDeal(draggedDeal.dealId, stage);
      setDraggedDeal(null);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return `${currency}${value.toLocaleString()}`;
  };

  // Filter deals
  const filterDeals = (deals: Deal[]) => {
    return deals.filter(deal => {
      if (filters.owner && deal.owner !== filters.owner) return false;
      if (filters.minValue && deal.value < parseInt(filters.minValue)) return false;
      if (filters.maxValue && deal.value > parseInt(filters.maxValue)) return false;
      return true;
    });
  };

  // Get unique owners
  const owners = React.useMemo(() => {
    const ownerSet = new Set<string>();
    Object.values(pipelineData?.stages || {}).forEach(stage => {
      stage.deals.forEach(deal => ownerSet.add(deal.owner));
    });
    return Array.from(ownerSet);
  }, [pipelineData]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>Error: {error}</p>
        <button style={styles.retryButton} onClick={fetchPipeline}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Sales Pipeline</h2>
        <button style={styles.addButton} onClick={() => setShowNewDealForm(true)}>
          + New Deal
        </button>
      </div>

      {/* Summary Stats */}
      {pipelineData && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Total Pipeline</p>
            <p style={styles.statValue}>{formatCurrency(pipelineData.summary.totalValue)}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Weighted Value</p>
            <p style={styles.statValue}>{formatCurrency(pipelineData.summary.totalWeightedValue)}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Open Deals</p>
            <p style={styles.statValue}>{pipelineData.summary.dealCount}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Avg Deal Size</p>
            <p style={styles.statValue}>{formatCurrency(pipelineData.summary.avgDealSize)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filtersRow}>
        <select
          style={styles.filterSelect}
          value={filters.owner}
          onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
        >
          <option value="">All Owners</option>
          {owners.map(owner => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min Value"
          style={styles.filterInput}
          value={filters.minValue}
          onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Value"
          style={styles.filterInput}
          value={filters.maxValue}
          onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
        />
      </div>

      {/* Kanban Board */}
      <div style={styles.kanbanBoard}>
        {PIPELINE_STAGES.map(stage => {
          const stageData = pipelineData?.stages[stage.id];
          const deals = filterDeals(stageData?.deals || []);
          const stageValue = deals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div
              key={stage.id}
              style={styles.kanbanColumn}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column Header */}
              <div style={{ ...styles.columnHeader, borderTopColor: stage.color }}>
                <div style={styles.columnTitleRow}>
                  <span style={styles.columnName}>{stage.name}</span>
                  <span style={styles.dealCount}>{deals.length}</span>
                </div>
                <p style={styles.stageValue}>{formatCurrency(stageValue)}</p>
                <p style={styles.stageProbability}>{stage.probability}%</p>
              </div>

              {/* Deal Cards */}
              <div style={styles.dealList}>
                {deals.map(deal => (
                  <DealCard
                    key={deal.dealId}
                    deal={deal}
                    currency={currency}
                    onDragStart={() => handleDragStart(deal)}
                    onClick={() => setSelectedDeal(deal)}
                    isDragging={draggedDeal?.dealId === deal.dealId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          currency={currency}
          onClose={() => setSelectedDeal(null)}
          apiBaseUrl={apiBaseUrl}
          apiKey={apiKey}
          companyId={companyId}
          onDealUpdated={fetchPipeline}
        />
      )}

      {/* New Deal Form Modal */}
      {showNewDealForm && (
        <NewDealModal
          currency={currency}
          onClose={() => setShowNewDealForm(false)}
          apiBaseUrl={apiBaseUrl}
          apiKey={apiKey}
          companyId={companyId}
          onDealCreated={(deal) => {
            onDealCreated?.(deal);
            setShowNewDealForm(false);
            fetchPipeline();
          }}
        />
      )}
    </div>
  );
};

// Deal Card Component
interface DealCardProps {
  deal: Deal;
  currency: string;
  onDragStart: () => void;
  onClick: () => void;
  isDragging: boolean;
}

const DealCard: React.FC<DealCardProps> = ({
  deal,
  currency,
  onDragStart,
  onClick,
  isDragging
}) => {
  return (
    <div
      style={{
        ...styles.dealCard,
        opacity: isDragging ? 0.5 : 1
      }}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div style={styles.dealCardHeader}>
        <span style={styles.dealTitle}>{deal.title}</span>
        <span style={styles.dealProbability}>{deal.probability}%</span>
      </div>
      <p style={styles.dealValue}>{currency}{deal.value.toLocaleString()}</p>
      <div style={styles.dealCardFooter}>
        <span style={styles.dealContact}>{deal.contactName}</span>
        <span style={styles.dealOwner}>{deal.owner}</span>
      </div>
      {deal.expectedCloseDate && (
        <p style={styles.dealCloseDate}>
          Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

// Deal Detail Modal
interface DealDetailModalProps {
  deal: Deal;
  currency: string;
  onClose: () => void;
  apiBaseUrl: string;
  apiKey: string;
  companyId: string;
  onDealUpdated: () => void;
}

const DealDetailModal: React.FC<DealDetailModalProps> = ({
  deal,
  currency,
  onClose,
  apiBaseUrl,
  apiKey,
  companyId,
  onDealUpdated
}) => {
  const [note, setNote] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);

  const formatCurrency = (value: number) => `${currency}${value.toLocaleString()}`;

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/deals/${deal.dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Company-Id': companyId
        },
        body: JSON.stringify({
          notes: [...deal.notes, note]
        })
      });

      if (response.ok) {
        setNote('');
        setAddingNote(false);
        onDealUpdated();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleCloseDeal = async (status: 'won' | 'lost') => {
    const body: { status: 'won' | 'lost'; lostReason?: string } = { status };
    if (status === 'lost') {
      body.lostReason = 'Closed from UI';
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/deals/${deal.dealId}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Company-Id': companyId
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        onDealUpdated();
        onClose();
      }
    } catch (err) {
      console.error('Failed to close deal:', err);
    }
  };

  const stageConfig = PIPELINE_STAGES.find(s => s.id === deal.stage);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{deal.title}</h3>
            <span style={{ ...styles.stageBadge, backgroundColor: stageConfig?.color }}>
              {stageConfig?.name}
            </span>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div style={styles.modalContent}>
          {/* Deal Info */}
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Value</label>
              <p style={styles.infoValue}>{formatCurrency(deal.value)}</p>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Probability</label>
              <p style={styles.infoValue}>{deal.probability}%</p>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Contact</label>
              <p style={styles.infoValue}>{deal.contactName}</p>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Email</label>
              <p style={styles.infoValue}>{deal.contactEmail || 'N/A'}</p>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Owner</label>
              <p style={styles.infoValue}>{deal.owner}</p>
            </div>
            <div style={styles.infoItem}>
              <label style={styles.infoLabel}>Expected Close</label>
              <p style={styles.infoValue}>
                {deal.expectedCloseDate
                  ? new Date(deal.expectedCloseDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
          </div>

          {/* Description */}
          {deal.description && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Description</h4>
              <p style={styles.description}>{deal.description}</p>
            </div>
          )}

          {/* Products */}
          {deal.products.length > 0 && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Products</h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Unit Price</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.products.map((product, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{product.name}</td>
                      <td style={styles.td}>{product.quantity}</td>
                      <td style={styles.td}>{formatCurrency(product.unitPrice)}</td>
                      <td style={styles.td}>
                        {formatCurrency(product.quantity * product.unitPrice * (1 - product.discount / 100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h4 style={styles.sectionTitle}>Notes ({deal.notes.length})</h4>
              <button
                style={styles.smallButton}
                onClick={() => setAddingNote(!addingNote)}
              >
                + Add Note
              </button>
            </div>

            {addingNote && (
              <div style={styles.noteForm}>
                <textarea
                  style={styles.noteTextarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                />
                <div style={styles.noteActions}>
                  <button style={styles.cancelButton} onClick={() => setAddingNote(false)}>
                    Cancel
                  </button>
                  <button style={styles.saveButton} onClick={handleAddNote}>
                    Save
                  </button>
                </div>
              </div>
            )}

            {deal.notes.length === 0 && !addingNote && (
              <p style={styles.emptyText}>No notes yet</p>
            )}

            {deal.notes.slice().reverse().map((noteText, i) => (
              <div key={i} style={styles.noteCard}>
                <p style={styles.noteText}>{noteText}</p>
              </div>
            ))}
          </div>

          {/* Activities */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Activity</h4>
            {deal.activities.slice().reverse().map((activity, i) => (
              <div key={i} style={styles.activityItem}>
                <span style={styles.activityIcon}>
                  {activity.type === 'created' ? '📝' :
                   activity.type === 'won' ? '🎉' :
                   activity.type === 'lost' ? '❌' :
                   activity.type === 'stage_change' ? '➡️' : '📋'}
                </span>
                <div>
                  <p style={styles.activityDescription}>{activity.description}</p>
                  <p style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.modalActions}>
          {deal.stage !== 'won' && deal.stage !== 'lost' && (
            <>
              <button
                style={styles.wonButton}
                onClick={() => handleCloseDeal('won')}
              >
                Mark as Won
              </button>
              <button
                style={styles.lostButton}
                onClick={() => handleCloseDeal('lost')}
              >
                Mark as Lost
              </button>
            </>
          )}
          <button style={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// New Deal Modal
interface NewDealModalProps {
  currency: string;
  onClose: () => void;
  apiBaseUrl: string;
  apiKey: string;
  companyId: string;
  onDealCreated: (deal: Deal) => void;
}

const NewDealModal: React.FC<NewDealModalProps> = ({
  currency,
  onClose,
  apiBaseUrl,
  apiKey,
  companyId,
  onDealCreated
}) => {
  const [formData, setFormData] = React.useState<NewDealForm>({
    title: '',
    description: '',
    value: '',
    currency: 'INR',
    contactName: '',
    contactEmail: '',
    owner: 'system',
    expectedCloseDate: ''
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Company-Id': companyId
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          value: parseFloat(formData.value),
          currency: formData.currency,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          owner: formData.owner,
          expectedCloseDate: formData.expectedCloseDate || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create deal');
      }

      const newDeal = await response.json();
      onDealCreated(newDeal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>New Deal</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.modalContent}>
          {error && (
            <div style={styles.errorBanner}>{error}</div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Deal title"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deal description"
              rows={3}
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Value *</label>
              <input
                type="number"
                style={styles.input}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
                min="0"
                placeholder="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Currency</label>
              <select
                style={styles.select}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'INR' | 'USD' })}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Name *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Email</label>
              <input
                type="email"
                style={styles.input}
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Owner</label>
              <input
                type="text"
                style={styles.input}
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Sales Rep"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Expected Close Date</label>
              <input
                type="date"
                style={styles.input}
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={styles.saveButton} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    backgroundColor: '#0F172A',
    minHeight: '100vh',
    color: '#F1F5F9'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#22C55E',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: '#1E293B',
    padding: '16px',
    borderRadius: '8px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: '0 0 4px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#22C55E',
    margin: 0
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  filterSelect: {
    padding: '8px 12px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '13px'
  },
  filterInput: {
    padding: '8px 12px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '13px',
    width: '120px'
  },
  kanbanBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '20px'
  },
  kanbanColumn: {
    backgroundColor: '#1E293B',
    borderRadius: '8px',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column'
  },
  columnHeader: {
    padding: '12px',
    borderTop: '3px solid',
    borderRadius: '8px 8px 0 0'
  },
  columnTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  columnName: {
    fontSize: '14px',
    fontWeight: '600'
  },
  dealCount: {
    backgroundColor: '#334155',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  stageValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#22C55E',
    margin: '4px 0 0'
  },
  stageProbability: {
    fontSize: '12px',
    color: '#94A3B8',
    margin: 0
  },
  dealList: {
    flex: 1,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    maxHeight: '500px'
  },
  dealCard: {
    backgroundColor: '#0F172A',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'grab',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  dealCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  dealTitle: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
    flex: 1,
    marginRight: '8px'
  },
  dealProbability: {
    fontSize: '11px',
    color: '#94A3B8',
    backgroundColor: '#334155',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  dealValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#22C55E',
    margin: '0 0 8px'
  },
  dealCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94A3B8'
  },
  dealContact: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100px'
  },
  dealOwner: {
    flexShrink: 0
  },
  dealCloseDate: {
    fontSize: '10px',
    color: '#64748B',
    margin: '6px 0 0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #334155',
    borderTopColor: '#22C55E',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: '12px'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px'
  },
  errorText: {
    color: '#EF4444',
    marginBottom: '12px'
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    borderBottom: '1px solid #334155'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    lineHeight: 1
  },
  modalContent: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },
  stageBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    marginTop: '8px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  },
  infoItem: {
    marginBottom: '8px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    marginBottom: '4px'
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    margin: 0
  },
  section: {
    marginBottom: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 12px'
  },
  description: {
    fontSize: '13px',
    color: '#CBD5E1',
    margin: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    textAlign: 'left',
    padding: '8px',
    borderBottom: '1px solid #334155',
    color: '#94A3B8'
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #334155'
  },
  smallButton: {
    padding: '4px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  noteForm: {
    marginBottom: '12px'
  },
  noteTextarea: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '13px',
    resize: 'vertical'
  },
  noteActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    justifyContent: 'flex-end'
  },
  noteCard: {
    backgroundColor: '#0F172A',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '8px'
  },
  noteText: {
    fontSize: '13px',
    margin: 0
  },
  emptyText: {
    fontSize: '13px',
    color: '#64748B',
    fontStyle: 'italic'
  },
  activityItem: {
    display: 'flex',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #334155'
  },
  activityIcon: {
    fontSize: '16px'
  },
  activityDescription: {
    fontSize: '13px',
    margin: 0
  },
  activityTime: {
    fontSize: '11px',
    color: '#94A3B8',
    margin: '2px 0 0'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #334155',
    justifyContent: 'flex-end'
  },
  wonButton: {
    padding: '10px 20px',
    backgroundColor: '#22C55E',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  lostButton: {
    padding: '10px 20px',
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#22C55E',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#CBD5E1'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#F1F5F9',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #EF4444',
    borderRadius: '6px',
    padding: '12px',
    color: '#EF4444',
    fontSize: '13px',
    marginBottom: '16px'
  }
};

export default SalesPipeline;
