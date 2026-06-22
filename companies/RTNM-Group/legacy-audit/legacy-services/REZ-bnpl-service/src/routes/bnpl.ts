import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { BNPLApplication, BNPLTenure } from '../models/BNPL';
import Redis from 'ioredis';
import logger from '../utils/logger';

const router = Router();

// Idempotency helper for BNPL payments
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Execute with idempotency protection
 * Prevents duplicate payment processing
 */
async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<{ result: T; cached: boolean }> {
  const cacheKey = `bnpl:idempotency:${key}`;

  // Check if key exists
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.info('Idempotency key hit for BNPL repay', { key });
    return { result: JSON.parse(cached), cached: true };
  }

  // Execute function
  const result = await fn();

  // Store result
  await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));

  return { result, cached: false };
}

// Interest rates by tenure
const INTEREST_RATES = {
  3: 12,   // 12% APR for 3 months
  6: 15,   // 15% APR for 6 months
  9: 18,   // 18% APR for 9 months
  12: 21   // 21% APR for 12 months
};

// Risk-based adjustments
const RISK_ADJUSTMENTS = {
  low: -2,     // 2% lower
  medium: 0,   // standard
  high: 4     // 4% higher
};

// Validation schemas
const applySchema = z.object({
  userId: z.string().min(1),
  merchantId: z.string().optional(),
  orderId: z.string().min(1),
  amount: z.number().min(500).max(500000),
  tenure: z.enum(['3', '6', '9', '12']).transform(Number),
  downPayment: z.number().min(0).optional()
});

const repaymentSchema = z.object({
  applicationId: z.string().min(1),
  emiNumber: z.number().min(1)
});

const checkStatusSchema = z.object({
  applicationId: z.string().min(1)
});

// Calculate EMI
function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  const monthlyRate = annualRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.ceil(emi);
}

// Calculate credit score (simplified)
async function calculateCreditScore(userId: string): Promise<{ score: number; rating: 'low' | 'medium' | 'high' }> {
  // In production, this would check:
  // - Payment history
  // - Current BNPL usage
  // - Order frequency
  // - Wallet balance
  // - KYC verification level

  // Mock calculation for now
  const score = Math.floor(Math.random() * 200) + 600; // 600-800

  let rating: 'low' | 'medium' | 'high' = 'medium';
  if (score >= 750) rating = 'low';
  else if (score < 650) rating = 'high';

  return { score, rating };
}

// Apply for BNPL
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const data = applySchema.parse(req.body);
    const tenure = data.tenure as BNPLTenure;

    // Check existing BNPLs
    const existingBNPLs = await BNPLApplication.countDocuments({
      userId: data.userId,
      status: { $in: ['active', 'overdue'] }
    });

    if (existingBNPLs >= 3) {
      return res.status(400).json({
        error: 'Maximum active BNPL limit reached (3)'
      });
    }

    // Calculate credit score and risk
    const { score, rating } = await calculateCreditScore(data.userId);

    // Calculate interest rate
    const baseRate = INTEREST_RATES[tenure];
    const riskAdjustment = RISK_ADJUSTMENTS[rating];
    const finalRate = baseRate + riskAdjustment;

    // Calculate amounts
    const principal = data.amount - (data.downPayment || 0);
    const emiAmount = calculateEMI(principal, finalRate, tenure);
    const totalAmount = emiAmount * tenure;
    const totalInterest = totalAmount - principal;
    const processingFee = Math.ceil(principal * 0.01); // 1% processing fee

    // First EMI date is 30 days from now
    const firstEmiDate = new Date();
    firstEmiDate.setDate(firstEmiDate.getDate() + 30);

    // Generate EMI schedule
    const emiSchedule = [];
    let remainingPrincipal = principal;
    let remainingInterest = totalInterest;

    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(firstEmiDate);
      dueDate.setMonth(dueDate.getMonth() + i - 1);

      // Simple interest calculation per EMI
      const interestPortion = Math.ceil((remainingInterest / tenure));
      const principalPortion = emiAmount - interestPortion;
      remainingPrincipal -= principalPortion;
      remainingInterest -= interestPortion;

      emiSchedule.push({
        emiNumber: i,
        dueDate,
        principal: principalPortion,
        interest: interestPortion,
        amount: emiAmount,
        status: 'pending'
      });
    }

    // Auto-approve for low risk, credit score > 700
    const status = score >= 700 ? 'approved' : 'pending';

    const application = new BNPLApplication({
      ...data,
      tenure,
      downPayment: data.downPayment || 0,
      interestRate: finalRate,
      processingFee,
      emiAmount,
      totalAmount,
      totalInterest,
      creditScore: score,
      riskRating: rating,
      status,
      approvedAt: status === 'approved' ? new Date() : undefined,
      firstEmiDate,
      nextEmiDate: firstEmiDate,
      emiSchedule
    });

    await application.save();

    res.status(201).json({
      applicationId: application._id,
      status,
      creditScore: score,
      riskRating: rating,
      interestRate: finalRate,
      processingFee,
      emiAmount,
      totalAmount,
      totalInterest,
      tenure,
      emiSchedule: tenure <= 3 ? application.emiSchedule : undefined,
      message: status === 'approved'
        ? 'BNPL approved instantly!'
        : 'Application submitted for review'
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get application status
router.get('/status/:applicationId', async (req: Request, res: Response) => {
  try {
    const application = await BNPLApplication.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      applicationId: application._id,
      status: application.status,
      amount: application.amount,
      emiAmount: application.emiAmount,
      tenure: application.tenure,
      nextEmiDate: application.nextEmiDate,
      overdueAmount: application.overdueAmount,
      paidEMIs: application.payments.length,
      remainingEMIs: application.tenure - application.payments.length
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Make repayment
router.post('/repay', async (req: Request, res: Response) => {
  try {
    const data = repaymentSchema.parse(req.body);

    // Extract idempotency key from header or body
    const idempotencyKey = req.headers['x-idempotency-key'] as string ||
      req.body.idempotencyKey ||
      `repay:${data.applicationId}:${data.emiNumber}`;

    // Execute with idempotency protection
    const { result, cached } = await withIdempotency(idempotencyKey, async () => {
      const application = await BNPLApplication.findById(data.applicationId);

      if (!application) {
        throw { status: 404, message: 'Application not found' };
      }

      if (application.status !== 'active') {
        throw { status: 400, message: `Cannot repay. Status: ${application.status}` };
      }

      const emi = application.emiSchedule.find(e => e.emiNumber === data.emiNumber);

      if (!emi || emi.status === 'paid') {
        throw { status: 400, message: 'Invalid EMI number or already paid' };
      }

      // Process payment via wallet/payment service
      // In production, call payment service here

      const transactionId = `TXN_BNPL_${Date.now()}`;

      // Update EMI
      emi.status = 'paid';
      emi.paidAt = new Date();
      emi.transactionId = transactionId;

      // Add payment record
      application.payments.push({
        emiNumber: data.emiNumber,
        amount: emi.amount,
        principal: emi.principal,
        interest: emi.interest,
        paidAt: new Date(),
        transactionId,
        paymentMethod: 'wallet'
      });

      // Update next EMI date
      const nextPendingEMI = application.emiSchedule.find(e => e.status === 'pending');
      application.nextEmiDate = nextPendingEMI?.dueDate || new Date();

      // Check if fully paid
      const allPaid = application.emiSchedule.every(e => e.status === 'paid');
      if (allPaid) {
        application.status = 'paid';
      }

      await application.save();

      return {
        success: true,
        transactionId,
        emiNumber: data.emiNumber,
        amount: emi.amount,
        status: application.status,
        remainingEMIs: application.tenure - application.payments.length
      };
    });

    // Return cached result if idempotency key was hit
    if (cached) {
      res.json({
        ...result,
        cached: true,
        message: 'Payment already processed'
      });
      return;
    }

    res.json(result);

  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Get user's BNPL applications
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const applications = await BNPLApplication.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });

    res.json({
      applications: applications.map(app => ({
        applicationId: app._id,
        orderId: app.orderId,
        amount: app.amount,
        tenure: app.tenure,
        status: app.status,
        emiAmount: app.emiAmount,
        nextEmiDate: app.nextEmiDate,
        overdueAmount: app.overdueAmount,
        createdAt: app.createdAt
      }))
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Calculate EMI preview
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { amount, tenure, downPayment = 0 } = req.body;

    if (!amount || !tenure || amount < 500 || amount > 500000) {
      return res.status(400).json({ error: 'Invalid amount or tenure' });
    }

    const principal = amount - downPayment;
    const baseRate = INTEREST_RATES[tenure as BNPLTenure];
    const emiAmount = calculateEMI(principal, baseRate, tenure);
    const totalAmount = emiAmount * tenure;
    const totalInterest = totalAmount - principal;
    const processingFee = Math.ceil(principal * 0.01);

    res.json({
      principal,
      downPayment,
      tenure,
      interestRate: baseRate,
      emiAmount,
      totalAmount,
      totalInterest,
      processingFee,
      effectiveCost: totalAmount + processingFee
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
