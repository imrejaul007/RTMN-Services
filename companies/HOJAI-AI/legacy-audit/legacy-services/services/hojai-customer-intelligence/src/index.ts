import express, { Request, Response } from 'express';import cors from 'cors';import helmet from 'helmet';import mongoose from 'mongoose';import { v4 as uuidv4 } from 'uuid';import pino from 'pino';
const app = express();const PORT = parseInt(process.env.PORT || '4758', 10);
app.use(helmet());app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false }));app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-customer-intelligence', version: '1.0.0' }));
app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req, res) => { try { res.json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'not ready' }); } catch { res.status(503).json({ status: 'not ready' }); } });

const CustomerSchemaM = new mongoose.Schema({ id: { type: String, required: true, unique: true }, email: String, name: String, phone: String, company: String, lifecycleStage: { type: String, enum: ['lead', 'prospect', 'customer', 'champion', 'churned'] }, score: { type: Number, default: 50 }, tags: [String] }, { timestamps: true });const CustomerModel = mongoose.model('Customer', CustomerSchemaM);
const InteractionSchemaM = new mongoose.Schema({ id: { type: String, required: true, unique: true }, customerId: String, type: { type: String, enum: ['email', 'call', 'meeting', 'support', 'purchase'] }, content: String, sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] } }, { timestamps: true });const InteractionModel = mongoose.model('Interaction', InteractionSchemaM);

app.get('/api/v1/customers', async (req, res) => { try { const c = await CustomerModel.find().sort({ createdAt: -1 }).lean(); res.json({ count: c.length, customers: c }); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.post('/api/v1/customers', async (req, res) => { try { const c = new CustomerModel({ id: uuidv4(), ...req.body }); await c.save(); res.status(201).json(c.toObject()); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/customers/:id', async (req, res) => { try { const c = await CustomerModel.findOne({ id: req.params.id }).lean(); if (!c) return res.status(404).json({ error: 'Not found' }); res.json(c); } catch (e) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/customers/:id/interactions', async (req, res) => { try { const i = await InteractionModel.find({ customerId: req.params.id }).sort({ createdAt: -1 }).lean(); res.json({ count: i.length, interactions: i }); } catch (e) { res.status(500).json({ error: 'Failed' }); } });
app.post('/api/v1/interactions', async (req, res) => { try { const i = new InteractionModel({ id: uuidv4(), ...req.body }); await i.save(); res.status(201).json(i.toObject()); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/analytics', async (req, res) => { try { const byStage = await CustomerModel.aggregate([{ $group: { _id: '$lifecycleStage', count: { $sum: 1 } } }]); const avgScore = await CustomerModel.aggregate([{ $group: { _id: null, avg: { $avg: '$score' } } }]); res.json({ totalCustomers: await CustomerModel.countDocuments(), byLifecycleStage: byStage, avgScore: avgScore[0]?.avg || 0 }); } catch (e) { res.status(500).json({ error: 'Failed' }); } });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-customer-intelligence').then(() => pino().info('MongoDB connected'));
const server = app.listen(PORT, () => pino().info(`Customer Intelligence running on ${PORT}`));
process.on('SIGTERM', () => { pino().info('Shutting down'); server.close(() => { mongoose.connection.close(); process.exit(0); }); });
export default app;
