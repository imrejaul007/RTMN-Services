// ============================================================================
// SUTAR Contract OS - Amendment Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Amendment, AmendmentChange, Contract, Clause } from '../types/index';

// In-memory stores
const amendmentStore = new Map<string, Amendment>();
const amendmentIndex = new Map<string, string[]>(); // contractId -> amendmentIds

// Amendment Service Functions
export const amendmentService = {
  // Create an amendment proposal
  createAmendment: (
    contractId: string,
    options: {
      title: string;
      description: string;
      changes: AmendmentChange[];
      proposedBy: string;
      effectiveDate?: string;
      reason?: string;
    }
  ): Amendment => {
    const existingAmendments = amendmentIndex.get(contractId) || [];
    const latestVersion = existingAmendments.length > 0
      ? amendmentStore.get(existingAmendments[existingAmendments.length - 1])?.version || 0
      : 0;

    const amendment: Amendment = {
      id: `amendment-${uuidv4()}`,
      contractId,
      version: latestVersion + 1,
      title: options.title,
      description: options.description,
      changes: options.changes,
      status: 'pending',
      proposedBy: options.proposedBy,
      proposedAt: new Date().toISOString(),
      effectiveDate: options.effectiveDate,
      reason: options.reason,
    };

    amendmentStore.set(amendment.id, amendment);

    if (!amendmentIndex.has(contractId)) {
      amendmentIndex.set(contractId, []);
    }
    amendmentIndex.get(contractId)!.push(amendment.id);

    console.log(`[AMENDMENT] Created: ${amendment.id} for contract ${contractId}`);
    return amendment;
  },

  // Get amendment by ID
  getAmendment: (amendmentId: string): Amendment | undefined => {
    return amendmentStore.get(amendmentId);
  },

  // Get amendments for contract
  getAmendmentsForContract: (contractId: string): Amendment[] => {
    const amendmentIds = amendmentIndex.get(contractId) || [];
    return amendmentIds
      .map(id => amendmentStore.get(id))
      .filter((a): a is Amendment => a !== undefined)
      .sort((a, b) => b.version - a.version);
  },

  // Get pending amendments
  getPendingAmendments: (): Amendment[] => {
    return Array.from(amendmentStore.values())
      .filter(a => a.status === 'pending')
      .sort((a, b) => new Date(a.proposedAt).getTime() - new Date(b.proposedAt).getTime());
  },

  // Approve amendment
  approveAmendment: (
    amendmentId: string,
    reviewedBy: string,
    comments?: string
  ): Amendment | undefined => {
    const amendment = amendmentStore.get(amendmentId);
    if (!amendment) return undefined;

    if (amendment.status !== 'pending') {
      console.log(`[AMENDMENT] Cannot approve amendment with status: ${amendment.status}`);
      return undefined;
    }

    amendment.status = 'approved';
    amendment.reviewedBy = reviewedBy;
    amendment.reviewedAt = new Date().toISOString();

    amendmentStore.set(amendmentId, amendment);
    console.log(`[AMENDMENT] Approved: ${amendmentId} by ${reviewedBy}`);
    return amendment;
  },

  // Reject amendment
  rejectAmendment: (
    amendmentId: string,
    reviewedBy: string,
    reason: string
  ): Amendment | undefined => {
    const amendment = amendmentStore.get(amendmentId);
    if (!amendment) return undefined;

    if (amendment.status !== 'pending') {
      console.log(`[AMENDMENT] Cannot reject amendment with status: ${amendment.status}`);
      return undefined;
    }

    amendment.status = 'rejected';
    amendment.reviewedBy = reviewedBy;
    amendment.reviewedAt = new Date().toISOString();
    amendment.reason = reason;

    amendmentStore.set(amendmentId, amendment);
    console.log(`[AMENDMENT] Rejected: ${amendmentId} by ${reviewedBy} - ${reason}`);
    return amendment;
  },

  // Apply amendment to contract
  applyAmendment: (amendmentId: string, contract: Contract): Contract | undefined => {
    const amendment = amendmentStore.get(amendmentId);
    if (!amendment) return undefined;

    if (amendment.status !== 'approved') {
      console.log(`[AMENDMENT] Cannot apply amendment with status: ${amendment.status}`);
      return undefined;
    }

    // Apply each change to the contract
    amendment.changes.forEach(change => {
      switch (change.field) {
        case 'terms':
          contract.terms = change.newValue;
          break;
        case 'value':
          contract.value = change.newValue;
          break;
        case 'endDate':
          contract.endDate = change.newValue;
          break;
        case 'status':
          contract.status = change.newValue;
          break;
        case 'party':
          if (change.changeType === 'added') {
            contract.parties.push(change.newValue);
          } else if (change.changeType === 'removed') {
            contract.parties = contract.parties.filter(p => p.id !== change.oldValue.id);
          }
          break;
        case 'clause':
          if (change.changeType === 'added') {
            contract.clauses.push(change.newValue);
          } else if (change.changeType === 'removed') {
            contract.clauses = contract.clauses.filter(c => c.id !== change.oldValue.id);
          } else if (change.changeType === 'modified') {
            const index = contract.clauses.findIndex(c => c.id === change.path);
            if (index !== -1) {
              contract.clauses[index] = change.newValue;
            }
          }
          break;
      }
    });

    contract.updatedAt = new Date().toISOString();
    amendment.status = 'applied';

    amendmentStore.set(amendmentId, amendment);
    console.log(`[AMENDMENT] Applied: ${amendmentId} to contract ${contract.id}`);
    return contract;
  },

  // Generate amendment changes
  generateChanges: (
    oldContract: Partial<Contract>,
    newContract: Partial<Contract>
  ): AmendmentChange[] => {
    const changes: AmendmentChange[] = [];

    // Compare terms
    if (oldContract.terms !== newContract.terms) {
      changes.push({
        field: 'terms',
        path: 'terms',
        oldValue: oldContract.terms,
        newValue: newContract.terms,
        changeType: 'modified',
      });
    }

    // Compare value
    if (oldContract.value !== newContract.value) {
      changes.push({
        field: 'value',
        path: 'value',
        oldValue: oldContract.value,
        newValue: newContract.value,
        changeType: 'modified',
      });
    }

    // Compare endDate
    if (oldContract.endDate !== newContract.endDate) {
      changes.push({
        field: 'endDate',
        path: 'endDate',
        oldValue: oldContract.endDate,
        newValue: newContract.endDate,
        changeType: 'modified',
      });
    }

    // Compare clauses
    const oldClausesMap = new Map((oldContract.clauses || []).map(c => [c.id, c]));
    const newClausesMap = new Map((newContract.clauses || []).map(c => [c.id, c]));

    // Find added clauses
    newContract.clauses?.forEach(clause => {
      if (!oldClausesMap.has(clause.id)) {
        changes.push({
          field: 'clause',
          path: clause.id,
          oldValue: null,
          newValue: clause,
          changeType: 'added',
        });
      }
    });

    // Find removed clauses
    oldContract.clauses?.forEach(clause => {
      if (!newClausesMap.has(clause.id)) {
        changes.push({
          field: 'clause',
          path: clause.id,
          oldValue: clause,
          newValue: null,
          changeType: 'removed',
        });
      }
    });

    // Find modified clauses
    newContract.clauses?.forEach(clause => {
      const oldClause = oldClausesMap.get(clause.id);
      if (oldClause && (oldClause.content !== clause.content || oldClause.title !== clause.title)) {
        changes.push({
          field: 'clause',
          path: clause.id,
          oldValue: oldClause,
          newValue: clause,
          changeType: 'modified',
        });
      }
    });

    // Compare parties
    const oldPartiesMap = new Map((oldContract.parties || []).map(p => [p.id, p]));
    const newPartiesMap = new Map((newContract.parties || []).map(p => [p.id, p]));

    // Find added parties
    newContract.parties?.forEach(party => {
      if (!oldPartiesMap.has(party.id)) {
        changes.push({
          field: 'party',
          path: party.id,
          oldValue: null,
          newValue: party,
          changeType: 'added',
        });
      }
    });

    // Find removed parties
    oldContract.parties?.forEach(party => {
      if (!newPartiesMap.has(party.id)) {
        changes.push({
          field: 'party',
          path: party.id,
          oldValue: party,
          newValue: null,
          changeType: 'removed',
        });
      }
    });

    return changes;
  },

  // Cancel amendment
  cancelAmendment: (amendmentId: string, cancelledBy: string): boolean => {
    const amendment = amendmentStore.get(amendmentId);
    if (!amendment) return false;

    if (amendment.status !== 'pending') {
      console.log(`[AMENDMENT] Cannot cancel amendment with status: ${amendment.status}`);
      return false;
    }

    amendment.status = 'rejected';
    amendment.reviewedBy = cancelledBy;
    amendment.reviewedAt = new Date().toISOString();
    amendment.reason = 'Cancelled by proposer';

    amendmentStore.set(amendmentId, amendment);
    console.log(`[AMENDMENT] Cancelled: ${amendmentId} by ${cancelledBy}`);
    return true;
  },

  // Get amendment statistics
  getAmendmentStats: (): {
    totalAmendments: number;
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
    averageReviewTime: number;
  } => {
    const amendments = Array.from(amendmentStore.values());

    let totalReviewTime = 0;
    let reviewedCount = 0;
    amendments.forEach(a => {
      if (a.reviewedAt) {
        const proposed = new Date(a.proposedAt).getTime();
        const reviewed = new Date(a.reviewedAt).getTime();
        totalReviewTime += (reviewed - proposed) / (60 * 60 * 1000); // Hours
        reviewedCount++;
      }
    });

    return {
      totalAmendments: amendments.length,
      pending: amendments.filter(a => a.status === 'pending').length,
      approved: amendments.filter(a => a.status === 'approved').length,
      rejected: amendments.filter(a => a.status === 'rejected').length,
      applied: amendments.filter(a => a.status === 'applied').length,
      averageReviewTime: reviewedCount > 0 ? totalReviewTime / reviewedCount : 0,
    };
  },

  // Compare amendment with current contract
  compareAmendmentWithContract: (amendmentId: string, contract: Contract): AmendmentChange[] => {
    const amendment = amendmentStore.get(amendmentId);
    if (!amendment) return [];

    // Get the changes already in the amendment
    return amendment.changes;
  },

  // Get amendment history for contract
  getAmendmentHistory: (contractId: string): {
    amendment: Amendment;
    applied: boolean;
    daysAfterCreation: number;
  }[] => {
    const amendments = amendmentService.getAmendmentsForContract(contractId);

    return amendments.map(amendment => {
      const proposedDate = new Date(amendment.proposedAt);
      const now = new Date();
      const daysAfterCreation = Math.floor((now.getTime() - proposedDate.getTime()) / (24 * 60 * 60 * 1000));

      return {
        amendment,
        applied: amendment.status === 'applied',
        daysAfterCreation,
      };
    });
  },

  // Quick amendment - change single field
  quickAmend: (
    contractId: string,
    field: string,
    newValue: any,
    proposedBy: string,
    reason: string
  ): Amendment => {
    const change: AmendmentChange = {
      field,
      path: field,
      oldValue: null, // Would need current value
      newValue,
      changeType: 'modified',
    };

    return amendmentService.createAmendment(contractId, {
      title: `Quick Amendment: ${field}`,
      description: reason,
      changes: [change],
      proposedBy,
      reason,
    });
  },

  // Clone amendment
  cloneAmendment: (amendmentId: string, newProposedBy: string): Amendment | undefined => {
    const original = amendmentStore.get(amendmentId);
    if (!original) return undefined;

    return amendmentService.createAmendment(original.contractId, {
      title: `${original.title} (Copy)`,
      description: original.description,
      changes: original.changes,
      proposedBy: newProposedBy,
      reason: `Cloned from amendment ${amendmentId}`,
    });
  },
};

export default amendmentService;