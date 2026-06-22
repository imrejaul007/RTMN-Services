/**
 * GENIE WhatsApp Bot Service
 * Port: 4718
 */
import express from 'express';
import webhookRoutes from './routes/webhookRoutes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: any, res: any) => res.json({ status: 'healthy', service: 'genie-whatsapp-bot' }));
app.get('/health/live', (_req: any, res: any) => res.json({ status: 'ok' }));
app.get('/health/ready', (_req: any, res: any) => res.json({ status: 'ready' }));

app.use('/webhook', webhookRoutes);

const PORT = process.env.PORT || 4718;
app.listen(PORT, () => console.log(`\nGenie WhatsApp Bot - Port ${PORT}\n`));

export default app;
