import { Router, Request, Response, NextFunction } from 'express';
import { loanService } from '../services/loanService';
import { partnerService } from '../services/partnerService';

const router = Router();

/**
 * Process a repayment
 * POST /api/repayments/process
 */
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loanId, amount } = req.body;

    if (!loanId) {
      res.status(400).json({ success: false, error: 'loanId is required' });
      return;
    }
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount is required' });
      return;
    }

    await loanService.processRepayment(loanId, amount);

    // Get updated loan status
    const loan = await loanService.getLoanById(loanId);

    res.json({
      success: true,
      data: {
        loanId,
        paymentAmount: amount,
        newStatus: loan?.status,
        nextRepayment: loan?.nextRepayment,
        message: 'Repayment processed successfully',
      },
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Cannot process')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

/**
 * Get repayment history for a loan
 * GET /api/repayments/:loanId/history
 */
router.get('/:loanId/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loanId } = req.params;

    const loan = await loanService.getLoanById(loanId);

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found' });
      return;
    }

    const paidEntries = loan.repaymentSchedule.filter(
      (entry) => entry.status === 'paid'
    );
    const pendingEntries = loan.repaymentSchedule.filter(
      (entry) => entry.status === 'pending'
    );
    const overdueEntries = loan.repaymentSchedule.filter(
      (entry) => entry.status === 'overdue'
    );

    res.json({
      success: true,
      data: {
        loanId,
        loanStatus: loan.status,
        summary: {
          totalAmount: loan.amount,
          totalPaid: paidEntries.reduce((sum, e) => sum + (e.paidAmount || 0), 0),
          totalPending: pendingEntries.reduce((sum, e) => sum + e.amount, 0),
          totalOverdue: overdueEntries.reduce((sum, e) => sum + e.amount, 0),
        },
        repayments: {
          paid: paidEntries.map((entry) => ({
            dueDate: entry.dueDate,
            amount: entry.amount,
            paidAmount: entry.paidAmount,
            paidDate: entry.paidDate,
            principal: entry.principal,
            interest: entry.interest,
          })),
          pending: pendingEntries.map((entry) => ({
            dueDate: entry.dueDate,
            amount: entry.amount,
            principal: entry.principal,
            interest: entry.interest,
          })),
          overdue: overdueEntries.map((entry) => ({
            dueDate: entry.dueDate,
            amount: entry.amount,
            daysOverdue: Math.floor(
              (Date.now() - entry.dueDate.getTime()) / (24 * 60 * 60 * 1000)
            ),
          })),
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Check disbursement status with partner
 * GET /api/repayments/:loanId/partner-status
 */
router.get('/:loanId/partner-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loanId } = req.params;

    const loan = await loanService.getLoanById(loanId);

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan not found' });
      return;
    }

    if (!loan.partnerRef || !loan.partnerId) {
      res.status(400).json({
        success: false,
        error: 'No partner reference found for this loan',
      });
      return;
    }

    const status = await partnerService.checkDisbursementStatus(
      loan.partnerId,
      loan.partnerRef
    );

    res.json({
      success: true,
      data: {
        loanId,
        partnerId: loan.partnerId,
        partnerRef: loan.partnerRef,
        status: status.status,
        amount: status.amount,
        timestamp: status.timestamp,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get overdue loans summary
 * GET /api/repayments/overdue
 */
router.get('/overdue/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { Loan } = await import('../models/Loan');

    const now = new Date();
    const overdueLoans = await Loan.find({
      status: 'disbursed',
      repaymentSchedule: {
        $elemMatch: {
          status: 'overdue',
          dueDate: { $lt: now },
        },
      },
    });

    const totalOverdueAmount = overdueLoans
      .flatMap((loan) => loan.repaymentSchedule)
      .filter((entry) => entry.status === 'overdue')
      .reduce((sum, entry) => sum + entry.amount, 0);

    res.json({
      success: true,
      data: {
        totalOverdueLoans: overdueLoans.length,
        totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
        overdueByMerchant: overdueLoans.reduce((acc, loan) => {
          const merchantOverdue = loan.repaymentSchedule
            .filter((entry) => entry.status === 'overdue')
            .reduce((sum, entry) => sum + entry.amount, 0);
          acc[loan.merchantId] = merchantOverdue;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
