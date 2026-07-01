/**
 * Treasury Integration - Connect Finance OS to RABTUL Treasury (port 4055)
 *
 * This module provides real cash, liquidity, and banking data from RABTUL Treasury
 */

const TREASURY_URL = process.env.TREASURY_URL || 'http://localhost:4055';
const TREASURY_TOKEN = process.env.TREASURY_INTERNAL_TOKEN || 'dev-token';

/**
 * Get current cash position for a business
 */
async function getCashPosition(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/accounts/${businessId}/position`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn(`Treasury API returned ${res.status} for position`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.warn('Treasury connection failed:', error.message);
    return null;
  }
}

/**
 * Get cash flow data for a period
 */
async function getCashFlow(businessId, period = 'monthly') {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/cash-flow/${businessId}`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Treasury cashflow fetch failed:', error.message);
    return null;
  }
}

/**
 * Get cash forecast
 */
async function getCashForecast(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/forecast/${businessId}/current`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Treasury forecast fetch failed:', error.message);
    return null;
  }
}

/**
 * Get shortfall alerts
 */
async function getShortfallAlerts(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/forecast/${businessId}/shortfall`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Treasury shortfall fetch failed:', error.message);
    return null;
  }
}

/**
 * Get all treasury accounts
 */
async function getAccounts(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/accounts/${businessId}`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.accounts || [];
  } catch (error) {
    console.warn('Treasury accounts fetch failed:', error.message);
    return [];
  }
}

/**
 * Get treasury dashboard summary
 */
async function getTreasuryDashboard(businessId) {
  const [position, cashFlow, forecast, accounts] = await Promise.all([
    getCashPosition(businessId),
    getCashFlow(businessId),
    getCashForecast(businessId),
    getAccounts(businessId)
  ]);

  return {
    position,
    cashFlow,
    forecast,
    accounts,
    connected: !!position
  };
}

/**
 * Get investment portfolio
 */
async function getInvestments(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/investments/${businessId}`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Treasury investments fetch failed:', error.message);
    return null;
  }
}

/**
 * Get FX positions
 */
async function getFXPositions(businessId) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/fx/positions/${businessId}`, {
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Treasury FX fetch failed:', error.message);
    return null;
  }
}

/**
 * Import bank statement
 */
async function importBankStatement(businessId, bankName, csvData) {
  try {
    const res = await fetch(`${TREASURY_URL}/api/v1/bank-statements/import`, {
      method: 'POST',
      headers: {
        'X-Internal-Token': TREASURY_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        businessId,
        bankName,
        csvData
      })
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Bank statement import failed:', error.message);
    return null;
  }
}

/**
 * Health check for Treasury connection
 */
async function healthCheck() {
  try {
    const res = await fetch(`${TREASURY_URL}/health`, {
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
  getCashPosition,
  getCashFlow,
  getCashForecast,
  getShortfallAlerts,
  getAccounts,
  getTreasuryDashboard,
  getInvestments,
  getFXPositions,
  importBankStatement,
  healthCheck
};
