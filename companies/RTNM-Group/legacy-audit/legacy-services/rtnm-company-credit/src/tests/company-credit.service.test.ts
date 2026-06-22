import { CompanyCreditService } from '../services/company-credit.service';
import { RiskLevel, PaymentStatus } from '../models/company-credit.model';
import mongoose from 'mongoose';

// Mock the CompanyCredit model
jest.mock('../models/company-credit.model', () => {
  const mockCompanyCredit = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  return {
    CompanyCredit: mockCompanyCredit,
    RiskLevel: {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL',
    },
    PaymentStatus: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      OVERDUE: 'OVERDUE',
    },
  };
});

// Import after mocking
import { CompanyCredit } from '../models/company-credit.model';

describe('CompanyCreditService', () => {
  let service: CompanyCreditService;

  const mockCredit = {
    _id: new mongoose.Types.ObjectId(),
    corpId: 'test-corp',
    companyName: 'Test Corp',
    creditLimit: 100000,
    currentUtilization: 25000,
    availableCredit: 75000,
    paymentHistory: [],
    riskLevel: RiskLevel.LOW,
    creditScore: 800,
    paymentTermsDays: 30,
    currency: 'INR',
    createdAt: new Date(),
    updatedAt: new Date(),
    toJSON: function() { return this; },
  };

  beforeEach(() => {
    service = new CompanyCreditService();
    jest.clearAllMocks();
  });

  describe('getCredit', () => {
    it('should return credit record when found', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(mockCredit);

      const result = await service.getCredit('test-corp');

      expect(result).toEqual(mockCredit);
      expect(CompanyCredit.findOne).toHaveBeenCalledWith({ corpId: 'test-corp' });
    });

    it('should return null when credit record not found', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getCredit('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('canExtendCredit', () => {
    it('should return canExtend=true when credit is available', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(mockCredit);

      const result = await service.canExtendCredit('test-corp', 50000);

      expect(result.canExtend).toBe(true);
      expect(result.availableCredit).toBe(75000);
      expect(result.requestedAmount).toBe(50000);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should return canExtend=false when amount exceeds available credit', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(mockCredit);

      const result = await service.canExtendCredit('test-corp', 100000);

      expect(result.canExtend).toBe(false);
      expect(result.message).toContain('exceeds credit limit');
    });

    it('should return canExtend=false for critical risk level', async () => {
      const criticalCredit = { ...mockCredit, riskLevel: RiskLevel.CRITICAL };
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(criticalCredit);

      const result = await service.canExtendCredit('test-corp', 10000);

      expect(result.canExtend).toBe(false);
      expect(result.message).toContain('critical risk level');
    });

    it('should return canExtend=false when no credit record exists', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.canExtendCredit('non-existent', 10000);

      expect(result.canExtend).toBe(false);
      expect(result.availableCredit).toBe(0);
    });
  });

  describe('updateCredit', () => {
    it('should update existing credit record', async () => {
      const updatedCredit = { ...mockCredit, creditLimit: 150000 };
      (CompanyCredit.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedCredit);

      const result = await service.updateCredit('test-corp', { creditLimit: 150000 });

      expect(result.creditLimit).toBe(150000);
      expect(CompanyCredit.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getPaymentTerms', () => {
    it('should return payment terms when credit record exists', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(mockCredit);

      const result = await service.getPaymentTerms('test-corp');

      expect(result).toEqual({
        corpId: 'test-corp',
        paymentTermsDays: 30,
        creditLimit: 100000,
        availableCredit: 75000,
        currency: 'INR',
        riskLevel: RiskLevel.LOW,
        creditScore: 800,
      });
    });

    it('should return null when credit record not found', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getPaymentTerms('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return LOW for good credit score and no overdue payments', async () => {
      const creditWithGoodHistory = {
        ...mockCredit,
        creditScore: 800,
        paymentHistory: [
          { status: PaymentStatus.COMPLETED },
          { status: PaymentStatus.COMPLETED },
        ],
      };
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(creditWithGoodHistory);

      const result = await service.calculateRiskLevel('test-corp');

      expect(result).toBe(RiskLevel.LOW);
    });

    it('should return CRITICAL for poor credit score and many overdue payments', async () => {
      const creditWithBadHistory = {
        ...mockCredit,
        creditScore: 350,
        paymentHistory: [
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.OVERDUE },
        ],
      };
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(creditWithBadHistory);

      const result = await service.calculateRiskLevel('test-corp');

      expect(result).toBe(RiskLevel.CRITICAL);
    });

    it('should return HIGH when no credit record found', async () => {
      (CompanyCredit.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.calculateRiskLevel('non-existent');

      expect(result).toBe(RiskLevel.HIGH);
    });
  });
});