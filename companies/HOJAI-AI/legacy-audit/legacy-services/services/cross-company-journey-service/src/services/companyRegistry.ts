import { Company, CompanyType, EventType, ChannelType, ICompany } from '../models/journey';
import { logger } from '../utils/logger';

export interface CompanyConfig {
  companyId: string;
  name: string;
  displayName?: string;
  type?: CompanyType;
  description?: string;
  website?: string;
  logo?: string;
  webhookSecret?: string;
  webhookUrl?: string;
  eventTypes?: EventType[];
  channels?: ChannelType[];
  priority?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompanyInfo {
  companyId: string;
  name: string;
  displayName: string;
  type: CompanyType;
  description?: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  priority: number;
  eventTypes: EventType[];
  channels: ChannelType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyStats {
  companyId: string;
  totalCustomers: number;
  totalEvents: number;
  totalRevenue: number;
  activeCustomers: number;
  averageEventsPerCustomer: number;
}

export class CompanyRegistry {
  // Pre-configured RTNM companies
  private readonly DEFAULT_COMPANIES: CompanyConfig[] = [
    {
      companyId: 'rez-auth',
      name: 'RABTUL-Auth',
      displayName: 'REZ Auth Service',
      type: CompanyType.CORE_PLATFORM,
      description: 'Authentication and identity management',
      website: 'https://auth.rez.ai',
      eventTypes: [EventType.LOGIN, EventType.LOGOUT, EventType.SIGNUP],
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.API]
    },
    {
      companyId: 'rez-payment',
      name: 'RABTUL-Payment',
      displayName: 'REZ Payment Service',
      type: CompanyType.CORE_PLATFORM,
      description: 'Payment processing and wallet management',
      website: 'https://payment.rez.ai',
      eventTypes: [EventType.PAYMENT, EventType.PURCHASE, EventType.REFUND],
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.POS, ChannelType.API]
    },
    {
      companyId: 'rez-wallet',
      name: 'RABTUL-Wallet',
      displayName: 'REZ Wallet Service',
      type: CompanyType.CORE_PLATFORM,
      description: 'Digital wallet and rewards',
      website: 'https://wallet.rez.ai',
      eventTypes: [EventType.PAYMENT, EventType.SUBSCRIPTION, EventType.FEEDBACK],
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.WHATSAPP]
    },
    {
      companyId: 'rez-merchant',
      name: 'REZ-Merchant',
      displayName: 'REZ Merchant Platform',
      type: CompanyType.MERCHANT,
      description: 'Merchant management and POS',
      website: 'https://merchant.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.POS, ChannelType.WEB, ChannelType.MOBILE_APP]
    },
    {
      companyId: 'rez-commerce',
      name: 'REZ-Commerce',
      displayName: 'REZ Commerce',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Consumer and merchant e-commerce',
      website: 'https://commerce.rez.ai',
      eventTypes: Object.values(EventType),
      channels: Object.values(ChannelType)
    },
    {
      companyId: 'rez-stayown',
      name: 'StayOwn',
      displayName: 'StayOwn Hotel Platform',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Hotel hospitality ecosystem',
      website: 'https://stayown.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.WHATSAPP, ChannelType.POS]
    },
    {
      companyId: 'rez-hotel',
      name: 'Hotel OS',
      displayName: 'Hotel Operating System',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Hotel management and booking',
      website: 'https://hotel.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.POS]
    },
    {
      companyId: 'ridza',
      name: 'RidZa',
      displayName: 'RidZa Financial Services',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Financial marketplace (Loans & Insurance)',
      website: 'https://ridza.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.CALL, ChannelType.API]
    },
    {
      companyId: 'ridza-finance',
      name: 'RIDZA-FinanceOS',
      displayName: 'RIDZA FinanceOS',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'AI Finance Department',
      website: 'https://finance.ridza.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.API]
    },
    {
      companyId: 'neXha',
      name: 'NeXha',
      displayName: 'NeXha Commerce Network',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Distribution and franchise network',
      website: 'https://nexha.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.API]
    },
    {
      companyId: 'corpperks',
      name: 'CorpPerks',
      displayName: 'CorpPerks Enterprise',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Enterprise SaaS (HRMS, Procurement)',
      website: 'https://corpperks.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP]
    },
    {
      companyId: 'risacare',
      name: 'RisaCare',
      displayName: 'RisaCare Healthcare',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Healthcare services',
      website: 'https://risacare.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.CALL]
    },
    {
      companyId: 'khairmove',
      name: 'KHAIRMOVE',
      displayName: 'KHAIRMOVE Mobility',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Mobility services (Ride, Delivery, Fleet)',
      website: 'https://khairmove.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.MOBILE_APP, ChannelType.WEB, ChannelType.API]
    },
    {
      companyId: 'airzy',
      name: 'Airzy',
      displayName: 'Airzy Travel',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Airport, Lounge, Flights services',
      website: 'https://airzy.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP, ChannelType.API]
    },
    {
      companyId: 'risnaestate',
      name: 'RisnaEstate',
      displayName: 'RisnaEstate Real Estate',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Real estate platform',
      website: 'https://risnaestate.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.MOBILE_APP]
    },
    {
      companyId: 'axom',
      name: 'Axom',
      displayName: 'Axom Life AI',
      type: CompanyType.VERTICAL_COMPANY,
      description: 'Life AI (Cosmic OS, Rendez, BuzzLocal)',
      website: 'https://axom.rez.ai',
      eventTypes: Object.values(EventType),
      channels: Object.values(ChannelType)
    },
    {
      companyId: 'genie',
      name: 'GENIE',
      displayName: 'GENIE Personal AI',
      type: CompanyType.AI_SERVICE,
      description: 'Personal AI Assistant',
      website: 'https://genie.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WHATSAPP, ChannelType.TELEGRAM, ChannelType.SLACK, ChannelType.WEB]
    },
    {
      companyId: 'razo',
      name: 'RAZO',
      displayName: 'RAZO Revenue OS',
      type: CompanyType.AI_SERVICE,
      description: 'Revenue AI Operating System',
      website: 'https://razo.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.WEB, ChannelType.API]
    },
    {
      companyId: 'rez-intelligence',
      name: 'REZ-Intelligence',
      displayName: 'REZ Intelligence',
      type: CompanyType.AI_SERVICE,
      description: '247+ AI/ML services',
      website: 'https://intelligence.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.API, ChannelType.WEB]
    },
    {
      companyId: 'hojai-core',
      name: 'HOJAI CORE',
      displayName: 'HOJAI AI Core',
      type: CompanyType.AI_SERVICE,
      description: 'AI Infrastructure platform',
      website: 'https://hojai.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.API]
    },
    {
      companyId: 'go4food',
      name: 'Go4Food',
      displayName: 'Go4Food Consumer App',
      type: CompanyType.CONSUMER,
      description: 'AI food advisor and discovery',
      website: 'https://go4food.rez.ai',
      eventTypes: Object.values(EventType),
      channels: [ChannelType.MOBILE_APP, ChannelType.WEB]
    }
  ];

  /**
   * Initialize default companies
   */
  async initializeDefaultCompanies(): Promise<void> {
    logger.info('Initializing default RTNM companies...');

    for (const companyConfig of this.DEFAULT_COMPANIES) {
      try {
        await this.registerCompany(companyConfig);
      } catch (error) {
        // Company might already exist, which is fine
        if (error instanceof Error && !error.message.includes('already exists')) {
          logger.error(`Error registering company ${companyConfig.companyId}`, error);
        }
      }
    }

    logger.info(`Initialized ${this.DEFAULT_COMPANIES.length} default companies`);
  }

  /**
   * List all registered companies
   */
  async listCompanies(): Promise<CompanyInfo[]> {
    const companies = await Company.find({})
      .select('-webhookSecret')
      .sort({ priority: -1, name: 1 })
      .lean();

    return companies.map(c => this.toCompanyInfo(c));
  }

  /**
   * List only active companies
   */
  async listActiveCompanies(): Promise<CompanyInfo[]> {
    const companies = await Company.find({ isActive: true })
      .select('-webhookSecret')
      .sort({ priority: -1, name: 1 })
      .lean();

    return companies.map(c => this.toCompanyInfo(c));
  }

  /**
   * List companies by type
   */
  async listCompaniesByType(type: CompanyType): Promise<CompanyInfo[]> {
    const companies = await Company.find({ type, isActive: true })
      .select('-webhookSecret')
      .sort({ priority: -1, name: 1 })
      .lean();

    return companies.map(c => this.toCompanyInfo(c));
  }

  /**
   * Register a new company
   */
  async registerCompany(config: CompanyConfig): Promise<CompanyInfo> {
    logger.info(`Registering company: ${config.companyId}`);

    // Check if company already exists
    const existing = await Company.findOne({ companyId: config.companyId });

    if (existing) {
      throw new Error(`Company ${config.companyId} already exists`);
    }

    const company = new Company({
      companyId: config.companyId,
      name: config.name,
      displayName: config.displayName || config.name,
      type: config.type || CompanyType.VERTICAL_COMPANY,
      description: config.description,
      website: config.website,
      logo: config.logo,
      webhookSecret: config.webhookSecret,
      webhookUrl: config.webhookUrl,
      eventTypes: config.eventTypes || Object.values(EventType),
      channels: config.channels || Object.values(ChannelType),
      isActive: config.isActive ?? true,
      priority: config.priority || 0,
      metadata: config.metadata || {}
    });

    await company.save();

    logger.info(`Company registered successfully: ${config.companyId}`);

    return this.toCompanyInfo(company.toObject());
  }

  /**
   * Get company configuration
   */
  async getCompanyConfig(companyId: string): Promise<CompanyInfo | null> {
    const company = await Company.findOne({ companyId })
      .select('-webhookSecret')
      .lean();

    if (!company) {
      return null;
    }

    return this.toCompanyInfo(company);
  }

  /**
   * Get company with webhook secret
   */
  async getCompanyWithSecret(companyId: string): Promise<ICompany | null> {
    return Company.findOne({ companyId });
  }

  /**
   * Update company configuration
   */
  async updateCompanyConfig(
    companyId: string,
    updates: Partial<CompanyConfig>
  ): Promise<CompanyInfo | null> {
    logger.info(`Updating company config: ${companyId}`);

    const updateData: Record<string, unknown> = {};

    if (updates.displayName) updateData.displayName = updates.displayName;
    if (updates.description) updateData.description = updates.description;
    if (updates.website) updateData.website = updates.website;
    if (updates.logo) updateData.logo = updates.logo;
    if (updates.webhookUrl) updateData.webhookUrl = updates.webhookUrl;
    if (updates.eventTypes) updateData.eventTypes = updates.eventTypes;
    if (updates.channels) updateData.channels = updates.channels;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const company = await Company.findOneAndUpdate(
      { companyId },
      { $set: updateData },
      { new: true }
    ).select('-webhookSecret').lean();

    if (!company) {
      return null;
    }

    logger.info(`Company updated successfully: ${companyId}`);

    return this.toCompanyInfo(company);
  }

  /**
   * Deactivate a company
   */
  async deactivateCompany(companyId: string): Promise<boolean> {
    const result = await Company.updateOne(
      { companyId },
      { $set: { isActive: false } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Company deactivated: ${companyId}`);
      return true;
    }

    return false;
  }

  /**
   * Activate a company
   */
  async activateCompany(companyId: string): Promise<boolean> {
    const result = await Company.updateOne(
      { companyId },
      { $set: { isActive: true } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Company activated: ${companyId}`);
      return true;
    }

    return false;
  }

  /**
   * Regenerate webhook secret for a company
   */
  async regenerateWebhookSecret(companyId: string): Promise<string | null> {
    const crypto = await import('crypto');
    const newSecret = crypto.randomBytes(32).toString('hex');

    const result = await Company.updateOne(
      { companyId },
      { $set: { webhookSecret: newSecret } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Webhook secret regenerated for: ${companyId}`);
      return newSecret;
    }

    return null;
  }

  /**
   * Delete a company (soft delete - just deactivate)
   */
  async deleteCompany(companyId: string): Promise<boolean> {
    return this.deactivateCompany(companyId);
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: string): Promise<CompanyStats | null> {
    const company = await Company.findOne({ companyId });

    if (!company) {
      return null;
    }

    // Get unique customers and total events
    const { JourneyEvent, UnifiedJourney } = await import('../models/journey');

    const [eventStats, customerStats] = await Promise.all([
      JourneyEvent.aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $in: ['$eventType', ['purchase', 'payment', 'checkout_complete']] },
                  { $ifNull: ['$properties.totalAmount', 0] },
                  0
                ]
              }
            }
          }
        }
      ]),
      UnifiedJourney.aggregate([
        { $unwind: '$companies' },
        { $match: { 'companies.companyId': companyId } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$lastActivityDate',
                      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const eventResult = eventStats[0] || { totalEvents: 0, totalRevenue: 0 };
    const customerResult = customerStats[0] || { totalCustomers: 0, activeCustomers: 0 };

    return {
      companyId,
      totalCustomers: customerResult.totalCustomers,
      totalEvents: eventResult.totalEvents,
      totalRevenue: eventResult.totalRevenue,
      activeCustomers: customerResult.activeCustomers,
      averageEventsPerCustomer:
        customerResult.totalCustomers > 0
          ? eventResult.totalEvents / customerResult.totalCustomers
          : 0
    };
  }

  /**
   * Search companies by name
   */
  async searchCompanies(query: string): Promise<CompanyInfo[]> {
    const companies = await Company.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .select('-webhookSecret')
      .limit(20)
      .lean();

    return companies.map(c => this.toCompanyInfo(c));
  }

  /**
   * Get companies by IDs
   */
  async getCompaniesByIds(companyIds: string[]): Promise<CompanyInfo[]> {
    const companies = await Company.find({
      companyId: { $in: companyIds }
    })
      .select('-webhookSecret')
      .lean();

    return companies.map(c => this.toCompanyInfo(c));
  }

  /**
   * Get company count
   */
  async getCompanyCount(): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true })
    ]);

    return { total, active };
  }

  /**
   * Convert to CompanyInfo type
   */
  private toCompanyInfo(company: Record<string, unknown>): CompanyInfo {
    return {
      companyId: company.companyId as string,
      name: company.name as string,
      displayName: company.displayName as string,
      type: company.type as CompanyType,
      description: company.description as string | undefined,
      website: company.website as string | undefined,
      logo: company.logo as string | undefined,
      isActive: company.isActive as boolean,
      priority: company.priority as number,
      eventTypes: company.eventTypes as EventType[],
      channels: company.channels as ChannelType[],
      createdAt: company.createdAt as Date,
      updatedAt: company.updatedAt as Date
    };
  }
}

export const companyRegistry = new CompanyRegistry();
