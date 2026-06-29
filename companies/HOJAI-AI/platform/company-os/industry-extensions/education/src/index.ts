/**
 * Education Extension - Students, Courses, Enrollment, Certificates
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5060;
interface Store { students: Map<string, any>; courses: Map<string, any>; enrollments: Map<string, any>; certificates: Map<string, any>; }
const stores = new Map<string, Store>();
const getStore = (tid: string) => { if (!stores.has(tid)) stores.set(tid, { students: new Map(), courses: new Map(), enrollments: new Map(), certificates: new Map() }); return stores.get(tid)!; };
app.get('/api/students', (req, res) => { const tid = req.headers['x-tenant-id'] as string; if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' }); res.json({ students: Array.from(getStore(tid).students.values()) }); });
app.post('/api/students', (req, res) => { const tid = req.headers['x-tenant-id'] as string; if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' }); const s = { id: `stud_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body }; getStore(tid).students.set(s.id, s); res.status(201).json(s); });
app.get('/api/courses', (req, res) => { const tid = req.headers['x-tenant-id'] as string; if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' }); res.json({ courses: Array.from(getStore(tid).courses.values()) }); });
app.post('/api/courses', (req, res) => { const tid = req.headers['x-tenant-id'] as string; if (!tid) return res.status(401).json({ error: 'Missing X-Tenant-ID' }); const c = { id: `course_${uuidv4().slice(0,8)}`, tenantId: tid, ...req.body }; getStore(tid).courses.set(c.id, c); res.status(201).json(c); });
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'education-extension', port: PORT }));
app.listen(PORT, () => console.log(`Education Extension running on port ${PORT}`));
export default app;
