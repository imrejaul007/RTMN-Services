// Multi-Modal OS tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { detectFileType, IMAGE_FORMATS, AUDIO_FORMATS, VIDEO_FORMATS, processImage, processAudio, processVideo, runOCR } from '../../src/processors.js';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4897, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// --- Processors unit tests ---
describe('Processors', () => {
  it('detectFileType should detect image formats', () => {
    expect(detectFileType('photo.jpg').type).toBe('image');
    expect(detectFileType('photo.png').type).toBe('image');
    expect(detectFileType('photo.webp').type).toBe('image');
  });

  it('detectFileType should detect audio formats', () => {
    expect(detectFileType('song.mp3').type).toBe('audio');
    expect(detectFileType('song.wav').type).toBe('audio');
    expect(detectFileType('song.ogg').type).toBe('audio');
  });

  it('detectFileType should detect video formats', () => {
    expect(detectFileType('video.mp4').type).toBe('video');
    expect(detectFileType('video.mov').type).toBe('video');
    expect(detectFileType('video.webm').type).toBe('video');
  });

  it('detectFileType should return unknown for unrecognized', () => {
    expect(detectFileType('file.xyz').type).toBe('unknown');
  });

  it('IMAGE_FORMATS should include common formats', () => {
    expect(IMAGE_FORMATS).toContain('jpg');
    expect(IMAGE_FORMATS).toContain('png');
    expect(IMAGE_FORMATS).toContain('webp');
  });

  it('AUDIO_FORMATS should include common formats', () => {
    expect(AUDIO_FORMATS).toContain('mp3');
    expect(AUDIO_FORMATS).toContain('wav');
  });

  it('VIDEO_FORMATS should include common formats', () => {
    expect(VIDEO_FORMATS).toContain('mp4');
    expect(VIDEO_FORMATS).toContain('webm');
  });

  it('processImage resize should set width/height', () => {
    const result = processImage({ width: 1920, height: 1080, size: 2048 }, 'resize', { width: 800, height: 600 });
    expect(result.output.width).toBe(800);
    expect(result.output.height).toBe(600);
  });

  it('processImage thumbnail should set 150x150', () => {
    const result = processImage({ width: 1920, height: 1080 }, 'thumbnail');
    expect(result.output.width).toBe(150);
    expect(result.output.height).toBe(150);
  });

  it('processImage format should convert format', () => {
    const result = processImage({ width: 1920, height: 1080 }, 'format', { format: 'webp' });
    expect(result.output.format).toBe('webp');
  });

  it('processAudio transcribe should return text', () => {
    const result = processAudio({ duration: 60 }, 'transcribe');
    expect(result.output.text).toBeTruthy();
    expect(result.output.duration).toBe(60);
  });

  it('processVideo thumbnail should extract frames', () => {
    const result = processVideo({ duration: 300 }, 'thumbnail', { count: 3 });
    expect(result.output.frames).toHaveLength(3);
  });

  it('processVideo transcribe should return text', () => {
    const result = processVideo({ duration: 120 }, 'transcribe');
    expect(result.output.text).toBeTruthy();
  });

  it('runOCR should return text with confidence', () => {
    const result = runOCR({ width: 1920, height: 1080 });
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.boundingBoxes).toBeTruthy();
  });
});

// --- HTTP API Tests ---
let server;
describe('Multi-Modal OS HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  it('GET /api/formats', async () => { const r = await httpReq('GET', '/api/formats'); expect(r.status).toBe(200); expect(r.body.image).toContain('jpg'); expect(r.body.audio).toContain('mp3'); });
  it('POST /api/detect image', async () => { const r = await httpReq('POST', '/api/detect', { filename: 'photo.png' }); expect(r.status).toBe(200); expect(r.body.type).toBe('image'); });
  it('POST /api/detect audio', async () => { const r = await httpReq('POST', '/api/detect', { filename: 'song.mp3' }); expect(r.status).toBe(200); expect(r.body.type).toBe('audio'); });
  it('POST /api/detect video', async () => { const r = await httpReq('POST', '/api/detect', { filename: 'video.mp4' }); expect(r.status).toBe(200); expect(r.body.type).toBe('video'); });
  it('POST /api/detect → 400 without filename', async () => { const r = await httpReq('POST', '/api/detect', {}); expect(r.status).toBe(400); });

  it('POST /api/image/process resize', async () => { const r = await httpReq('POST', '/api/image/process', { filename: 'img.jpg', operation: 'resize', params: { width: 800, height: 600 }, metadata: { width: 1920, height: 1080 } }); expect(r.status).toBe(200); expect(r.body.type).toBe('image'); expect(r.body.result.output.width).toBe(800); });
  it('POST /api/image/process → 400 without operation', async () => { const r = await httpReq('POST', '/api/image/process', { filename: 'img.jpg' }); expect(r.status).toBe(400); });
  it('POST /api/image/process thumbnail', async () => { const r = await httpReq('POST', '/api/image/process', { filename: 'img.jpg', operation: 'thumbnail' }); expect(r.status).toBe(200); expect(r.body.result.output.width).toBe(150); });

  it('POST /api/audio/process transcribe', async () => { const r = await httpReq('POST', '/api/audio/process', { filename: 'audio.mp3', operation: 'transcribe', metadata: { duration: 60 } }); expect(r.status).toBe(200); expect(r.body.result.output.text).toBeTruthy(); });
  it('POST /api/audio/process → 400 without operation', async () => { const r = await httpReq('POST', '/api/audio/process', { filename: 'audio.mp3' }); expect(r.status).toBe(400); });

  it('POST /api/video/process transcribe', async () => { const r = await httpReq('POST', '/api/video/process', { filename: 'video.mp4', operation: 'transcribe', metadata: { duration: 300 } }); expect(r.status).toBe(200); expect(r.body.result.output.text).toBeTruthy(); });
  it('POST /api/video/process extract_frames', async () => { const r = await httpReq('POST', '/api/video/process', { filename: 'video.mp4', operation: 'extract_frames', params: { count: 5 } }); expect(r.status).toBe(200); expect(r.body.result.output.frameCount).toBe(5); });

  it('POST /api/ocr', async () => { const r = await httpReq('POST', '/api/ocr', { filename: 'doc.png', metadata: { width: 1920, height: 1080 } }); expect(r.status).toBe(200); expect(r.body.type).toBe('ocr'); expect(r.body.result.text).toBeTruthy(); });

  it('POST /api/transcribe audio', async () => { const r = await httpReq('POST', '/api/transcribe', { filename: 'audio.mp3', mediaType: 'audio', metadata: { duration: 60 } }); expect(r.status).toBe(200); expect(r.body.type).toBe('transcription'); });
  it('POST /api/transcribe video', async () => { const r = await httpReq('POST', '/api/transcribe', { filename: 'video.mp4', mediaType: 'video', metadata: { duration: 300 } }); expect(r.status).toBe(200); });

  it('GET /api/jobs', async () => { const r = await httpReq('GET', '/api/jobs'); expect(r.status).toBe(200); expect(r.body.jobs).toBeTruthy(); });
  it('GET /api/jobs?type=image', async () => { const r = await httpReq('GET', '/api/jobs?type=image'); expect(r.status).toBe(200); expect(r.body.jobs.every(j => j.type === 'image')).toBe(true); });

  it('POST /api/batch', async () => {
    const r = await httpReq('POST', '/api/batch', { tasks: [{ type: 'image', filename: 'a.jpg', operation: 'thumbnail' }, { type: 'audio', filename: 'b.mp3', operation: 'transcribe' }] });
    expect(r.status).toBe(200);
    expect(r.body.taskCount).toBe(2);
    expect(r.body.results).toHaveLength(2);
  });
  it('POST /api/batch → 400 without tasks', async () => { const r = await httpReq('POST', '/api/batch', {}); expect(r.status).toBe(400); });
});
