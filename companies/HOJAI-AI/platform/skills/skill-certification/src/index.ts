/**
 * Skill Certification Service - Port: 4755
 * Manages skill certification levels and reviewer pool
 */

import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4755', 10);
app.use(express.json());
app.use((req, _res, next) => { (req as any).requestId = uuidv4(); next(); });

interface Certification { id: string; skillId: string; level: 'community' | 'verified' | 'professional' | 'enterprise' | 'official'; status: 'pending' | 'approved' | 'rejected'; reviewerId?: string; createdAt: string; }
const certifications = new Map<string, Certification>();

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'skill-certification', version: '1.0.0' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

app.post('/api/certification/request', (req: Request, res: Response) => {
  const { skillId, requestedLevel } = req.body;
  const cert: Certification = { id: `cert_${Date.now()}`, skillId, level: requestedLevel || 'community', status: 'pending', createdAt: new Date().toISOString() };
  certifications.set(cert.id, cert);
  res.status(201).json({ success: true, data: cert });
});

app.post('/api/certification/:certId/approve', (req: Request, res: Response) => {
  const cert = certifications.get(req.params.certId);
  if (!cert) return res.status(404).json({ success: false, error: 'Not found' });
  cert.status = 'approved';
  cert.reviewerId = req.body.reviewerId;
  res.json({ success: true, data: cert });
});

app.post('/api/certification/:certId/reject', (req: Request, res: Response) => {
  const cert = certifications.get(req.params.certId);
  if (!cert) return res.status(404).json({ success: false, error: 'Not found' });
  cert.status = 'rejected';
  res.json({ success: true, data: cert });
});

app.get('/api/certification/:certId', (req, res) => {
  const cert = certifications.get(req.params.certId);
  if (!cert) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: cert });
});

app.get('/api/certifications', (req, res) => {
  const { status } = req.query;
  let all = Array.from(certifications.values());
  if (status) all = all.filter(c => c.status === status);
  res.json({ success: true, data: { certifications: all, total: all.length } });
});

const server = app.listen(PORT, () => console.log(`Skill Certification - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
export default app;
