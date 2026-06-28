/**
 * Dataset Manager - Handles dataset CRUD, format conversion, and tokenization
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import config from './config.js';

// In-memory storage (backed by file system for persistence)
const datasets = new Map();
const DATA_FILE = path.join(config.datasetsDir, 'datasets.json');

/**
 * Initialize storage directories
 */
export function initializeStorage() {
  // Ensure directories exist
  if (!fs.existsSync(config.datasetsDir)) {
    fs.mkdirSync(config.datasetsDir, { recursive: true });
  }

  // Load existing datasets from disk
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      data.forEach(ds => datasets.set(ds.id, ds));
      console.log(`[DatasetManager] Loaded ${datasets.size} datasets from disk`);
    } catch (err) {
      console.error('[DatasetManager] Failed to load datasets:', err.message);
    }
  }
}

/**
 * Persist datasets to disk
 */
function persist() {
  try {
    const data = Array.from(datasets.values());
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[DatasetManager] Failed to persist datasets:', err.message);
  }
}

/**
 * Create a new dataset
 */
export function createDataset({ name, description, source, format, filePath, rowCount }) {
  const id = uuidv4();
  const now = new Date().toISOString();

  // Get file size
  let size = 0;
  if (filePath && fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    size = stats.size;
  }

  const dataset = {
    id,
    name,
    description: description || '',
    source: source || 'uploaded',
    format: format || detectFormat(filePath || name),
    size,
    rowCount: rowCount || 0,
    prepared: false,
    preparedAt: null,
    split: { train: 80, eval: 20 },
    createdAt: now,
    updatedAt: now
  };

  datasets.set(id, dataset);
  persist();

  console.log(`[DatasetManager] Created dataset: ${id} (${name})`);
  return dataset;
}

/**
 * Get dataset by ID
 */
export function getDataset(id) {
  return datasets.get(id) || null;
}

/**
 * List all datasets
 */
export function listDatasets({ limit = 100, offset = 0, format, prepared } = {}) {
  let result = Array.from(datasets.values());

  // Filter by format
  if (format) {
    result = result.filter(ds => ds.format === format);
  }

  // Filter by prepared status
  if (prepared !== undefined) {
    result = result.filter(ds => ds.prepared === prepared);
  }

  // Sort by createdAt descending
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate
  const total = result.length;
  const items = result.slice(offset, offset + limit);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Update dataset
 */
export function updateDataset(id, updates) {
  const dataset = datasets.get(id);
  if (!dataset) return null;

  const updated = {
    ...dataset,
    ...updates,
    id, // Prevent ID change
    updatedAt: new Date().toISOString()
  };

  datasets.set(id, updated);
  persist();

  return updated;
}

/**
 * Delete dataset
 */
export function deleteDataset(id) {
  const dataset = datasets.get(id);
  if (!dataset) return false;

  // Delete associated file if exists
  const filePath = path.join(config.datasetsDir, `${id}.${dataset.format}`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  datasets.delete(id);
  persist();

  console.log(`[DatasetManager] Deleted dataset: ${id}`);
  return true;
}

/**
 * Save uploaded file
 */
export function saveUploadedFile(datasetId, file, format) {
  const ext = format || path.extname(file.originalname).slice(1) || 'jsonl';
  const filePath = path.join(config.datasetsDir, `${datasetId}.${ext}`);

  fs.renameSync(file.path, filePath);

  const stats = fs.statSync(filePath);
  const rowCount = countRows(filePath, ext);

  // Update dataset with file info
  const dataset = datasets.get(datasetId);
  if (dataset) {
    dataset.size = stats.size;
    dataset.rowCount = rowCount;
    dataset.format = ext;
    datasets.set(datasetId, dataset);
    persist();
  }

  return {
    path: filePath,
    size: stats.size,
    rowCount
  };
}

/**
 * Prepare dataset (format conversion and tokenization metadata)
 */
export async function prepareDataset(id, { trainRatio = 80, evalRatio = 20, format: targetFormat }) {
  const dataset = datasets.get(id);
  if (!dataset) {
    throw new Error(`Dataset not found: ${id}`);
  }

  if (dataset.prepared) {
    throw new Error('Dataset already prepared');
  }

  // Update split ratio
  dataset.split = { train: trainRatio, eval: evalRatio };

  // Mark as prepared
  dataset.prepared = true;
  dataset.preparedAt = new Date().toISOString();

  if (targetFormat && targetFormat !== dataset.format) {
    dataset.format = targetFormat;
  }

  datasets.set(id, dataset);
  persist();

  // Return preparation metadata
  return {
    id: dataset.id,
    prepared: true,
    preparedAt: dataset.preparedAt,
    split: dataset.split,
    estimatedTokens: estimateTokens(dataset.rowCount, dataset.size),
    estimatedTrainingCost: estimateCost(dataset.rowCount, 'llama-3-8b')
  };
}

/**
 * Get dataset file path
 */
export function getDatasetFilePath(id) {
  const dataset = datasets.get(id);
  if (!dataset) return null;

  const filePath = path.join(config.datasetsDir, `${id}.${dataset.format}`);
  return fs.existsSync(filePath) ? filePath : null;
}

/**
 * Read dataset content
 */
export function readDatasetContent(id) {
  const filePath = getDatasetFilePath(id);
  if (!filePath) return null;

  const dataset = datasets.get(id);
  const format = dataset?.format || 'jsonl';

  switch (format) {
    case 'jsonl':
    case 'sft':
    case 'rlhf':
      return readJSONL(filePath);
    case 'csv':
      return readCSV(filePath);
    default:
      return fs.readFileSync(filePath, 'utf-8');
  }
}

/**
 * Detect format from filename
 */
function detectFormat(filename) {
  if (!filename) return 'jsonl';
  const ext = path.extname(filename).toLowerCase().slice(1);
  return config.supportedFormats.includes(ext) ? ext : 'jsonl';
}

/**
 * Count rows in file
 */
function countRows(filePath, format) {
  try {
    if (['jsonl', 'sft', 'rlhf'].includes(format)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim()).length;
    }
    if (format === 'csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim()).length - 1; // Subtract header
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Read JSONL file
 */
function readJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim());

  return lines.map((line, index) => {
    try {
      return { index, data: JSON.parse(line) };
    } catch {
      return { index, data: line, error: 'Invalid JSON' };
    }
  });
}

/**
 * Read CSV file
 */
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

  return parsed.data.map((row, index) => ({
    index,
    data: row
  }));
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(rowCount, sizeBytes) {
  // Rough estimate: ~4 characters per token, 100 bytes per row average
  const avgBytesPerRow = sizeBytes / (rowCount || 1);
  const charsPerToken = 4;
  return Math.round((rowCount * avgBytesPerRow) / charsPerToken);
}

/**
 * Estimate training cost
 */
function estimateCost(rowCount, baseModel) {
  const tokensPerSample = 256; // Average tokens per sample
  const totalTokens = rowCount * tokensPerSample;
  const costPerToken = (config.costPerBillionTokens[baseModel] || 0.2) / 1e9;
  return totalTokens * costPerToken;
}

/**
 * Get statistics
 */
export function getDatasetStats() {
  const all = Array.from(datasets.values());
  const totalSize = all.reduce((sum, ds) => sum + ds.size, 0);
  const totalRows = all.reduce((sum, ds) => sum + ds.rowCount, 0);
  const preparedCount = all.filter(ds => ds.prepared).length;

  return {
    total: all.length,
    prepared: preparedCount,
    totalSize,
    totalRows,
    byFormat: all.reduce((acc, ds) => {
      acc[ds.format] = (acc[ds.format] || 0) + 1;
      return acc;
    }, {})
  };
}

export default {
  initializeStorage,
  createDataset,
  getDataset,
  listDatasets,
  updateDataset,
  deleteDataset,
  saveUploadedFile,
  prepareDataset,
  getDatasetFilePath,
  readDatasetContent,
  getDatasetStats
};