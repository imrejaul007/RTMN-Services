// Multi-Modal OS - Image, audio, video processing, OCR, transcription. Port 4897
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readJson, writeJson } from './store.js';
import {
  detectFileType, IMAGE_FORMATS, AUDIO_FORMATS, VIDEO_FORMATS,
  processImage, processAudio, processVideo, runOCR,
} from './processors.js';

const app = express();
const PORT = 4897;
app.use(express.json());

// Jobs storage
function loadJobs() { return readJson('jobs.json') || []; }
function saveJobs(jobs) { writeJson('jobs.json', jobs); }

// --- Upload / Detect ---
app.post('/api/detect', (req, res) => {
  const { filename, magicBytes } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  const info = detectFileType(filename, magicBytes);
  res.json(info);
});

// --- Image Processing ---
app.post('/api/image/process', (req, res) => {
  const { filename, operation, params = {}, metadata = {} } = req.body;
  if (!filename || !operation) return res.status(400).json({ error: 'filename and operation required' });

  const imageData = {
    size: metadata.size || 1024,
    format: metadata.format || 'png',
    width: metadata.width || 1920,
    height: metadata.height || 1080,
  };

  const result = processImage(imageData, operation, params);
  const job = {
    id: uuidv4(),
    type: 'image',
    filename,
    operation,
    status: 'completed',
    result,
    createdAt: new Date().toISOString(),
  };

  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
  res.json(job);
});

// --- Audio Processing ---
app.post('/api/audio/process', (req, res) => {
  const { filename, operation, params = {}, metadata = {} } = req.body;
  if (!filename || !operation) return res.status(400).json({ error: 'filename and operation required' });

  const audioData = {
    duration: metadata.duration || 60,
    format: metadata.format || 'mp3',
    sampleRate: metadata.sampleRate || 44100,
  };

  const result = processAudio(audioData, operation, params);
  const job = {
    id: uuidv4(),
    type: 'audio',
    filename,
    operation,
    status: 'completed',
    result,
    createdAt: new Date().toISOString(),
  };

  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
  res.json(job);
});

// --- Video Processing ---
app.post('/api/video/process', (req, res) => {
  const { filename, operation, params = {}, metadata = {} } = req.body;
  if (!filename || !operation) return res.status(400).json({ error: 'filename and operation required' });

  const videoData = {
    duration: metadata.duration || 300,
    format: metadata.format || 'mp4',
    fps: metadata.fps || 30,
  };

  const result = processVideo(videoData, operation, params);
  const job = {
    id: uuidv4(),
    type: 'video',
    filename,
    operation,
    status: 'completed',
    result,
    createdAt: new Date().toISOString(),
  };

  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
  res.json(job);
});

// --- OCR ---
app.post('/api/ocr', (req, res) => {
  const { filename, metadata = {}, options = {} } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  const imageData = {
    width: metadata.width || 1920,
    height: metadata.height || 1080,
    format: metadata.format || 'png',
  };

  const result = runOCR(imageData, options);
  const job = {
    id: uuidv4(),
    type: 'ocr',
    filename,
    status: 'completed',
    result,
    createdAt: new Date().toISOString(),
  };

  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
  res.json(job);
});

// --- Transcription ---
app.post('/api/transcribe', (req, res) => {
  const { filename, mediaType, metadata = {}, options = {} } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });

  let result;
  if (mediaType === 'video') {
    result = processVideo({ duration: metadata.duration || 60, format: 'mp4', fps: 30 }, 'transcribe', options);
  } else {
    result = processAudio({ duration: metadata.duration || 60, format: 'mp3', sampleRate: 44100 }, 'transcribe', options);
  }

  const job = {
    id: uuidv4(),
    type: 'transcription',
    filename,
    mediaType: mediaType || 'audio',
    status: 'completed',
    result,
    createdAt: new Date().toISOString(),
  };

  const jobs = loadJobs();
  jobs.push(job);
  saveJobs(jobs);
  res.json(job);
});

// --- Jobs ---
app.get('/api/jobs', (req, res) => {
  const { type, status } = req.query;
  let jobs = loadJobs();
  if (type) jobs = jobs.filter(j => j.type === type);
  if (status) jobs = jobs.filter(j => j.status === status);
  res.json({ jobs, count: jobs.length });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = loadJobs().find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// --- Formats ---
app.get('/api/formats', (req, res) => {
  res.json({ image: IMAGE_FORMATS, audio: AUDIO_FORMATS, video: VIDEO_FORMATS });
});

// --- Batch Processing ---
app.post('/api/batch', (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'tasks array required' });

  const results = tasks.map(task => {
    const { type, filename, operation, params, metadata } = task;
    let result;
    try {
      switch (type) {
        case 'image': result = processImage({ size: 1024, format: 'png', width: 1920, height: 1080 }, operation, params); break;
        case 'audio': result = processAudio({ duration: 60, format: 'mp3', sampleRate: 44100 }, operation, params); break;
        case 'video': result = processVideo({ duration: 300, format: 'mp4', fps: 30 }, operation, params); break;
        default: result = { error: `Unknown type: ${type}` };
      }
    } catch (e) {
      result = { error: e.message };
    }
    return { type, filename, operation, status: result.error ? 'failed' : 'completed', result };
  });

  const batchJob = { id: uuidv4(), type: 'batch', taskCount: tasks.length, results, createdAt: new Date().toISOString() };
  const jobs = loadJobs();
  jobs.push(batchJob);
  saveJobs(jobs);
  res.json(batchJob);
});

// Health
app.get('/health', (req, res) => res.json({ service: 'multi-modal-os', status: 'healthy' }));
app.get('/ready', (req, res) => res.json({ ready: true }));

const server = app.listen(PORT, () => { console.log(`Multi-Modal OS running on port ${PORT}`); });
export default server;
