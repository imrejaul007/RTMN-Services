/**
 * AI Routes - Email Writer, Proposal Generator, Forecasting
 */

import { Router } from 'express';
import { EmailWriter, EmailContext } from '../services/ai/emailWriter.js';
import { ProposalGenerator, DealContext } from '../services/ai/proposalGenerator.js';
import { SalesForecasting, ForecastData } from '../services/ai/salesForecasting.js';

const router = Router();

const emailWriter = new EmailWriter();
const proposalGenerator = new ProposalGenerator();
const forecasting = new SalesForecasting();

router.post('/email/generate', async (req, res) => {
  try {
    const { type, context } = req.body as { type: string; context: EmailContext };
    const email = emailWriter.generateEmail(type as any, context);
    res.json(email);
  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

router.post('/email/sequence', async (req, res) => {
  try {
    const { context } = req.body as { context: EmailContext };
    const sequence = emailWriter.generateSequence(context);
    res.json({ sequence, count: sequence.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate sequence' });
  }
});

router.post('/email/variants', async (req, res) => {
  try {
    const { type, context, count } = req.body;
    const variants = emailWriter.generateVariants(type, context, count || 3);
    res.json({ variants, count: variants.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate variants' });
  }
});

router.post('/proposal/generate', async (req, res) => {
  try {
    const dealContext = req.body as DealContext;
    const proposal = proposalGenerator.generateProposal(dealContext);
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate proposal' });
  }
});

router.post('/forecast/deal', async (req, res) => {
  try {
    const dealData = req.body as ForecastData;
    const forecast = forecasting.predictDeal(dealData);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to forecast deal' });
  }
});

router.post('/forecast/pipeline', async (req, res) => {
  try {
    const { deals, period } = req.body as { deals: ForecastData[]; period?: string };
    const pipelineForecast = forecasting.forecastPipeline(deals, period);
    res.json(pipelineForecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to forecast pipeline' });
  }
});

router.post('/forecast/targets', async (req, res) => {
  try {
    const { pipeline, target } = req.body as { pipeline: ForecastData[]; target: number };
    const targets = forecasting.generateWeeklyTargets(pipeline, target);
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate targets' });
  }
});

export default router;
