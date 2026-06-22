import express, { Request, Response } from 'express';import cors from 'cors';import helmet from 'helmet';import mongoose from 'mongoose';import { v4 as uuidv4 } from 'uuid';import pino from 'pino';
const app = express();const PORT = parseInt(process.env.PORT || '4801', 10);
app.use(helmet());app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false }));app.use(express.json({ limit: '10kb' }));
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'hojai-command-center', version: '1.0.0', uptime: process.uptime() }));
app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req, res) => { try { res.json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'not ready' }); } catch { res.status(503).json({ status: 'not ready' }); } });

const DashboardSchemaM = new mongoose.Schema({ id: { type: String, required: true, unique: true }, name: String, description: String, widgets: [String], ownerId: String, isDefault: { type: Boolean, default: false } }, { timestamps: true });const DashboardModel = mongoose.model('Dashboard', DashboardSchemaM);
const WidgetSchemaM = new mongoose.Schema({ id: { type: String, required: true, unique: true }, type: { type: String, enum: ['metric', 'chart', 'table', 'alert', 'news', 'goals'] }, title: String, config: mongoose.Schema.Types.Mixed, position: mongoose.Schema.Types.Mixed, refreshInterval: { type: Number, default: 60 } }, { timestamps: true });const WidgetModel = mongoose.model('Widget', WidgetSchemaM);

app.get('/api/v1/dashboards', async (req, res) => { try { const d = await DashboardModel.find().lean(); res.json({ count: d.length, dashboards: d }); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.post('/api/v1/dashboards', async (req, res) => { try { const d = new DashboardModel({ id: uuidv4(), ...req.body }); await d.save(); res.status(201).json(d.toObject()); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/dashboards/:id', async (req, res) => { try { const d = await DashboardModel.findOne({ id: req.params.id }).lean(); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); } catch (e) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/dashboards/:id/widgets', async (req, res) => { try { const d = await DashboardModel.findOne({ id: req.params.id }).lean(); if (!d) return res.status(404).json({ error: 'Not found' }); const widgets = await WidgetModel.find({ id: { $in: d.widgets } }).lean(); res.json({ count: widgets.length, widgets }); } catch (e) { res.status(500).json({ error: 'Failed' }); } });
app.post('/api/v1/widgets', async (req, res) => { try { const w = new WidgetModel({ id: uuidv4(), ...req.body }); await w.save(); res.status(201).json(w.toObject()); } catch (e) { pino().error({ e }); res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/widgets/:id', async (req, res) => { try { const w = await WidgetModel.findOne({ id: req.params.id }).lean(); if (!w) return res.status(404).json({ error: 'Not found' }); res.json(w); } catch (e) { res.status(500).json({ error: 'Failed' }); } });
app.get('/api/v1/overview', async (req, res) => { try { res.json({ dashboards: await DashboardModel.countDocuments(), widgets: await WidgetModel.countDocuments(), uptime: process.uptime(), timestamp: new Date() }); } catch (e) { res.status(500).json({ error: 'Failed' }); } });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-command-center').then(() => pino().info('MongoDB connected'));
const server = app.listen(PORT, () => pino().info(`Command Center running on ${PORT}`));
process.on('SIGTERM', () => { pino().info('Shutting down'); server.close(() => { mongoose.connection.close(); process.exit(0); }); });
export default app;
