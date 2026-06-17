/**
 * AI Routes - Email Writer, Proposal Generator, Forecasting
 */
import { Router } from 'express';
import { writeLimiter } from '../middleware/rateLimit.js';
import { EmailWriter } from '../services/ai/emailWriter.js';
import { ProposalGenerator } from '../services/ai/proposalGenerator.js';
import { SalesForecasting } from '../services/ai/salesForecasting.js';

const router = Router();
const emailWriter = new EmailWriter();
const proposalGenerator = new ProposalGenerator();
const forecasting = new SalesForecasting();

// FIXED: validate context exists, type, and cap variant count
router.post('/email/generate', writeLimiter, async (req, res) => {
    try {
        const { type, context } = req.body as { type?: string; context?: Record<string, unknown> };
        // Validate required fields
        if (!type || typeof type !== 'string') {
            return res.status(400).json({ error: 'type is required and must be a string' });
        }
        if (!context || typeof context !== 'object') {
            return res.status(400).json({ error: 'context is required and must be an object' });
        }
        const email = emailWriter.generateEmail(type, context);
        res.json(email);
    } catch (error) {
        console.error('Email generation error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate email';
        // FIXED: don't leak internal error details to client
        if (message.startsWith('Unknown email type')) {
            res.status(400).json({ error: message });
        } else {
            res.status(500).json({ error: 'Failed to generate email' });
        }
    }
});

router.post('/email/sequence', writeLimiter, async (req, res) => {
    try {
        const { context } = req.body as { context?: Record<string, unknown> };
        if (!context || typeof context !== 'object') {
            return res.status(400).json({ error: 'context is required and must be an object' });
        }
        const sequence = emailWriter.generateSequence(context);
        res.json({ sequence, count: sequence.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate sequence' });
    }
});

router.post('/email/variants', writeLimiter, async (req, res) => {
    try {
        const { type, context, count } = req.body as { type?: string; context?: Record<string, unknown>; count?: number };
        if (!type || typeof type !== 'string') {
            return res.status(400).json({ error: 'type is required' });
        }
        if (!context || typeof context !== 'object') {
            return res.status(400).json({ error: 'context is required' });
        }
        // FIXED: cap count to prevent CPU/memory exhaustion (max 10 variants)
        const safeCount = Math.min(10, Math.max(1, parseInt(String(count)) || 3));
        const variants = emailWriter.generateVariants(type, context, safeCount);
        res.json({ variants, count: variants.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate variants' });
    }
});

router.post('/proposal/generate', writeLimiter, async (req, res) => {
    try {
        const dealContext = req.body as Record<string, unknown>;
        const proposal = proposalGenerator.generateProposal(dealContext);
        res.json(proposal);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate proposal' });
    }
});

router.post('/forecast/deal', writeLimiter, async (req, res) => {
    try {
        const dealData = req.body as Record<string, unknown>;
        const forecast = forecasting.predictDeal(dealData);
        res.json(forecast);
    } catch (error) {
        res.status(500).json({ error: 'Failed to forecast deal' });
    }
});

router.post('/forecast/pipeline', writeLimiter, async (req, res) => {
    try {
        const { deals, period } = req.body as { deals?: unknown[]; period?: string };
        const safeDeals = (Array.isArray(deals) ? deals.slice(0, 1000) : []) as Record<string, unknown>[];
        const pipelineForecast = forecasting.forecastPipeline(safeDeals, period || 'Q2 2026');
        res.json(pipelineForecast);
    } catch (error) {
        res.status(500).json({ error: 'Failed to forecast pipeline' });
    }
});

router.post('/forecast/targets', writeLimiter, async (req, res) => {
    try {
        const { pipeline, target } = req.body as { pipeline?: unknown[]; target?: number };
        const safePipeline = (Array.isArray(pipeline) ? pipeline.slice(0, 1000) : []) as Record<string, unknown>[];
        const targets = forecasting.generateWeeklyTargets(safePipeline, target || 0);
        res.json(targets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate targets' });
    }
});

export default router;
