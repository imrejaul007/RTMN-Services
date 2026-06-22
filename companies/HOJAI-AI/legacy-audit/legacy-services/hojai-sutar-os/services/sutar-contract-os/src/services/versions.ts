// ============================================================================
// SUTAR Contract OS - Version Control Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ContractVersion, VersionDiff, Contract, Clause, Party } from '../types/index';

// In-memory store for versions
const versionStore = new Map<string, ContractVersion>();
const versionIndex = new Map<string, string[]>(); // contractId -> versionIds

// Generate checksum for version integrity
const generateChecksum = (contract: Partial<Contract>): string => {
  const data = JSON.stringify({
    terms: contract.terms,
    clauses: contract.clauses?.map(c => ({ id: c.id, content: c.content })),
    parties: contract.parties?.map(p => ({ id: p.id, name: p.name, email: p.email })),
    value: contract.value,
    startDate: contract.startDate,
    endDate: contract.endDate,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Version Service Functions
export const versionService = {
  // Create initial version of a contract
  createInitialVersion: (contract: Contract, createdBy?: string): ContractVersion => {
    const version: ContractVersion = {
      id: `version-${uuidv4()}`,
      contractId: contract.id,
      version: 1,
      versionLabel: 'v1.0',
      terms: contract.terms,
      clauses: [...contract.clauses],
      parties: [...contract.parties],
      status: contract.status,
      changeDescription: 'Initial version',
      createdAt: new Date().toISOString(),
      createdBy,
      checksum: generateChecksum(contract),
      isLocked: false,
    };

    versionStore.set(version.id, version);

    // Update index
    if (!versionIndex.has(contract.id)) {
      versionIndex.set(contract.id, []);
    }
    versionIndex.get(contract.id)!.push(version.id);

    console.log(`[VERSION] Created initial version: ${version.id} for contract ${contract.id}`);
    return version;
  },

  // Create a new version
  createVersion: (
    contractId: string,
    contract: Contract,
    changeDescription: string,
    createdBy?: string
  ): ContractVersion | undefined => {
    const existingVersions = versionIndex.get(contractId) || [];
    const latestVersion = existingVersions.length > 0
      ? versionStore.get(existingVersions[existingVersions.length - 1])
      : null;

    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;
    const majorVersion = Math.floor(newVersionNumber / 10) + 1;
    const minorVersion = newVersionNumber % 10;

    const version: ContractVersion = {
      id: `version-${uuidv4()}`,
      contractId,
      version: newVersionNumber,
      versionLabel: `v${majorVersion}.${minorVersion}`,
      terms: contract.terms,
      clauses: [...contract.clauses],
      parties: [...contract.parties],
      status: contract.status,
      changeDescription,
      createdAt: new Date().toISOString(),
      createdBy,
      checksum: generateChecksum(contract),
      isLocked: false,
    };

    // Lock the previous version
    if (latestVersion) {
      latestVersion.isLocked = true;
      versionStore.set(latestVersion.id, latestVersion);
    }

    versionStore.set(version.id, version);
    versionIndex.get(contractId)?.push(version.id);

    console.log(`[VERSION] Created version: ${version.id} (${version.versionLabel}) for contract ${contractId}`);
    return version;
  },

  // Get version by ID
  getVersion: (versionId: string): ContractVersion | undefined => {
    return versionStore.get(versionId);
  },

  // Get all versions for a contract
  getVersionsForContract: (contractId: string): ContractVersion[] => {
    const versionIds = versionIndex.get(contractId) || [];
    return versionIds
      .map(id => versionStore.get(id))
      .filter((v): v is ContractVersion => v !== undefined)
      .sort((a, b) => a.version - b.version);
  },

  // Get specific version of a contract
  getContractVersion: (contractId: string, versionNumber: number): ContractVersion | undefined => {
    const versions = versionService.getVersionsForContract(contractId);
    return versions.find(v => v.version === versionNumber);
  },

  // Get latest version
  getLatestVersion: (contractId: string): ContractVersion | undefined => {
    const versions = versionService.getVersionsForContract(contractId);
    return versions[versions.length - 1];
  },

  // Compare two versions
  compareVersions: (versionId1: string, versionId2: string): VersionDiff[] => {
    const version1 = versionStore.get(versionId1);
    const version2 = versionStore.get(versionId2);

    if (!version1 || !version2) return [];

    const diffs: VersionDiff[] = [];

    // Compare terms
    if (version1.terms !== version2.terms) {
      diffs.push({
        field: 'terms',
        oldValue: version1.terms.substring(0, 500) + (version1.terms.length > 500 ? '...' : ''),
        newValue: version2.terms.substring(0, 500) + (version2.terms.length > 500 ? '...' : ''),
        changeType: version1.terms ? 'modified' : 'added',
      });
    }

    // Compare clauses
    const clauses1Map = new Map(version1.clauses.map(c => [c.id, c]));
    const clauses2Map = new Map(version2.clauses.map(c => [c.id, c]));

    // Find added clauses
    version2.clauses.forEach(clause2 => {
      if (!clauses1Map.has(clause2.id)) {
        diffs.push({
          field: 'clause',
          oldValue: null,
          newValue: clause2.title,
          changeType: 'added',
        });
      }
    });

    // Find removed clauses
    version1.clauses.forEach(clause1 => {
      if (!clauses2Map.has(clause1.id)) {
        diffs.push({
          field: 'clause',
          oldValue: clause1.title,
          newValue: null,
          changeType: 'removed',
        });
      }
    });

    // Find modified clauses
    version2.clauses.forEach(clause2 => {
      const clause1 = clauses1Map.get(clause2.id);
      if (clause1 && clause1.content !== clause2.content) {
        diffs.push({
          field: `clause:${clause2.title}`,
          oldValue: clause1.content.substring(0, 200) + (clause1.content.length > 200 ? '...' : ''),
          newValue: clause2.content.substring(0, 200) + (clause2.content.length > 200 ? '...' : ''),
          changeType: 'modified',
        });
      }
    });

    // Compare parties
    const parties1Map = new Map(version1.parties.map(p => [p.id, p]));
    const parties2Map = new Map(version2.parties.map(p => [p.id, p]));

    version2.parties.forEach(party2 => {
      if (!parties1Map.has(party2.id)) {
        diffs.push({
          field: 'party',
          oldValue: null,
          newValue: party2.name,
          changeType: 'added',
        });
      }
    });

    version1.parties.forEach(party1 => {
      if (!parties2Map.has(party1.id)) {
        diffs.push({
          field: 'party',
          oldValue: party1.name,
          newValue: null,
          changeType: 'removed',
        });
      }
    });

    // Compare value
    if (version1.version !== version2.version) {
      diffs.push({
        field: 'version',
        oldValue: version1.versionLabel,
        newValue: version2.versionLabel,
        changeType: 'modified',
      });
    }

    return diffs;
  },

  // Restore a previous version
  restoreVersion: (versionId: string, restoredBy?: string): Contract | undefined => {
    const version = versionStore.get(versionId);
    if (!version) return undefined;

    // Create a new version based on the restored one
    const restoredContract: Contract = {
      id: version.contractId,
      type: 'service', // Would need to be stored in version
      title: 'Restored Contract',
      terms: version.terms,
      clauses: [...version.clauses],
      parties: [...version.parties],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      status: version.status,
      signatures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create new version for the restore
    const newVersion = versionService.createVersion(
      version.contractId,
      restoredContract,
      `Restored from ${version.versionLabel}`,
      restoredBy
    );

    console.log(`[VERSION] Restored version: ${versionId} by ${restoredBy}`);
    return restoredContract;
  },

  // Lock a version
  lockVersion: (versionId: string): ContractVersion | undefined => {
    const version = versionStore.get(versionId);
    if (!version) return undefined;

    version.isLocked = true;
    versionStore.set(versionId, version);

    console.log(`[VERSION] Locked version: ${versionId}`);
    return version;
  },

  // Unlock a version
  unlockVersion: (versionId: string): ContractVersion | undefined => {
    const version = versionStore.get(versionId);
    if (!version) return undefined;

    version.isLocked = false;
    versionStore.set(versionId, version);

    console.log(`[VERSION] Unlocked version: ${versionId}`);
    return version;
  },

  // Verify version integrity
  verifyVersionIntegrity: (versionId: string): {
    isValid: boolean;
    storedChecksum: string;
    computedChecksum: string;
  } | undefined => {
    const version = versionStore.get(versionId);
    if (!version) return undefined;

    const computedChecksum = generateChecksum({
      terms: version.terms,
      clauses: version.clauses,
      parties: version.parties,
    });

    return {
      isValid: version.checksum === computedChecksum,
      storedChecksum: version.checksum,
      computedChecksum,
    };
  },

  // Get version statistics
  getVersionStats: (): {
    totalVersions: number;
    totalContracts: number;
    averageVersionsPerContract: number;
    lockedVersions: number;
  } => {
    const versions = Array.from(versionStore.values());
    const contracts = new Set(versions.map(v => v.contractId));

    return {
      totalVersions: versions.length,
      totalContracts: contracts.size,
      averageVersionsPerContract: contracts.size > 0 ? versions.length / contracts.size : 0,
      lockedVersions: versions.filter(v => v.isLocked).length,
    };
  },

  // Get version history with summaries
  getVersionHistory: (contractId: string): {
    version: ContractVersion;
    summary: {
      isMajor: boolean;
      changesCount: number;
      daysSincePrevious: number;
    };
  }[] => {
    const versions = versionService.getVersionsForContract(contractId);

    return versions.map((version, index) => {
      const previousVersion = index > 0 ? versions[index - 1] : null;
      const daysSincePrevious = previousVersion
        ? Math.floor((new Date(version.createdAt).getTime() - new Date(previousVersion.createdAt).getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      // Count changes
      let changesCount = 0;
      if (previousVersion) {
        const diffs = versionService.compareVersions(previousVersion.id, version.id);
        changesCount = diffs.length;
      }

      return {
        version,
        summary: {
          isMajor: version.version % 10 === 0,
          changesCount,
          daysSincePrevious,
        },
      };
    });
  },

  // Delete old draft versions (keep only latest N versions)
  pruneVersions: (contractId: string, keepCount: number = 10): number => {
    const versionIds = versionIndex.get(contractId) || [];
    if (versionIds.length <= keepCount) return 0;

    const toDelete = versionIds.slice(0, versionIds.length - keepCount);
    let deleted = 0;

    toDelete.forEach(id => {
      const version = versionStore.get(id);
      if (version && !version.isLocked) {
        versionStore.delete(id);
        deleted++;
      }
    });

    if (deleted > 0) {
      versionIndex.set(contractId, versionIds.filter(id => versionStore.has(id)));
      console.log(`[VERSION] Pruned ${deleted} versions for contract ${contractId}`);
    }

    return deleted;
  },
};

export default versionService;