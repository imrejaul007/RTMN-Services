/**
 * HOJAI Salon Retention Manager AI Employee
 * Predicts churn, sends re-engagement, manages reviews
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface CustomerActivity {
  customerId: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit?: string;
  avgSpent: number;
  preferredServices: string[];
  complaints?: number;
  reviews?: { rating: number; date: string }[];
}

interface AtRiskCustomer {
  customer: CustomerActivity;
  riskScore: number;
  riskFactors: string[];
  recommendedActions: string[];
  priority: 'high' | 'medium' | 'low';
}

interface ReviewRequest {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  status: 'pending' | 'sent' | 'responded';
  rating?: number;
  response?: string;
  createdAt: string;
}

const atRiskCustomers = new Map<string, AtRiskCustomer>();
const reviewRequests = new Map<string, ReviewRequest>();

// Analyze customers for churn risk
router.post('/analyze', async (req, res) => {
  try {
    const { customers } = req.body;

    const risks = customers.map((c: CustomerActivity) => analyzeCustomerRisk(c));
    risks.sort((a: AtRiskCustomer, b: AtRiskCustomer) => b.riskScore - a.riskScore);

    risks.filter((r: AtRiskCustomer) => r.priority === 'high').forEach((r: AtRiskCustomer) => {
      atRiskCustomers.set(r.customer.customerId, r);
    });

    res.json({
      summary: {
        total: customers.length,
        highRisk: risks.filter((r: AtRiskCustomer) => r.priority === 'high').length,
        mediumRisk: risks.filter((r: AtRiskCustomer) => r.priority === 'medium').length,
        lowRisk: risks.filter((r: AtRiskCustomer) => r.priority === 'low').length,
      },
      atRisk: risks.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

// Get at-risk customers
router.get('/at-risk', async (req, res) => {
  try {
    const { priority } = req.query;
    let customers = Array.from(atRiskCustomers.values());

    if (priority) {
      customers = customers.filter(c => c.priority === priority);
    }

    res.json({ customers, count: customers.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get at-risk' });
  }
});

// Generate re-engagement campaign
router.post('/reengagement', async (req, res) => {
  try {
    const { customerIds } = req.body;

    const customers = customerIds?.length
      ? customerIds.map((id: string) => atRiskCustomers.get(id)).filter(Boolean)
      : Array.from(atRiskCustomers.values()).filter((c: AtRiskCustomer) => c.priority !== 'low');

    const messages = customers.map((c: AtRiskCustomer) => ({
      customerId: c.customer.customerId,
      name: c.customer.name,
      phone: c.customer.phone,
      message: generateMessage(c),
    }));

    res.json({ messages, count: messages.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate campaign' });
  }
});

// Request review
router.post('/reviews/request', async (req, res) => {
  try {
    const { customerId, customerName, phone } = req.body;

    const request: ReviewRequest = {
      id: uuidv4(),
      customerId,
      customerName,
      phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    reviewRequests.set(request.id, request);

    // Send review request via WhatsApp
    await sendReviewRequest(phone, customerName);

    request.status = 'sent';
    reviewRequests.set(request.id, request);

    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request review' });
  }
});

// Respond to review
router.post('/reviews/:id/respond', async (req, res) => {
  try {
    const { rating, response } = req.body;
    const request = reviewRequests.get(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'responded';
    request.rating = rating;
    request.response = response;
    reviewRequests.set(request.id, request);

    // Send auto-response for negative reviews
    if (rating && rating <= 2) {
      await sendApologyResponse(request.phone, response);
    }

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// Get review requests
router.get('/reviews', async (req, res) => {
  try {
    const { status } = req.query;
    let requests = Array.from(reviewRequests.values());

    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Helper functions
function analyzeCustomerRisk(customer: CustomerActivity): AtRiskCustomer {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Days since last visit
  if (customer.lastVisit) {
    const daysSince = Math.floor(
      (Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince > 60) {
      riskScore += 40;
      riskFactors.push(`No visit in ${daysSince} days`);
    } else if (daysSince > 30) {
      riskScore += 20;
      riskFactors.push(`No visit in ${daysSince} days`);
    }
  }

  // Low visit frequency
  if (customer.visits >= 3 && customer.lastVisit) {
    const daysSince = Math.floor(
      (Date.now() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgDaysBetween = daysSince / customer.visits;

    if (avgDaysBetween > 45) {
      riskScore += 20;
      riskFactors.push('Low visit frequency (once every ' + Math.round(avgDaysBetween) + ' days)');
    }
  }

  // Complaints
  if (customer.complaints && customer.complaints > 0) {
    riskScore += customer.complaints * 10;
    riskFactors.push(`${customer.complaints} complaint(s)`);
  }

  // Negative reviews
  if (customer.reviews && customer.reviews.length > 0) {
    const avgRating = customer.reviews.reduce((sum, r) => sum + r.rating, 0) / customer.reviews.length;
    if (avgRating <= 3) {
      riskScore += 15;
      riskFactors.push('Low average rating: ' + avgRating.toFixed(1) + '/5');
    }
  }

  riskScore = Math.min(100, riskScore);

  const priority: 'high' | 'medium' | 'low' =
    riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  return {
    customer,
    riskScore,
    riskFactors,
    recommendedActions: getRecommendedActions(priority),
    priority,
  };
}

function getRecommendedActions(priority: string): string[] {
  if (priority === 'high') {
    return [
      'Personal call from salon manager',
      'Send exclusive re-engagement offer (25% off)',
      'Request feedback call',
    ];
  }
  if (priority === 'medium') {
    return [
      'Send WhatsApp with new services',
      'Offer loyalty points bonus',
      'Share latest photos/transformations',
    ];
  }
  return ['Regular newsletter', 'Festival offers'];
}

function generateMessage(customer: AtRiskCustomer): string {
  const names = customer.customer.name.split(' ');

  if (customer.priority === 'high') {
    return `Hi ${names[0]}, we miss you! It's been a while since your last visit. As a valued customer, here's an exclusive offer - 25% off your next visit. Book now!`;
  }

  return `Hi ${names[0]}! New services available at our salon. We'd love to see you again! Use code RETURN for 15% off.`;
}

async function sendReviewRequest(phone: string, name: string): Promise<void> {
  console.log(`[Review Request] To: ${phone}, Name: ${name}`);
}

async function sendApologyResponse(phone: string, response: string): Promise<void> {
  console.log(`[Apology] To: ${phone}, Response: ${response}`);
}

export { router, atRiskCustomers, reviewRequests };
export type { CustomerActivity, AtRiskCustomer, ReviewRequest };
