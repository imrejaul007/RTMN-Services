import { Router, Request, Response, NextFunction } from 'express';
import { loanService } from '../services/loanService';
import { LoanType, LoanStatus } from '../models/Loan';

const router = Router();

/**
 * Create a new loan application
 * POST /api/loans/apply
 */
router.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId, amount, type, purpose } = req.body;

    // Validation
    if (!merchantId) {
      res.status(400).json({ success: false, error: 'merchantId is required' });
      return;
    }
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount is required' });
      return;
    }

    const validTypes: LoanType[] = ['revenue_advance', 'term_loan', 'credit_line'];
    const loanType = validTypes.includes(type) ? type : 'revenue_advance';

    const loan = await loanService.createLoanApplication(merchantId, amount, loanType, purpose);

    res.status(201).json({
      success: true,
      data: {
        loanId: loan._id,
        merchantId: loan.merchantId,
        type: loan.type,
        amount: loan.amount,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        status: loan.status,
        repaymentSchedule: loan.repaymentSchedule.map((entry) => ({
          dueDate: entry.dueDate,
          amount: entry.amount,
        })),
        nextRepayment: loan.nextRepayment,
        createdAt: loan.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message.includes('exceeds available credit') ||
        error.message.includes('flagged for manual review') ||
        error.message.includes('not found')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * Get loan by ID
 * GET /api/loans/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const loan = await loanService.getLoanById(id);

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        loanId: loan._id,
        merchantId: loan.merchantId,
        type: loan.type,
        amount: loan.amount,
        disbursedAmount: loan.disbursedAmount,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        status: loan.status,
        repaymentSchedule: loan.repaymentSchedule,
        nextRepayment: loan.nextRepayment,
        partnerRef: loan.partnerRef,
        partnerId: loan.partnerId,
        createdAt: loan.createdAt,
        disbursedAt: loan.disbursedAt,
        completedAt: loan.completedAt,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Approve a loan
 * POST /api/loans/:id/approve
 */
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const loan = await loanService.approveLoan(id, approvedBy || 'system');

    res.json({
      success: true,
      data: {
        loanId: loan._id,
        status: loan.status,
        approvedBy: loan.approvedBy,
        approvedAt: loan.approvedAt,
        message: 'Loan approved successfully',
      },
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Cannot approve')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * Disburse a loan
 * POST /api/loans/:id/disburse
 */
router.post('/:id/disburse', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { partnerId } = req.body;

    const loan = await loanService.disburseLoan(id, partnerId || 'capital_float');

    res.json({
      success: true,
      data: {
        loanId: loan._id,
        status: loan.status,
        disbursedAmount: loan.disbursedAmount,
        disbursedAt: loan.disbursedAt,
        partnerRef: loan.partnerRef,
        partnerId: loan.partnerId,
        message: 'Loan disbursed successfully',
      },
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Cannot disburse')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * Get all loans for a merchant
 * GET /api/loans/merchant/:merchantId
 */
router.get('/merchant/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;
    const { status } = req.query;

    const validStatuses: LoanStatus[] = ['pending', 'approved', 'disbursed', 'repaid', 'defaulted'];
    const statusFilter = validStatuses.includes(status as LoanStatus) ? status as LoanStatus : undefined;

    const loans = await loanService.getMerchantLoans(merchantId, statusFilter);

    res.json({
      success: true,
      data: {
        merchantId,
        loans: loans.map((loan) => ({
          loanId: loan._id,
          type: loan.type,
          amount: loan.amount,
          disbursedAmount: loan.disbursedAmount,
          interestRate: loan.interestRate,
          tenure: loan.tenure,
          status: loan.status,
          nextRepayment: loan.nextRepayment,
          createdAt: loan.createdAt,
          disbursedAt: loan.disbursedAt,
          completedAt: loan.completedAt,
        })),
        totalLoans: loans.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Calculate EMI for a loan
 * POST /api/loans/calculate-emi
 */
router.post('/calculate-emi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { principal, rate, tenure } = req.body;

    if (!principal || !rate || !tenure) {
      res.status(400).json({
        success: false,
        error: 'principal, rate, and tenure are required',
      });
      return;
    }

    const emi = loanService.calculateEMI(principal, rate, tenure);
    const totalAmount = emi * Math.ceil(tenure / 30);
    const totalInterest = totalAmount - principal;

    res.json({
      success: true,
      data: {
        principal,
        annualRate: rate,
        tenureDays: tenure,
        emi,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
