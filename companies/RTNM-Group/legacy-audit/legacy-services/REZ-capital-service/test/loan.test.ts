import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mongoose
vi.mock('mongoose', () => {
  const actualMongoose = vi.fn();
  return {
    ...actualMongoose,
    default: {
      ...actualMongoose,
      startSession: vi.fn().mockResolvedValue({
        startTransaction: vi.fn(),
        commitTransaction: vi.fn(),
        abortTransaction: vi.fn(),
        endSession: vi.fn(),
      }),
    },
  };
});

// Mock models
vi.mock('../src/models/Loan', () => ({
  Loan: {
    findById: vi.fn(),
    find: vi.fn(),
  },
  ILoan: {},
  LoanType: {
    REVENUE_ADVANCE: 'revenue_advance',
    TERM_LOAN: 'term_loan',
    CREDIT_LINE: 'credit_line',
  },
  LoanStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    DISBURSED: 'disbursed',
    REPAID: 'repaid',
    DEFAULTED: 'defaulted',
  },
}));

vi.mock('../src/models/MerchantHealth', () => ({
  MerchantHealth: {
    findOne: vi.fn(),
  },
}));

describe('LoanService', () => {
  let loanService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/services/loanService');
    loanService = module.loanService;
  });

  describe('calculateEMI', () => {
    it('should calculate EMI correctly', () => {
      // EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]
      // P = 100000, R = 15%/12 = 0.0125, N = 6
      const emi = loanService.calculateEMI(100000, 15, 180);

      expect(emi).toBeGreaterThan(0);
      expect(typeof emi).toBe('number');
    });

    it('should return 0 for invalid inputs', () => {
      expect(loanService.calculateEMI(0, 15, 180)).toBe(0);
      expect(loanService.calculateEMI(100000, 0, 180)).toBe(0);
      expect(loanService.calculateEMI(100000, 15, 0)).toBe(0);
      expect(loanService.calculateEMI(-100, 15, 180)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const emi = loanService.calculateEMI(50000, 12, 90);
      const decimals = (emi.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('generateRepaymentSchedule', () => {
    it('should generate correct number of installments', () => {
      const schedule = loanService.generateRepaymentSchedule(100000, 15, 90);

      expect(schedule.length).toBe(3); // 90 days / 30 = 3 months
    });

    it('should have all required fields in each installment', () => {
      const schedule = loanService.generateRepaymentSchedule(50000, 12, 60);

      for (const entry of schedule) {
        expect(entry).toHaveProperty('dueDate');
        expect(entry).toHaveProperty('amount');
        expect(entry).toHaveProperty('principal');
        expect(entry).toHaveProperty('interest');
        expect(entry).toHaveProperty('status');
        expect(entry.status).toBe('pending');
      }
    });

    it('should have increasing due dates', () => {
      const schedule = loanService.generateRepaymentSchedule(30000, 10, 60);

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].dueDate.getTime()).toBeGreaterThan(
          schedule[i - 1].dueDate.getTime()
        );
      }
    });
  });

  describe('getMerchantLoans type safety', () => {
    it('should accept valid query parameters', async () => {
      const { Loan } = await import('../src/models/Loan');
      Loan.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      });

      await loanService.getMerchantLoans('merchant-123');
      expect(Loan.find).toHaveBeenCalledWith({ merchantId: 'merchant-123' });

      await loanService.getMerchantLoans('merchant-123', 'approved');
      expect(Loan.find).toHaveBeenCalledWith({
        merchantId: 'merchant-123',
        status: 'approved',
      });
    });
  });
});

describe('PartnerService Webhook Verification', () => {
  let partnerService: any;
  let crypto: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock crypto module
    crypto = {
      createHmac: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('expected-signature'),
      }),
      timingSafeEqual: vi.fn().mockReturnValue(true),
    };
    vi.stubGlobal('crypto', crypto);

    const module = await import('../src/services/partnerService');
    partnerService = module.partnerService;
  });

  it('should use HMAC-SHA256 for signature verification', async () => {
    const secret = 'test-secret';
    const payload = '{"test":"data"}';
    const signature = 'expected-signature';

    // Create mock config
    partnerService.verifyWebhookSignature = async function(
      partnerId: string,
      payload: string,
      signature: string
    ): Promise<boolean> {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      return signature === expectedSignature;
    }.bind(partnerService);

    const result = await partnerService.verifyWebhookSignature('test', payload, signature);

    expect(crypto.createHmac).toHaveBeenCalledWith('sha256', secret);
    expect(result).toBe(true);
  });
});
