/**
 * Sales Routes - Lead and deal management
 */
import { Router } from 'express';
import { isValidLeadId } from '../middleware/validation.js';

export const salesRoutes = (
    intelligenceEngine: {
        getSalesIntelligence: (leadId: string) => Promise<unknown>;
        getPreCallBrief: (leadId: string) => Promise<unknown>;
        getPipelineIntelligence: () => Promise<unknown>;
    },
    twinService: {
        getTwin: (leadId: string) => Promise<unknown>;
        getTalkingPoints: (leadId: string) => Promise<string[]>;
        predictNextAction: (leadId: string) => Promise<unknown>;
    },
    signalAggregator: {
        aggregateSignals: (leadId: string) => Promise<unknown[]>;
        getSignalScore: (leadId: string) => Promise<unknown>;
        detectBuyingSignals: (leadId: string) => Promise<unknown[]>;
    }
) => {
    const router = Router();

    // Get sales intelligence for a lead
    router.get('/intelligence/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            // FIXED: validate leadId format
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const intelligence = await intelligenceEngine.getSalesIntelligence(leadId);
            if (!intelligence) {
                return res.status(404).json({ error: 'Lead not found' });
            }
            res.json(intelligence);
        } catch (error) {
            console.error('Error fetching sales intelligence:', error);
            res.status(500).json({ error: 'Failed to fetch sales intelligence' });
        }
    });

    // Get pre-call brief
    router.get('/pre-call/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const brief = await intelligenceEngine.getPreCallBrief(leadId);
            if (!brief) {
                return res.status(404).json({ error: 'Lead not found' });
            }
            res.json(brief);
        } catch (error) {
            console.error('Error generating pre-call brief:', error);
            res.status(500).json({ error: 'Failed to generate pre-call brief' });
        }
    });

    // Get prospect twin
    router.get('/twin/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const twin = await twinService.getTwin(leadId);
            if (!twin) {
                return res.status(404).json({ error: 'Prospect not found' });
            }
            res.json(twin);
        } catch (error) {
            console.error('Error fetching prospect twin:', error);
            res.status(500).json({ error: 'Failed to fetch prospect twin' });
        }
    });

    // Get talking points for a lead
    router.get('/talking-points/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const points = await twinService.getTalkingPoints(leadId);
            res.json({ talkingPoints: points });
        } catch (error) {
            console.error('Error fetching talking points:', error);
            res.status(500).json({ error: 'Failed to fetch talking points' });
        }
    });

    // Get next best action
    router.get('/next-action/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const action = await twinService.predictNextAction(leadId);
            res.json(action);
        } catch (error) {
            console.error('Error predicting next action:', error);
            res.status(500).json({ error: 'Failed to predict next action' });
        }
    });

    // Get aggregated signals
    router.get('/signals/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const signals = await signalAggregator.aggregateSignals(leadId);
            res.json({ signals, count: signals.length });
        } catch (error) {
            console.error('Error aggregating signals:', error);
            res.status(500).json({ error: 'Failed to aggregate signals' });
        }
    });

    // Get signal score
    router.get('/signal-score/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const score = await signalAggregator.getSignalScore(leadId);
            res.json(score);
        } catch (error) {
            console.error('Error calculating signal score:', error);
            res.status(500).json({ error: 'Failed to calculate signal score' });
        }
    });

    // Get buying signals
    router.get('/buying-signals/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const signals = await signalAggregator.detectBuyingSignals(leadId);
            res.json({ signals, count: signals.length });
        } catch (error) {
            console.error('Error detecting buying signals:', error);
            res.status(500).json({ error: 'Failed to detect buying signals' });
        }
    });

    // Get pipeline intelligence
    router.get('/pipeline', async (req, res) => {
        try {
            const pipeline = await intelligenceEngine.getPipelineIntelligence();
            res.json(pipeline);
        } catch (error) {
            console.error('Error fetching pipeline intelligence:', error);
            res.status(500).json({ error: 'Failed to fetch pipeline intelligence', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    return router;
};
