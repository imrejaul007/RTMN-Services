/**
 * Revenue Intelligence Integration - Connect Finance OS to Revenue Intelligence OS (port 5400)
 *
 * This module provides AI-powered demand forecasting, pricing intelligence, and cohort analysis
 */

const REVENUE_URL = process.env.REVENUE_URL || 'http://localhost:5400';

/**
 * Get demand forecast for an industry
 */
async function getDemandForecast(industry, period = '90d') {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/demand-forecast?industry=${industry}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      return getDefaultDemandForecast();
    }

    return await res.json();
  } catch (error) {
    console.warn('Demand forecast fetch failed:', error.message);
    return getDefaultDemandForecast();
  }
}

/**
 * Get revenue metrics (MRR, ARR, churn, etc.)
 */
async function getRevenueMetrics(businessId) {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/revops-metrics?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      return getDefaultRevenueMetrics();
    }

    return await res.json();
  } catch (error) {
    console.warn('Revenue metrics fetch failed:', error.message);
    return getDefaultRevenueMetrics();
  }
}

/**
 * Get cohort analysis
 */
async function getCohortAnalysis(businessId) {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/cohorts?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Cohort analysis fetch failed:', error.message);
    return null;
  }
}

/**
 * Get pricing intelligence
 */
async function getPricingIntelligence(businessId, productId) {
  try {
    const res = await fetch(
      `${REVENUE_URL}/api/revenue/pricing-recommendations?businessId=${businessId}&productId=${productId}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Pricing intelligence fetch failed:', error.message);
    return null;
  }
}

/**
 * Get revenue hub summary
 */
async function getRevenueHub(businessId) {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/hub?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Revenue hub fetch failed:', error.message);
    return null;
  }
}

/**
 * Get revenue forecast with AI insights
 */
async function getRevenueForecast(businessId, period = '12m') {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/forecast?businessId=${businessId}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Revenue forecast fetch failed:', error.message);
    return null;
  }
}

/**
 * Get RevOps automation status
 */
async function getRevOpsStatus(businessId) {
  try {
    const res = await fetch(`${REVENUE_URL}/api/revenue/revops/status?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('RevOps status fetch failed:', error.message);
    return null;
  }
}

/**
 * Get full revenue dashboard
 */
async function getRevenueDashboard(businessId, industry) {
  const [metrics, forecast, cohort, pricing] = await Promise.all([
    getRevenueMetrics(businessId),
    getRevenueForecast(businessId),
    getCohortAnalysis(businessId),
    getPricingIntelligence(businessId)
  ]);

  return {
    metrics,
    forecast,
    cohort,
    pricing,
    connected: !!metrics
  };
}

/**
 * Default demand forecast when Revenue Intelligence is unavailable
 */
function getDefaultDemandForecast() {
  return {
    period: '90d',
    demand: [],
    avgGrowthRate: 0,
    confidence: 0,
    drivers: []
  };
}

/**
 * Default revenue metrics when Revenue Intelligence is unavailable
 */
function getDefaultRevenueMetrics() {
  return {
    mrr: 0,
    arr: 0,
    growthRate: 0,
    churnRate: 0,
    nrr: 0,
    ltv: 0,
    cac: 0,
    paybackPeriod: 0
  };
}

/**
 * Health check for Revenue Intelligence connection
 */
async function healthCheck() {
  try {
    const res = await fetch(`${REVENUE_URL}/health`, {
      timeout: 3000
    });

    if (!res.ok) return { healthy: false, status: res.status };

    const data = await res.json();
    return { healthy: true, data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

module.exports = {
  getDemandForecast,
  getRevenueMetrics,
  getCohortAnalysis,
  getPricingIntelligence,
  getRevenueHub,
  getRevenueForecast,
  getRevOpsStatus,
  getRevenueDashboard,
  healthCheck
};
