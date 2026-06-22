import { intercompanyLedgerService, CreateEntryInput } from '../services/intercompany-ledger.service';
import { LedgerEntry, CompanyBalance } from '../models/intercompany-ledger.model';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      readyState: 1,
      on: jest.fn(),
    },
  };
});

// Mock logger
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('IntercompanyLedgerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a valid ledger entry', async () => {
      const input: CreateEntryInput = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        type: 'SERVICE_FEE',
        amount: 10000,
        currency: 'INR',
        description: 'Test service fee',
      };

      // Mock save method
      const mockSave = jest.fn().mockResolvedValue({
        entryId: 'LED-12345678',
        ...input,
        status: 'PENDING',
        save: mockSave,
      });

      jest.spyOn(LedgerEntry.prototype, 'save').mockImplementation(mockSave);
      jest.spyOn(CompanyBalance, 'findOneAndUpdate').mockResolvedValue({});
      jest.spyOn(CompanyBalance, 'findOne').mockResolvedValue({
        revenue: 0,
        cost: 0,
        net: 0,
        pendingRevenue: 0,
        pendingCost: 0,
      });

      const entry = await intercompanyLedgerService.createEntry(input);

      expect(entry).toBeDefined();
      expect(entry.fromCorpId).toBe(input.fromCorpId);
      expect(entry.toCorpId).toBe(input.toCorpId);
      expect(entry.type).toBe(input.type);
      expect(entry.amount).toBe(input.amount);
      expect(entry.status).toBe('PENDING');
    });

    it('should throw error for invalid fromCorpId', async () => {
      const input = {
        fromCorpId: 'INVALID-COMPANY',
        toCorpId: 'RABTUL-Technologies',
        type: 'SERVICE_FEE',
        amount: 10000,
        description: 'Test',
      };

      await expect(intercompanyLedgerService.createEntry(input)).rejects.toThrow(
        'Invalid fromCorpId: INVALID-COMPANY'
      );
    });

    it('should throw error for invalid transaction type', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        type: 'INVALID_TYPE' as any,
        amount: 10000,
        description: 'Test',
      };

      await expect(intercompanyLedgerService.createEntry(input)).rejects.toThrow(
        'Invalid transaction type: INVALID_TYPE'
      );
    });

    it('should throw error for zero amount', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        type: 'SERVICE_FEE',
        amount: 0,
        description: 'Test',
      };

      await expect(intercompanyLedgerService.createEntry(input)).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should throw error for same company transaction', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'HOJAI-AI',
        type: 'SERVICE_FEE',
        amount: 10000,
        description: 'Test',
      };

      await expect(intercompanyLedgerService.createEntry(input)).rejects.toThrow(
        'Cannot create entry between same company'
      );
    });
  });

  describe('getBalance', () => {
    it('should return balance for existing company', async () => {
      jest.spyOn(CompanyBalance, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            corpId: 'HOJAI-AI',
            revenue: 50000,
            cost: 20000,
            net: 30000,
            pendingRevenue: 5000,
            pendingCost: 1000,
            updatedAt: new Date(),
          }),
        }),
      } as any);

      const balance = await intercompanyLedgerService.getBalance('HOJAI-AI');

      expect(balance).toBeDefined();
      expect(balance.corpId).toBe('HOJAI-AI');
      expect(balance.revenue).toBe(50000);
      expect(balance.cost).toBe(20000);
      expect(balance.net).toBe(30000);
    });

    it('should create new balance for new company', async () => {
      jest.spyOn(CompanyBalance, 'findOne').mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      jest.spyOn(CompanyBalance, 'create').mockResolvedValue({
        corpId: 'NEW-COMPANY',
        revenue: 0,
        cost: 0,
        net: 0,
        pendingRevenue: 0,
        pendingCost: 0,
      } as any);

      const balance = await intercompanyLedgerService.getBalance('NEW-COMPANY');

      expect(balance).toBeDefined();
      expect(balance.corpId).toBe('NEW-COMPANY');
      expect(balance.revenue).toBe(0);
    });
  });

  describe('getEntries', () => {
    it('should return entries for a company', async () => {
      const mockEntries = [
        {
          entryId: 'LED-12345678',
          fromCorpId: 'HOJAI-AI',
          toCorpId: 'RABTUL-Technologies',
          type: 'SERVICE_FEE',
          amount: 10000,
          status: 'PENDING',
          createdAt: new Date(),
        },
        {
          entryId: 'LED-87654321',
          fromCorpId: 'REZ-Intelligence',
          toCorpId: 'HOJAI-AI',
          type: 'API_USAGE',
          amount: 5000,
          status: 'COMPLETED',
          createdAt: new Date(),
        },
      ];

      jest.spyOn(LedgerEntry, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockEntries),
          }),
        }),
      } as any);

      const entries = await intercompanyLedgerService.getEntries('HOJAI-AI');

      expect(entries).toBeDefined();
      expect(entries).toHaveLength(2);
    });
  });

  describe('getNetworkStats', () => {
    it('should return network statistics', async () => {
      jest.spyOn(LedgerEntry, 'aggregate').mockResolvedValue([
        {
          totalEntries: 100,
          totalVolume: 1000000,
          pendingVolume: 100000,
          settledVolume: 900000,
        },
      ] as any);

      jest.spyOn(CompanyBalance, 'countDocuments').mockResolvedValue(22);

      jest.spyOn(CompanyBalance, 'find')
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                  { corpId: 'HOJAI-AI', revenue: 500000 },
                ]),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                  { corpId: 'RABTUL-Technologies', cost: 300000 },
                ]),
              }),
            }),
          }),
        } as any);

      const stats = await intercompanyLedgerService.getNetworkStats();

      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBe(100);
      expect(stats.totalVolume).toBe(1000000);
      expect(stats.activeCompanies).toBe(22);
    });
  });
});
