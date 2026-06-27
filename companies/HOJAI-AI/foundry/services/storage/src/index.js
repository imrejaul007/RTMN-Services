/**
 * HOJAI Studio - Storage Service
 * File uploads, image resizing, CDN
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = 4754;
app.use(express.json());

const files = new Map(); // fileId -> file metadata
const folders = new Map(); // folderId -> folder data
const uploads = []; // upload history

// Supported formats
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
const VIDEO_FORMATS = ['mp4', 'webm', 'mov', 'avi'];
const DOC_FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const ALL_FORMATS = [...IMAGE_FORMATS, ...VIDEO_FORMATS, ...DOC_FORMATS, 'zip', 'txt'];

// REST API - Upload
app.post('/api/upload', requireInternal, (req, res) => {
  const { projectId, name, mimeType, size, folderId } = req.body;

  const ext = name.split('.').pop().toLowerCase();
  const fileId = uuidv4();

  const file = {
    id: fileId,
    projectId,
    folderId,
    name,
    extension: ext,
    mimeType,
    size,
    format: IMAGE_FORMATS.includes(ext) ? 'image' : VIDEO_FORMATS.includes(ext) ? 'video' : 'document',
    url: `https://cdn.hojai.app/${projectId}/${fileId}/${name}`,
    thumbnail: IMAGE_FORMATS.includes(ext) ? `https://cdn.hojai.app/${projectId}/${fileId}/thumb.jpg` : null,
    variants: [],
    createdAt: new Date().toISOString()
  };

  files.set(fileId, file);
  uploads.push({ fileId, projectId, name, size, uploadedAt: new Date().toISOString() });

  res.json(file);
});

// REST API - Get File
app.get('/api/files/:fileId', (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

// REST API - List Files
app.get('/api/files', (req, res) => {
  const { projectId, folderId, format, search } = req.query;
  let list = Array.from(files.values());

  if (projectId) list = list.filter(f => f.projectId === projectId);
  if (folderId) list = list.filter(f => f.folderId === folderId);
  if (format) list = list.filter(f => f.format === format);
  if (search) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// REST API - Delete File
app.delete('/api/files/:fileId', requireInternal, (req, res) => {
  if (!files.has(req.params.fileId)) return res.status(404).json({ error: 'File not found' });
  files.delete(req.params.fileId);
  res.json({ deleted: true });
});

// REST API - Generate Variants
app.post('/api/files/:fileId/variants', requireInternal, (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const { sizes = [{ width: 100, height: 100 }, { width: 300, height: 300 }, { width: 800, height: 800 }] } = req.body;

  const variants = sizes.map((size, i) => ({
    id: uuidv4(),
    fileId: file.id,
    width: size.width,
    height: size.height,
    url: `https://cdn.hojai.app/${file.projectId}/${file.id}/${size.width}x${size.height}/${file.name}`,
    format: 'webp'
  }));

  file.variants = variants;
  res.json(variants);
});

// REST API - Image Transform
app.post('/api/transform', requireInternal, (req, res) => {
  const { fileId, width, height, format = 'webp', quality = 80, fit = 'cover' } = req.body;

  const file = files.get(fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const transformed = {
    id: uuidv4(),
    originalId: fileId,
    width,
    height,
    format,
    quality,
    fit,
    url: `https://cdn.hojai.app/transform/${uuidv4()}/${file.name.split('.')[0]}.${format}`,
    createdAt: new Date().toISOString()
  };

  res.json(transformed);
});

// REST API - Folders
app.post('/api/folders', requireInternal, (req, res) => {
  const { projectId, name, parentId } = req.body;
  const folder = {
    id: uuidv4(),
    projectId,
    name,
    parentId,
    createdAt: new Date().toISOString()
  };
  folders.set(folder.id, folder);
  res.json(folder);
});

app.get('/api/folders', (req, res) => {
  const { projectId, parentId } = req.query;
  let list = Array.from(folders.values());

  if (projectId) list = list.filter(f => f.projectId === projectId);
  if (parentId !== undefined) list = list.filter(f => f.parentId === parentId || (parentId === 'null' && !f.parentId));

  res.json(list);
});

app.delete('/api/folders/:folderId', requireInternal, (req, res) => {
  if (!folders.has(req.params.folderId)) return res.status(404).json({ error: 'Folder not found' });
  folders.delete(req.params.folderId);
  res.json({ deleted: true });
});

// REST API - Usage Stats
app.get('/api/usage/:projectId', (req, res) => {
  const projectFiles = Array.from(files.values()).filter(f => f.projectId === req.params.projectId);
  const totalSize = projectFiles.reduce((sum, f) => sum + f.size, 0);

  const byFormat = {};
  projectFiles.forEach(f => {
    byFormat[f.format] = (byFormat[f.format] || 0) + 1;
  });

  res.json({
    projectId: req.params.projectId,
    totalFiles: projectFiles.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    byFormat,
    byFolder: getFolderStats(projectFiles)
  });
});

// REST API - Signed URL
app.get('/api/files/:fileId/signed-url', (req, res) => {
  const file = files.get(req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const { expires = 3600 } = req.query;
  const signedUrl = `${file.url}?token=${uuidv4()}&expires=${Date.now() + parseInt(expires) * 1000}`;

  res.json({ url: signedUrl, expiresIn: expires });
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFolderStats(files) {
  const stats = {};
  files.forEach(f => {
    const folderId = f.folderId || 'root';
    stats[folderId] = (stats[folderId] || 0) + 1;
  });
  return stats;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'storage', files: files.size, folders: folders.size }));
app.listen(PORT, () => console.log(`Storage running on port ${PORT}`));
