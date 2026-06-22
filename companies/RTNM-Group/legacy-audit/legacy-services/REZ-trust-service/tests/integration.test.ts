/**
 * RTNM-Group - Integration Tests
 * Tests Trust, BNPL, Capital services
 */

import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Service URLs
const TRUST_API = process.env.TRUST_API || 'https://rez-trust.onrender.com';
const BNPL_API = process.env.BNPL_API || 'https://rez-bnpl.onrender.com';
const CAPITAL_API = process.env.CAPITAL_API || 'https://rez-capital.onrender.com';

describe('RTNM-Group Integration Tests', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ========== REZ-TRUST-SERVICE ==========
  describe('REZ-trust-service', () => {
    test('GET /api/trust/:userId - Get trust score', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          user_id: 'user123',
          trust_score: 85,
          tier: 'trusted',
          factors: { payment_reliability: 90, delivery_reliability: 85 }
        }
      });
      const res = await axios.get(`${TRUST_API}/api/trust/user123`);
      expect(res.data.trust_score).toBe(85);
    });

    test('POST /api/trust/:userId/calculate - Calculate trust score', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { trust_score: 88 } });
      const res = await axios.post(`${TRUST_API}/api/trust/user123/calculate`, {
        factors: { on_time_delivery: 10, disputes: 0 }
      });
      expect(res.data.trust_score).toBeDefined();
    });

    test('GET /api/trust/:userId/history - Trust history', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { history: [{ date: '2026-05-01', score: 80 }, { date: '2026-05-10', score: 85 }] }
      });
      const res = await axios.get(`${TRUST_API}/api/trust/user123/history`);
      expect(res.data.history.length).toBe(2);
    });

    test('POST /api/trust/:userId/report - Report user', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { report_id: 'rpt123' } });
      const res = await axios.post(`${TRUST_API}/api/trust/user123/report`, {
        reported_by: 'user456',
        reason: 'fake_item',
        evidence: 'screenshot_url'
      });
      expect(res.data.report_id).toBe('rpt123');
    });

    test('GET /api/trust/merchant/:merchantId - Merchant trust', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          merchant_id: 'merchant123',
          trust_score: 92,
          total_reviews: 150,
          rating: 4.5
        }
      });
      const res = await axios.get(`${TRUST_API}/api/trust/merchant/merchant123`);
      expect(res.data.trust_score).toBe(92);
    });
  });

  // ========== REZ-BNPL-SERVICE ==========
  describe('REZ-bnpl-service', () => {
    test('POST /api/orders/initialize - Initialize BNPL order', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { order_id: 'bnpl123', amount: 2000, installments: 3 }
      });
      const res = await axios.post(`${BNPL_API}/api/orders/initialize`, {
        user_id: 'user123',
        merchant_id: 'merchant456',
        amount: 2000,
        installments: 3
      });
      expect(res.data.order_id).toBe('bnpl123');
    });

    test('GET /api/orders/:id - Get BNPL order', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          order_id: 'bnpl123',
          status: 'active',
          remaining_amount: 1334,
          next_due: '2026-06-01'
        }
      });
      const res = await axios.get(`${BNPL_API}/api/orders/bnpl123`);
      expect(res.data.status).toBe('active');
    });

    test('POST /api/orders/:id/repay - Repay installment', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
      const res = await axios.post(`${BNPL_API}/api/orders/bnpl123/repay`, {
        amount: 667
      });
      expect(res.data.success).toBe(true);
    });

    test('GET /api/orders/:userId - User BNPL orders', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { orders: [{ order_id: 'bnpl1' }, { order_id: 'bnpl2' }] }
      });
      const res = await axios.get(`${BNPL_API}/api/orders/user123`);
      expect(res.data.orders.length).toBe(2);
    });

    test('GET /api/limits/:userId - Get credit limit', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { limit: 10000, used: 2000, available: 8000 }
      });
      const res = await axios.get(`${BNPL_API}/api/limits/user123`);
      expect(res.data.available).toBe(8000);
    });
  });

  // ========== REZ-CAPITAL-SERVICE ==========
  describe('REZ-capital-service', () => {
    test('POST /api/applications - Apply for capital', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { application_id: 'app123', status: 'pending' } });
      const res = await axios.post(`${CAPITAL_API}/api/applications`, {
        merchant_id: 'merchant123',
        amount: 500000,
        purpose: 'inventory'
      });
      expect(res.data.application_id).toBe('app123');
    });

    test('GET /api/applications/:id - Get application', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { application_id: 'app123', status: 'under_review' }
      });
      const res = await axios.get(`${CAPITAL_API}/api/applications/app123`);
      expect(res.data.status).toBe('under_review');
    });

    test('POST /api/applications/:id/approve - Approve application', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { loan_id: 'loan123' } });
      const res = await axios.post(`${CAPITAL_API}/api/applications/app123/approve`, {
        amount: 500000,
        interest_rate: 12
      });
      expect(res.data.loan_id).toBe('loan123');
    });

    test('GET /api/loans/:merchantId - Merchant loans', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { loans: [{ loan_id: 'loan1', amount: 500000 }] }
      });
      const res = await axios.get(`${CAPITAL_API}/api/loans/merchant123`);
      expect(res.data.loans.length).toBe(1);
    });

    test('POST /api/repayments - Make repayment', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
      const res = await axios.post(`${CAPITAL_API}/api/repayments`, {
        loan_id: 'loan123',
        amount: 50000
      });
      expect(res.data.success).toBe(true);
    });
  });
});
