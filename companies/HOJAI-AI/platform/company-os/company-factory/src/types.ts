/**
 * Company Factory Types
 *
 * One-click deployment for any industry.
 * Creates company with departments, AI workers, and distribution.
 */

export type IndustryType =
  | 'restaurant' | 'beauty' | 'hotel' | 'retail' | 'healthcare' | 'education'
  | 'realestate' | 'manufacturing' | 'fitness' | 'legal' | 'construction'
  | 'automotive' | 'logistics' | 'fashion' | 'sports' | 'entertainment'
  | 'travel' | 'government' | 'agriculture' | 'nonprofit' | 'professional'
  | 'home_services' | 'gaming' | 'media' | 'events' | 'exhibitions';

export type CompanyStage = 'startup' | 'growth' | 'enterprise' | 'franchise';

export interface CompanyFactoryTemplate {
  id: string;
  name: string;
  industry: IndustryType;
  description: string;
  icon: string;

  // What gets deployed
  defaultName: string;        // e.g., "My Restaurant"
  defaultDepartments: string[];
  defaultExtensions: string[];
  defaultAIWorkers: string[];
  defaultChannels: string[];  // Distribution channels

  // Templates
  websiteTemplate?: string;
  mobileAppTemplate?: string;
  brandingColors: {
    primary: string;
    secondary: string;
  };

  // Default settings
  defaultConfig: Record<string, unknown>;

  // Pricing
  setupFee: number;
  monthlyFee: number;

  // Stage capabilities
  capabilities: {
    startup: string[];
    growth: string[];
    enterprise: string[];
    franchise: string[];
  };
}

export interface FactoryDeployment {
  companyId: string;
  template: CompanyFactoryTemplate;
  companyName: string;
  stage: CompanyStage;
  deployedAt: string;
  status: 'pending' | 'deploying' | 'active' | 'failed';
  components: {
    companyOS: boolean;
    industryExtension: boolean;
    aiWorkers: string[];
    distributionChannels: string[];
    wallets: boolean;
    trust: boolean;
  };
}