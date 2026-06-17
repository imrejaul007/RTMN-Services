import express from 'express';

const app = express();
const PORT = 5059;

app.use(express.json());

// Mock data
const catalogs = [
  { id: '1', title: 'Exhibitor Directory 2026', type: 'directory', pages: 120, language: 'en', downloads: 542 },
  { id: '2', title: 'Product Catalog', type: 'catalog', pages: 85, language: 'en', downloads: 321 },
  { id: '3', title: 'Floor Plan Guide', type: 'map', pages: 10, language: 'multi', downloads: 890 },
];

const brochures = [
  { id: '1', title: 'Event Overview', language: 'en', format: 'pdf', size: '2.5MB', downloads: 234 },
  { id: '2', title: 'Sponsor Opportunities', language: 'en', format: 'pdf', size: '1.8MB', downloads: 156 },
  { id: '3', title: 'Visitor Guide', language: 'en', format: 'pdf', size: '3.2MB', downloads: 445 },
  { id: '4', title: 'Workshop Schedule', language: 'en', format: 'pdf', size: '1.5MB', downloads: 389 },
];

const exhibitorDocs = [
  { id: '1', exhibitorId: 'expo_001', type: 'contract', name: 'Booth Agreement', status: 'signed', uploadedAt: '2026-06-01' },
  { id: '2', exhibitorId: 'expo_001', type: 'insurance', name: 'Liability Insurance', status: 'approved', uploadedAt: '2026-06-05' },
  { id: '3', exhibitorId: 'expo_002', type: 'contract', name: 'Booth Agreement', status: 'pending', uploadedAt: '2026-06-10' },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-document-service', port: PORT });
});

// Get catalogs
app.get('/api/catalogs', (req, res) => {
  const { type, language } = req.query;
  let filtered = catalogs;
  if (type) filtered = filtered.filter(c => c.type === type);
  if (language) filtered = filtered.filter(c => c.language === language || c.language === 'multi');
  res.json({ success: true, data: filtered });
});

// Get catalog by ID
app.get('/api/catalogs/:id', (req, res) => {
  const catalog = catalogs.find(c => c.id === req.params.id);
  if (!catalog) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Catalog not found' } });
  }
  res.json({ success: true, data: catalog });
});

// Get brochures
app.get('/api/brochures', (req, res) => {
  const { language, format } = req.query;
  let filtered = brochures;
  if (language) filtered = filtered.filter(b => b.language === language);
  if (format) filtered = filtered.filter(b => b.format === format);
  res.json({ success: true, data: filtered });
});

// Get brochure by ID
app.get('/api/brochures/:id', (req, res) => {
  const brochure = brochures.find(b => b.id === req.params.id);
  if (!brochure) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brochure not found' } });
  }
  res.json({ success: true, data: brochure });
});

// Get exhibitor documents
app.get('/api/exhibitor-docs', (req, res) => {
  const { exhibitorId, type, status } = req.query;
  let filtered = exhibitorDocs;
  if (exhibitorId) filtered = filtered.filter(d => d.exhibitorId === exhibitorId);
  if (type) filtered = filtered.filter(d => d.type === type);
  if (status) filtered = filtered.filter(d => d.status === status);
  res.json({ success: true, data: filtered });
});

// Upload document (mock)
app.post('/api/exhibitor-docs', (req, res) => {
  const newDoc = {
    id: String(exhibitorDocs.length + 1),
    ...req.body,
    status: 'pending',
    uploadedAt: new Date().toISOString().split('T')[0],
  };
  exhibitorDocs.push(newDoc);
  res.status(201).json({ success: true, data: newDoc });
});

// Update document status
app.patch('/api/exhibitor-docs/:id', (req, res) => {
  const index = exhibitorDocs.findIndex(d => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
  }
  exhibitorDocs[index] = { ...exhibitorDocs[index], ...req.body };
  res.json({ success: true, data: exhibitorDocs[index] });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalCatalogs: catalogs.length,
    totalBrochures: brochures.length,
    totalDownloads: [
      ...catalogs,
      ...brochures,
    ].reduce((sum, d) => sum + d.downloads, 0),
    topDocuments: [
      ...catalogs.map(c => ({ title: c.title, downloads: c.downloads, type: 'catalog' })),
      ...brochures.map(b => ({ title: b.title, downloads: b.downloads, type: 'brochure' })),
    ].sort((a, b) => b.downloads - a.downloads).slice(0, 5),
    documentCompliance: {
      total: exhibitorDocs.length,
      signed: exhibitorDocs.filter(d => d.status === 'signed').length,
      approved: exhibitorDocs.filter(d => d.status === 'approved').length,
      pending: exhibitorDocs.filter(d => d.status === 'pending').length,
    },
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition Document Service running on port ${PORT}`);
});

export default app;
