/**
 * Industry Builder Types
 *
 * Partners create IndustryOS extensions.
 */

export interface IndustryBuilder {
  id: string;
  partnerId: string;
  name: string;
  industry: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  createdAt: string;
}

export interface IndustryModule {
  id: string;
  builderId: string;
  name: string;
  type: 'core' | 'optional';
  routes: string[];
  dependencies: string[];
}

export interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  modules: string[];
  aiWorkers: string[];
  distributionChannels: string[];
  createdBy: string;
  status: 'template' | 'active' | 'deprecated';
}
