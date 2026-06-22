import { v4 as uuidv4 } from 'uuid';
import { Contract, IContract, IParty } from '../models/Contract';
import { logger } from '../utils/logger';

export interface CreateContractDto {
  title: string;
  type: 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
  parties: Omit<IParty, 'signedAt' | 'signatureData' | 'ipAddress' | 'userAgent'>[];
  content: string;
  variables?: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  autoRenew?: boolean;
  renewalTermMonths?: number;
  terms?: string[];
  createdBy: string;
  tenantId: string;
}

export interface UpdateContractDto {
  title?: string;
  type?: 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
  parties?: IParty[];
  content?: string;
  variables?: Record<string, unknown>;
  startDate?: Date;
  endDate?: Date;
  autoRenew?: boolean;
  renewalTermMonths?: number;
  terms?: string[];
}

export interface ContractQuery {
  tenantId: string;
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ContractService {
  async create(dto: CreateContractDto): Promise<IContract> {
    const contractId = `CTR-${uuidv4().substring(0, 8).toUpperCase()}`;

    const contract = new Contract({
      contractId,
      title: dto.title,
      type: dto.type,
      status: 'draft',
      parties: dto.parties,
      content: dto.content,
      variables: dto.variables || {},
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      autoRenew: dto.autoRenew || false,
      renewalTermMonths: dto.renewalTermMonths || 12,
      terms: dto.terms || [],
      metadata: {
        createdBy: dto.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        previousVersions: []
      },
      tenantId: dto.tenantId,
      auditTrail: [{
        action: 'created',
        performedBy: dto.createdBy,
        performedAt: new Date(),
        details: 'Contract created'
      }]
    });

    await contract.save();
    logger.info(`Contract created: ${contractId}`, { contractId, tenantId: dto.tenantId });
    return contract;
  }

  async findById(contractId: string, tenantId: string): Promise<IContract | null> {
    return Contract.findOne({ contractId, tenantId });
  }

  async findByIdWithAccess(contractId: string, tenantId: string, userEmail: string): Promise<IContract | null> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) return null;

    const hasAccess = contract.parties.some(p => p.email === userEmail) ||
                      contract.metadata.createdBy === userEmail;
    if (!hasAccess) {
      logger.warn(`Access denied to contract ${contractId} for user ${userEmail}`);
      return null;
    }
    return contract;
  }

  async findAll(query: ContractQuery): Promise<{ contracts: IContract[]; total: number }> {
    const { tenantId, status, type, search, page = 1, limit = 20 } = query;

    const filter: Record<string, unknown> = { tenantId };

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'parties.name': { $regex: search, $options: 'i' } },
        { 'parties.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [contracts, total] = await Promise.all([
      Contract.find(filter)
        .sort({ 'metadata.createdAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contract.countDocuments(filter)
    ]);

    return { contracts: contracts as unknown as IContract[], total };
  }

  async update(contractId: string, tenantId: string, dto: UpdateContractDto, updatedBy: string): Promise<IContract | null> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) return null;

    const previousVersion = JSON.stringify({
      title: contract.title,
      type: contract.type,
      content: contract.content,
      parties: contract.parties,
      variables: contract.variables,
      terms: contract.terms
    });

    if (dto.title) contract.title = dto.title;
    if (dto.type) contract.type = dto.type;
    if (dto.parties) contract.parties = dto.parties;
    if (dto.content) contract.content = dto.content;
    if (dto.variables) contract.variables = dto.variables;
    if (dto.startDate) contract.startDate = new Date(dto.startDate);
    if (dto.endDate) contract.endDate = new Date(dto.endDate);
    if (dto.autoRenew !== undefined) contract.autoRenew = dto.autoRenew;
    if (dto.renewalTermMonths) contract.renewalTermMonths = dto.renewalTermMonths;
    if (dto.terms) contract.terms = dto.terms;

    contract.metadata.version += 1;
    contract.metadata.previousVersions.push(previousVersion);
    contract.metadata.updatedAt = new Date();

    contract.auditTrail.push({
      action: 'updated',
      performedBy: updatedBy,
      performedAt: new Date(),
      details: `Updated to version ${contract.metadata.version}`
    });

    await contract.save();
    logger.info(`Contract updated: ${contractId}`, { contractId, tenantId, version: contract.metadata.version });
    return contract;
  }

  async updateStatus(contractId: string, tenantId: string, status: IContract['status'], updatedBy: string): Promise<IContract | null> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) return null;

    const previousStatus = contract.status;
    contract.status = status;

    if (status === 'signed') {
      contract.metadata.signedAt = new Date();
    }

    contract.metadata.updatedAt = new Date();
    contract.auditTrail.push({
      action: 'status_changed',
      performedBy: updatedBy,
      performedAt: new Date(),
      details: `Status changed from ${previousStatus} to ${status}`
    });

    await contract.save();
    logger.info(`Contract status updated: ${contractId}`, { contractId, previousStatus, newStatus: status });
    return contract;
  }

  async delete(contractId: string, tenantId: string): Promise<boolean> {
    const result = await Contract.deleteOne({ contractId, tenantId });
    if (result.deletedCount > 0) {
      logger.info(`Contract deleted: ${contractId}`, { contractId, tenantId });
      return true;
    }
    return false;
  }

  async getHistory(contractId: string, tenantId: string): Promise<{
    current: IContract;
    versions: { version: number; data: unknown; updatedAt: Date }[];
    auditTrail: IContract['auditTrail'];
  } | null> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) return null;

    const versions = contract.metadata.previousVersions.map((v, idx) => ({
      version: idx + 1,
      data: JSON.parse(v),
      updatedAt: contract.metadata.updatedAt
    }));

    return {
      current: contract,
      versions,
      auditTrail: contract.auditTrail
    };
  }

  async getUpcomingRenewals(tenantId: string, daysAhead: number = 30): Promise<IContract[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return Contract.find({
      tenantId,
      status: 'signed',
      autoRenew: true,
      endDate: {
        $gte: today,
        $lte: futureDate
      }
    }).sort({ endDate: 1 }).lean() as unknown as IContract[];
  }

  async markExpired(): Promise<number> {
    const today = new Date();
    const result = await Contract.updateMany(
      {
        status: 'signed',
        endDate: { $lt: today }
      },
      {
        $set: { status: 'expired' }
      }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} contracts as expired`);
    }
    return result.modifiedCount;
  }

  async getStats(tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingSignatures: number;
    expiringThisMonth: number;
  }> {
    const [contracts, byStatus, byType] = await Promise.all([
      Contract.countDocuments({ tenantId }),
      Contract.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Contract.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [pendingSignatures, expiringThisMonth] = await Promise.all([
      Contract.countDocuments({ tenantId, status: { $in: ['pending_signature', 'partially_signed'] } }),
      Contract.countDocuments({
        tenantId,
        status: 'signed',
        endDate: { $gte: today, $lte: endOfMonth }
      })
    ]);

    const statusMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });
    byType.forEach(t => { typeMap[t._id] = t.count; });

    return {
      total: contracts,
      byStatus: statusMap,
      byType: typeMap,
      pendingSignatures,
      expiringThisMonth
    };
  }
}

export const contractService = new ContractService();
