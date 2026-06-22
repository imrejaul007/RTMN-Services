import { v4 as uuidv4 } from 'uuid';
import { RegisteredCompany, LedgerEntry, IRegisteredCompany, IService, ILedgerEntry } from '../models/company.model';
import { config } from '../config';
import logger from '../utils/logger';

export interface RegisterCompanyInput {
  corpId: string;
  name: string;
  type: string;
  industry: string;
  registrationNumber?: string;
  taxId?: string;
  aiAgentId?: string;
  creditLimit?: number;
  walletId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCompanyInput {
  name?: string;
  type?: string;
  industry?: string;
  registrationNumber?: string;
  taxId?: string;
  aiAgentId?: string;
  creditLimit?: number;
  walletId?: string;
  status?: string;
  trustScore?: number;
  metadata?: Record<string, unknown>;
}

export interface CompanyFilters {
  type?: string;
  industry?: string;
  status?: string;
  minTrustScore?: number;
  maxTrustScore?: number;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CompanyService {
  /**
   * Register a new company in the RTNM network
   */
  async registerCompany(input: RegisterCompanyInput): Promise<IRegisteredCompany> {
    try {
      logger.info(`Registering company: ${input.corpId}`);

      // Check if company already exists
      const existing = await RegisteredCompany.findByCorpId(input.corpId);
      if (existing) {
        throw new Error(`Company with corpId ${input.corpId} already exists`);
      }

      // Determine credit limit based on company type if not provided
      let creditLimit = input.creditLimit;
      if (!creditLimit) {
        creditLimit = this.getDefaultCreditLimit(input.type);
      }

      const company = new RegisteredCompany({
        ...input,
        corpId: input.corpId.toUpperCase(),
        creditLimit,
        currentCredit: 0,
        trustScore: 50, // Default trust score
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        servicesProvided: [],
        servicesConsumed: [],
        status: 'pending',
      });

      await company.save();

      logger.info(`Company registered successfully: ${company.corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error registering company: ${error}`);
      throw error;
    }
  }

  /**
   * Get company by corpId
   */
  async getCompany(corpId: string): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Getting company: ${corpId}`);
      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        logger.warn(`Company not found: ${corpId}`);
      }
      return company;
    } catch (error) {
      logger.error(`Error getting company: ${error}`);
      throw error;
    }
  }

  /**
   * Get all companies with filters and pagination
   */
  async getAllCompanies(
    filters: CompanyFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    companies: IRegisteredCompany[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination;

      const query: Record<string, unknown> = {};

      if (filters.type) {
        query.type = filters.type;
      }
      if (filters.industry) {
        query.industry = filters.industry;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.minTrustScore !== undefined) {
        query.trustScore = { ...((query.trustScore as object) || {}), $gte: filters.minTrustScore };
      }
      if (filters.maxTrustScore !== undefined) {
        query.trustScore = { ...((query.trustScore as object) || {}), $lte: filters.maxTrustScore };
      }
      if (filters.minCreditLimit !== undefined) {
        query.creditLimit = { ...((query.creditLimit as object) || {}), $gte: filters.minCreditLimit };
      }
      if (filters.maxCreditLimit !== undefined) {
        query.creditLimit = { ...((query.creditLimit as object) || {}), $lte: filters.maxCreditLimit };
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { corpId: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [companies, total] = await Promise.all([
        RegisteredCompany.find(query).sort(sort).skip(skip).limit(limit),
        RegisteredCompany.countDocuments(query),
      ]);

      return {
        companies,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Error getting all companies: ${error}`);
      throw error;
    }
  }

  /**
   * Update company details
   */
  async updateCompany(
    corpId: string,
    updates: UpdateCompanyInput
  ): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Updating company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      // Apply updates
      Object.keys(updates).forEach((key) => {
        const value = updates[key as keyof UpdateCompanyInput];
        if (value !== undefined) {
          (company as Record<string, unknown>)[key] = value;
        }
      });

      await company.save();

      logger.info(`Company updated successfully: ${corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error updating company: ${error}`);
      throw error;
    }
  }

  /**
   * Deactivate a company
   */
  async deactivateCompany(corpId: string): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Deactivating company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      company.status = 'inactive';
      company.deactivatedAt = new Date();

      await company.save();

      logger.info(`Company deactivated successfully: ${corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error deactivating company: ${error}`);
      throw error;
    }
  }

  /**
   * Get company services (both provided and consumed)
   */
  async getCompanyServices(corpId: string): Promise<{
    provided: IService[];
    consumed: IService[];
  }> {
    try {
      logger.info(`Getting services for company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      return {
        provided: company.servicesProvided,
        consumed: company.servicesConsumed,
      };
    } catch (error) {
      logger.error(`Error getting company services: ${error}`);
      throw error;
    }
  }

  /**
   * Add a service provided by the company
   */
  async addServiceProvided(
    corpId: string,
    service: Omit<IService, 'serviceId'>
  ): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Adding service to company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      const newService: IService = {
        ...service,
        serviceId: uuidv4(),
      };

      company.servicesProvided.push(newService);
      await company.save();

      logger.info(`Service added successfully: ${newService.serviceId}`);
      return company;
    } catch (error) {
      logger.error(`Error adding service: ${error}`);
      throw error;
    }
  }

  /**
   * Add a service consumed by the company
   */
  async addServiceConsumed(
    corpId: string,
    service: Omit<IService, 'serviceId'>
  ): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Adding consumed service to company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      const newService: IService = {
        ...service,
        serviceId: uuidv4(),
      };

      company.servicesConsumed.push(newService);
      await company.save();

      logger.info(`Consumed service added successfully: ${newService.serviceId}`);
      return company;
    } catch (error) {
      logger.error(`Error adding consumed service: ${error}`);
      throw error;
    }
  }

  /**
   * Get company ledger with pagination
   */
  async getCompanyLedger(
    corpId: string,
    options: { page?: number; limit?: number; startDate?: Date; endDate?: Date } = {}
  ): Promise<{
    entries: ILedgerEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalCredits: number;
      totalDebits: number;
      netBalance: number;
    };
  }> {
    try {
      logger.info(`Getting ledger for company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      const { page = 1, limit = 50, startDate, endDate } = options;
      const skip = (page - 1) * limit;

      const query: Record<string, unknown> = { corpId: corpId.toUpperCase() };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          (query.createdAt as Record<string, Date>).$gte = startDate;
        }
        if (endDate) {
          (query.createdAt as Record<string, Date>).$lte = endDate;
        }
      }

      const [entries, total] = await Promise.all([
        LedgerEntry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        LedgerEntry.countDocuments(query),
      ]);

      // Calculate summary
      const allEntries = await LedgerEntry.find(query);
      const totalCredits = allEntries
        .filter((e) => e.type === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalDebits = allEntries
        .filter((e) => e.type === 'debit')
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalCredits,
          totalDebits,
          netBalance: totalCredits - totalDebits,
        },
      };
    } catch (error) {
      logger.error(`Error getting company ledger: ${error}`);
      throw error;
    }
  }

  /**
   * Add ledger entry
   */
  async addLedgerEntry(
    corpId: string,
    entry: Omit<ILedgerEntry, 'entryId' | 'createdAt'>
  ): Promise<ILedgerEntry> {
    try {
      logger.info(`Adding ledger entry for company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      const ledgerEntry = new LedgerEntry({
        ...entry,
        entryId: uuidv4(),
        corpId: corpId.toUpperCase(),
        createdAt: new Date(),
      });

      await ledgerEntry.save();

      // Update company's current credit
      if (entry.type === 'credit') {
        company.currentCredit += entry.amount;
      } else {
        company.currentCredit -= entry.amount;
      }

      // Validate credit limit
      if (company.currentCredit > company.creditLimit) {
        logger.warn(`Company ${corpId} exceeded credit limit`);
      }

      await company.save();

      logger.info(`Ledger entry added: ${ledgerEntry.entryId}`);
      return ledgerEntry;
    } catch (error) {
      logger.error(`Error adding ledger entry: ${error}`);
      throw error;
    }
  }

  /**
   * Update trust score
   */
  async updateTrustScore(corpId: string, score: number): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Updating trust score for company: ${corpId} to ${score}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      if (score < 0 || score > 100) {
        throw new Error('Trust score must be between 0 and 100');
      }

      company.trustScore = score;
      await company.save();

      logger.info(`Trust score updated successfully: ${corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error updating trust score: ${error}`);
      throw error;
    }
  }

  /**
   * Update monthly revenue
   */
  async updateMonthlyRevenue(corpId: string, revenue: number): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Updating monthly revenue for company: ${corpId} to ${revenue}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      company.monthlyRevenue = revenue;
      await company.save();

      logger.info(`Monthly revenue updated: ${corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error updating monthly revenue: ${error}`);
      throw error;
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    totalServices: number;
    averageTrustScore: number;
    byType: Record<string, number>;
    byIndustry: Record<string, number>;
  }> {
    try {
      const [stats, typeStats, industryStats] = await Promise.all([
        RegisteredCompany.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              active: [{ $match: { status: 'active' } }, { $count: 'count' }],
              avgTrustScore: [{ $group: { _id: null, avg: { $avg: '$trustScore' } } }],
              totalServices: [
                { $project: { servicesCount: { $size: '$servicesProvided' } } },
                { $group: { _id: null, total: { $sum: '$servicesCount' } } },
              ],
            },
          },
        ]),
        RegisteredCompany.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        RegisteredCompany.aggregate([
          { $match: { status: 'active' } },
          { $group: { _id: '$industry', count: { $sum: 1 } } },
        ]),
      ]);

      const result = stats[0] || {};

      return {
        totalCompanies: result.total?.[0]?.count || 0,
        activeCompanies: result.active?.[0]?.count || 0,
        totalServices: result.totalServices?.[0]?.total || 0,
        averageTrustScore: result.avgTrustScore?.[0]?.avg || 0,
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byIndustry: industryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      logger.error(`Error getting network stats: ${error}`);
      throw error;
    }
  }

  /**
   * Activate company
   */
  async activateCompany(corpId: string): Promise<IRegisteredCompany | null> {
    try {
      logger.info(`Activating company: ${corpId}`);

      const company = await RegisteredCompany.findByCorpId(corpId);
      if (!company) {
        throw new Error(`Company not found: ${corpId}`);
      }

      company.status = 'active';
      await company.save();

      logger.info(`Company activated: ${corpId}`);
      return company;
    } catch (error) {
      logger.error(`Error activating company: ${error}`);
      throw error;
    }
  }

  /**
   * Delete company (hard delete)
   */
  async deleteCompany(corpId: string): Promise<boolean> {
    try {
      logger.info(`Deleting company: ${corpId}`);

      const result = await RegisteredCompany.deleteOne({ corpId: corpId.toUpperCase() });

      if (result.deletedCount === 0) {
        throw new Error(`Company not found: ${corpId}`);
      }

      logger.info(`Company deleted: ${corpId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting company: ${error}`);
      throw error;
    }
  }

  /**
   * Get default credit limit based on company type
   */
  private getDefaultCreditLimit(type: string): number {
    const limits: Record<string, number> = {
      ai: config.creditLimits.ai,
      payment: config.creditLimits.payment,
      consumer: config.creditLimits.consumer,
      merchant: config.creditLimits.merchant,
    };
    return limits[type] || config.creditLimits.other;
  }
}

export const companyService = new CompanyService();
export default companyService;