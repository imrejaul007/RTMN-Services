/**
 * Marketing Department Pack
 * Complete AI marketing team with content, campaigns, and analytics
 */

import { Department } from '@hojai/agents';
import { Agent } from '@hojai/agents';

const contentAgent = new Agent({
  id: 'content-agent',
  name: 'Content Strategist',
  role: 'content',
  description: 'Content creation, SEO, and copywriting',
  skills: ['content_creation', 'seo_writing', 'copywriting', 'blog_writing'],
});

const campaignAgent = new Agent({
  id: 'campaign-agent',
  name: 'Campaign Manager',
  role: 'campaign',
  description: 'Campaign creation, optimization, and analysis',
  skills: ['campaign_creation', 'ad_optimization', 'budget_allocation', 'attribution'],
});

const socialAgent = new Agent({
  id: 'social-agent',
  name: 'Social Media Manager',
  role: 'social',
  description: 'Social media posting and engagement',
  skills: ['posting', 'scheduling', 'engagement', 'community_management'],
});

const analyticsAgent = new Agent({
  id: 'analytics-agent',
  name: 'Marketing Analyst',
  role: 'analytics',
  description: 'Data analysis and reporting',
  skills: ['data_analysis', 'reporting', 'dashboards', 'insights_generation'],
});

const seoAgent = new Agent({
  id: 'seo-agent',
  name: 'SEO Specialist',
  role: 'seo',
  description: 'Search optimization and keyword research',
  skills: ['keyword_research', 'on_page_seo', 'technical_seo', 'link_building'],
});

export const marketingDepartment = new Department({
  id: 'marketing-department',
  name: 'Marketing Department',
  type: 'marketing',
  description: 'AI-powered marketing team with content, campaigns, social, and analytics',
  head: campaignAgent,
  agents: [contentAgent, campaignAgent, socialAgent, analyticsAgent, seoAgent],
  workflows: [
    'content-calendar',
    'seo-automation',
    'social-scheduler',
    'campaign-launcher',
    'review-collector',
    'competitor-ad-tracker',
    'lead-magnet-delivery',
    'email-campaign',
    'ab-test-analyzer',
    'influencer-outreach',
  ],
  twins: ['campaign_twin', 'audience_twin', 'brand_twin', 'competitor_twin', 'content_twin'],
  memory: ['campaign_history', 'content_templates', 'audience_insights'],
});

export const marketingMetrics = {
  agents: 5,
  estimatedMonthlyCost: 50000,
  workflows: 10,
  integrations: ['google_analytics', 'meta_ads', 'linkedin', 'email', 'seo_tools'],
};

export default marketingDepartment;
