/**
 * Payment Integration - Connect Finance OS to RABTUL Payment Service (port 4001)
 *
 * This module provides real payment, transaction, and settlement data
 */

const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:4001';

/**
 * Get payment statistics for a period
 */
async function getPaymentStats(businessId, period = '30d') {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/payments/stats?businessId=${businessId}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      return getDefaultPaymentStats();
    }

    return await res.json();
  } catch (error) {
    console.warn('Payment stats fetch failed:', error.message);
    return getDefaultPaymentStats();
  }
}

/**
 * Get payment volume by period
 */
async function getPaymentVolume(businessId, granularity = 'daily') {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/payments/volume?businessId=${businessId}&granularity=${granularity}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Payment volume fetch failed:', error.message);
    return null;
  }
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(businessId, limit = 50) {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/payments?businessId=${businessId}&limit=${limit}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.payments || [];
  } catch (error) {
    console.warn('Recent transactions fetch failed:', error.message);
    return [];
  }
}

/**
 * Get payment method breakdown
 */
async function getPaymentMethods(businessId) {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/payments/methods?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Payment methods fetch failed:', error.message);
    return null;
  }
}

/**
 * Get failed payments for fraud analysis
 */
async function getFailedPayments(businessId, period = '7d') {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/payments/failed?businessId=${businessId}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.payments || [];
  } catch (error) {
    console.warn('Failed payments fetch failed:', error.message);
    return [];
  }
}

/**
 * Get reconciliation status
 */
async function getReconciliationStatus(businessId) {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/reconciliation/status?businessId=${businessId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Reconciliation status fetch failed:', error.message);
    return null;
  }
}

/**
 * Get refunds summary
 */
async function getRefundsSummary(businessId, period = '30d') {
  try {
    const res = await fetch(`${PAYMENT_URL}/api/v1/refunds/summary?businessId=${businessId}&period=${period}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.warn('Refunds summary fetch failed:', error.message);
    return null;
  }
}

/**
 * Get payment dashboard summary
 */
async function getPaymentDashboard(businessId) {
  const [stats, volume, failed, refunds] = await Promise.all([
    getPaymentStats(businessId),
    getPaymentVolume(businessId),
    getFailedPayments(businessId),
    getRefundsSummary(businessId)
  ]);

  return {
    stats,
    volume,
    failedPayments: failed,
    refunds,
    connected: !!stats
  };
}

/**
 * Default payment stats when Treasury is unavailable
 */
function getDefaultPaymentStats() {
  return {
    totalVolume: 0,
    successfulCount: 0,
    failedCount: 0,
    avgTransactionValue: 0,
    successRate: 0,
    totalRefunds: 0,
    refundRate: 0
  };
}

/**
 * Health check for Payment Service connection
 */
async function healthCheck() {
  try {
    const res = await fetch(`${PAYMENT_URL}/health`, {
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
  getPaymentStats,
  getPaymentVolume,
  getRecentTransactions,
  getPaymentMethods,
  getFailedPayments,
  getReconciliationStatus,
  getRefundsSummary,
  getPaymentDashboard,
  healthCheck
};
