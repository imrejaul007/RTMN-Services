/**
 * Analytics Service - Lead analytics and reporting
 * Connects to: Journey Intelligence (4954), REZ CRM Hub (4056), REZ-SalesMind (5170)
 */

import axios from 'axios';
import logger from '../utils/logger.js';

const JOURNEY_INTELLIGENCE_URL = process.env.JOURNEY_INTELLIGENCE_URL || 'http://localhost:4954';
const REZ_CRM_HUB_URL = process.env.REZ_CRM_HUB_URL || 'http://localhost:4056';
const REZ_SALESMIND_URL = process.env.REZ_SALESMIND_URL || 'http://localhost:5170';

// Mock analytics data
const mockOverviewData = {
  totalLeads: 1247,
  qualifiedLeads: 423,
  openDeals: 89,
  revenue: 2450000,
  conversionRate: 12.5,
  avgTimeToConvert: 14.5,
  activeCampaigns: 12,
  emailsSent: 15680,
  emailOpenRate: 24.3,
  emailClickRate: 3.2,
  meetingsBooked: 156,
  callsMade: 892,
  responseRate: 8.7
};

const mockPipelineData = {
  stages: [
    { name: 'New', count: 456, value: 0, color: '#3182ce' },
    { name: 'Contacted', count: 234, value: 450000, color: '#805ad5' },
    { name: 'Qualified', count: 156, value: 890000, color: '#dd6b20' },
    { name: 'Proposal', count: 67, value: 1200000, color: '#d69e2e' },
    { name: 'Negotiation', count: 23, value: 780000, color: '#38a169' },
    { name: 'Closed Won', count: 89, value: 2450000, color: '#00b5d8' },
    { name: 'Closed Lost', count: 45, value: 320000, color: '#e53e3e' }
  ],
  avgDealSize: 27500,
  avgCycleTime: 14.5,
  winRate: 66.4
};

const mockOutreachData = {
  channels: [
    { name: 'Email', sent: 15680, delivered: 15234, opened: 3702, clicked: 502, responded: 342 },
    { name: 'LinkedIn', sent: 8920, viewed: 6234, clicked: 1234, responded: 234 },
    { name: 'Phone', called: 892, answered: 456, connected: 234, interested: 89 },
    { name: 'SMS', sent: 2340, delivered: 2290, replied: 156 }
  ],
  sequencePerformance: [
    { name: 'Initial Outreach', leads: 1200, responded: 234, converted: 45 },
    { name: 'Follow-up 1', leads: 966, responded: 156, converted: 34 },
    { name: 'Follow-up 2', leads: 810, responded: 89, converted: 23 },
    { name: 'Meeting Request', leads: 567, responded: 123, converted: 45 }
  ],
  bestTimes: [
    { day: 'Tuesday', hour: '10:00' },
    { day: 'Wednesday', hour: '14:00' },
    { day: 'Thursday', hour: '11:00' }
  ]
};

const mockConversionData = {
  funnel: [
    { stage: 'Leads', count: 1247, rate: 100 },
    { stage: 'Engaged', count: 678, rate: 54.4 },
    { stage: 'Qualified', count: 423, rate: 33.9 },
    { stage: 'Nurturing', count: 234, rate: 18.8 },
    { stage: 'Opportunity', count: 156, rate: 12.5 },
    { stage: 'Proposal', count: 67, rate: 5.4 },
    { stage: 'Negotiation', count: 23, rate: 1.8 },
    { stage: 'Won', count: 89, rate: 7.1 }
  ],
  avgTimeToConvert: 14.5,
  avgTimeByStage: {
    engaged: 2.3,
    qualified: 5.1,
    opportunity: 8.2,
    proposal: 11.4,
    negotiation: 13.8,
    won: 14.5
  },
  conversionBySource: [
    { source: 'Website', rate: 15.2 },
    { source: 'LinkedIn', rate: 12.8 },
    { source: 'Referral', rate: 28.5 },
    { source: 'Cold Outreach', rate: 4.2 },
    { source: 'Event', rate: 18.9 }
  ],
  conversionByIndustry: [
    { industry: 'Technology', rate: 16.5 },
    { industry: 'Healthcare', rate: 14.2 },
    { industry: 'Finance', rate: 13.8 },
    { industry: 'Retail', rate: 11.2 },
    { industry: 'Manufacturing', rate: 9.8 }
  ]
};

/**
 * Get analytics overview
 * @returns {Promise<Object>}
 */
async function getOverview() {
  try {
    // Fetch from multiple sources in parallel
    const [leadsResponse, journeyResponse, crmResponse] = await Promise.allSettled([
      axios.get(`${REZ_SALESMIND_URL}/api/dashboard/stats`, { timeout: 5000 }),
      axios.get(`${JOURNEY_INTELLIGENCE_URL}/overview`, { timeout: 5000 }),
      axios.get(`${REZ_CRM_HUB_URL}/api/deals/summary`, { timeout: 5000 })
    ]);

    // Use real data if available
    const leadsData = leadsResponse.status === 'fulfilled' ? leadsResponse.value.data : null;
    const journeyData = journeyResponse.status === 'fulfilled' ? journeyResponse.value.data : null;
    const crmData = crmResponse.status === 'fulfilled' ? crmResponse.value.data : null;

    if (leadsData || journeyData || crmData) {
      return {
        success: true,
        source: 'aggregated',
        data: {
          totalLeads: leadsData?.totalLeads || journeyData?.totalLeads || mockOverviewData.totalLeads,
          qualifiedLeads: leadsData?.qualifiedLeads || journeyData?.qualifiedLeads || mockOverviewData.qualifiedLeads,
          openDeals: crmData?.openDeals || mockOverviewData.openDeals,
          revenue: crmData?.revenue || journeyData?.revenue || mockOverviewData.revenue,
          conversionRate: journeyData?.conversionRate || mockOverviewData.conversionRate,
          avgTimeToConvert: journeyData?.avgTimeToConvert || mockOverviewData.avgTimeToConvert,
          activeCampaigns: leadsData?.activeCampaigns || mockOverviewData.activeCampaigns,
          emailsSent: leadsData?.emailsSent || mockOverviewData.emailsSent,
          emailOpenRate: leadsData?.emailOpenRate || mockOverviewData.emailOpenRate,
          meetingsBooked: leadsData?.meetingsBooked || mockOverviewData.meetingsBooked,
          callsMade: leadsData?.callsMade || mockOverviewData.callsMade,
          responseRate: leadsData?.responseRate || mockOverviewData.responseRate
        }
      };
    }
  } catch (error) {
    logger.warn('Analytics services unavailable, using mock data');
  }

  return {
    success: true,
    source: 'mock',
    data: mockOverviewData
  };
}

/**
 * Get pipeline analytics
 * @returns {Promise<Object>}
 */
async function getPipeline() {
  try {
    const response = await axios.get(`${JOURNEY_INTELLIGENCE_URL}/pipeline`, { timeout: 5000 });
    return {
      success: true,
      source: 'journey_intelligence',
      data: response.data
    };
  } catch (error) {
    logger.warn('Journey Intelligence unavailable, using mock data');
  }

  return {
    success: true,
    source: 'mock',
    data: mockPipelineData
  };
}

/**
 * Get outreach metrics
 * @returns {Promise<Object>}
 */
async function getOutreachMetrics() {
  try {
    const response = await axios.get(`${REZ_SALESMIND_URL}/api/outreach/metrics`, { timeout: 5000 });
    return {
      success: true,
      source: 'rez_salesmind',
      data: response.data
    };
  } catch (error) {
    logger.warn('REZ-SalesMind unavailable, using mock data');
  }

  return {
    success: true,
    source: 'mock',
    data: mockOutreachData
  };
}

/**
 * Get conversion funnel metrics
 * @returns {Promise<Object>}
 */
async function getConversionMetrics() {
  try {
    const response = await axios.get(`${JOURNEY_INTELLIGENCE_URL}/funnel`, { timeout: 5000 });
    return {
      success: true,
      source: 'journey_intelligence',
      data: response.data
    };
  } catch (error) {
    logger.warn('Journey Intelligence unavailable, using mock data');
  }

  return {
    success: true,
    source: 'mock',
    data: mockConversionData
  };
}

/**
 * Get lead source analytics
 * @returns {Promise<Object>}
 */
async function getSourceAnalytics() {
  try {
    const response = await axios.get(`${JOURNEY_INTELLIGENCE_URL}/sources`, { timeout: 5000 });
    return {
      success: true,
      source: 'journey_intelligence',
      data: response.data
    };
  } catch (error) {
    return {
      success: true,
      source: 'mock',
      data: {
        sources: [
          { name: 'Website', leads: 456, conversions: 69, rate: 15.1 },
          { name: 'LinkedIn', leads: 312, conversions: 40, rate: 12.8 },
          { name: 'Referral', leads: 189, conversions: 54, rate: 28.6 },
          { name: 'Cold Outreach', leads: 567, conversions: 24, rate: 4.2 },
          { name: 'Event', leads: 234, conversions: 44, rate: 18.8 },
          { name: 'Webinar', leads: 156, conversions: 21, rate: 13.5 },
          { name: 'Content', leads: 289, conversions: 32, rate: 11.1 }
        ],
        totalLeads: 2203,
        avgConversionRate: 12.3
      }
    };
  }
}

/**
 * Get team performance metrics
 * @returns {Promise<Object>}
 */
async function getTeamPerformance() {
  try {
    const response = await axios.get(`${REZ_CRM_HUB_URL}/api/team/performance`, { timeout: 5000 });
    return {
      success: true,
      source: 'rez_crm_hub',
      data: response.data
    };
  } catch (error) {
    return {
      success: true,
      source: 'mock',
      data: {
        team: [
          {
            name: 'John Smith',
            role: 'Account Executive',
            leads: 234,
            conversions: 18,
            revenue: 456000,
            activities: 567
          },
          {
            name: 'Sarah Johnson',
            role: 'Account Executive',
            leads: 198,
            conversions: 22,
            revenue: 567000,
            activities: 612
          },
          {
            name: 'Mike Chen',
            role: 'SDR',
            leads: 456,
            conversations: 234,
            meetings: 89
          },
          {
            name: 'Emily Davis',
            role: 'SDR',
            leads: 389,
            conversations: 198,
            meetings: 76
          }
        ],
        teamAvgConversionRate: 10.2,
        teamAvgRevenue: 511500
      }
    };
  }
}

/**
 * Get time-based trends
 * @param {string} period - Time period (7d, 30d, 90d, 1y)
 * @returns {Promise<Object>}
 */
async function getTrends(period = '30d') {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

  return {
    success: true,
    source: 'mock',
    data: {
      period,
      days,
      leadsTrend: generateTrendData(days, 30, 50),
      conversionTrend: generateTrendData(days, 10, 15),
      revenueTrend: generateTrendData(days, 50000, 150000),
      activityTrend: generateTrendData(days, 100, 200)
    }
  };
}

/**
 * Generate mock trend data
 * @param {number} days - Number of days
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Array}
 */
function generateTrendData(days, min, max) {
  const data = [];
  let currentDate = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * (max - min) + min)
    });
  }

  return data;
}

/**
 * Generate analytics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>}
 */
async function generateReport(options = {}) {
  const [overview, pipeline, outreach, conversion] = await Promise.all([
    getOverview(),
    getPipeline(),
    getOutreachMetrics(),
    getConversionMetrics()
  ]);

  return {
    success: true,
    reportType: options.type || 'full',
    generatedAt: new Date().toISOString(),
    overview: overview.data,
    pipeline: pipeline.data,
    outreach: outreach.data,
    conversion: conversion.data,
    summary: {
      totalLeads: overview.data.totalLeads,
      conversionRate: overview.data.conversionRate,
      revenue: overview.data.revenue,
      avgDealSize: pipeline.data.avgDealSize
    }
  };
}

export {
  getOverview,
  getPipeline,
  getOutreachMetrics,
  getConversionMetrics,
  getSourceAnalytics,
  getTeamPerformance,
  getTrends,
  generateReport,
  mockOverviewData,
  mockPipelineData,
  mockOutreachData,
  mockConversionData
};
