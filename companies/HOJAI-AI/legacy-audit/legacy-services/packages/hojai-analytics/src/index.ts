import express from 'express';
import mongoose from 'mongoose';
import { analyticsService } from './services/attributionService.js';
import { AttributionModel, ExperimentStatus } from './types/index.js';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4580;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-analytics';

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-analytics' }));

// Attribution
app.post('/api/attribution/events', async (req, res) => {
  const event = await analyticsService.trackAttributionEvent(req.body);
  res.status(201).json({ success: true, data: event });
});

app.post('/api/attribution/conversions', async (req, res) => {
  const conversion = await analyticsService.trackConversion(req.body);
  res.status(201).json({ success: true, data: conversion });
});

app.get('/api/attribution', async (req, res) => {
  const { tenantId, model, startDate, endDate, userId } = req.query;
  const results = await analyticsService.getAttribution({
    tenantId: tenantId as string,
    model: (model as AttributionModel) || AttributionModel.LAST_TOUCH,
    startDate: new Date(startDate as string),
    endDate: new Date(endDate as string),
    userId: userId as string
  });
  res.json({ success: true, data: results });
});

// Experiments
app.post('/api/experiments', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const experiment = await analyticsService.createExperiment({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: experiment });
});

app.get('/api/experiments', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const experiments = await mongoose.model('Experiment').find({ tenantId }).sort({ createdAt: -1 });
  res.json({ success: true, data: experiments });
});

app.post('/api/experiments/:id/assign', async (req, res) => {
  const { userId } = req.body;
  const variant = await analyticsService.assignVariant(req.params.id, userId);
  res.json({ success: true, data: variant });
});

app.post('/api/experiments/:id/convert', async (req, res) => {
  const { userId, value } = req.body;
  await analyticsService.recordConversion(req.params.id, userId, value);
  res.json({ success: true });
});

app.post('/api/experiments/:id/analyze', async (req, res) => {
  const results = await analyticsService.analyzeExperiment(req.params.id);
  res.json({ success: true, data: results });
});

// Audiences
app.post('/api/audiences', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const audience = await analyticsService.createAudience({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: audience });
});

app.get('/api/audiences', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const audiences = await analyticsService.listAudiences(tenantId);
  res.json({ success: true, data: audiences });
});

// Reports
app.post('/api/reports', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const report = await analyticsService.createReport({ ...req.body, tenantId });
  res.status(201).json({ success: true, data: report });
});

app.get('/api/reports', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const reports = await analyticsService.listReports(tenantId);
  res.json({ success: true, data: reports });
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`[Hojai Analytics] Running on port ${PORT}`));
}

start().catch(console.error);
export default app;
