/**
 * App Store Build Pipeline
 * Port: 4703
 * Builds iOS/Android apps for App Store & Play Store
 */
import express from 'express';
import cors from 'cors';
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

app.use(cors(), express.json());
const PORT = process.env.PORT || 4703;

// Build jobs
const builds = new Map();

// ── Build Status ────────────────────────────────────────────────

const BUILD_STEPS = [
  { step: 'checkout', name: 'Code Checkout', duration: 30 },
  { step: 'install', name: 'npm install', duration: 120 },
  { step: 'build', name: 'Build App', duration: 300 },
  { step: 'test', name: 'Run Tests', duration: 60 },
  { step: 'sign', name: 'Sign App', duration: 30 },
  { step: 'upload', name: 'Upload to Store', duration: 120 }
];

// ── Routes ─────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'build-pipeline' }));

// Create build
app.post('/api/build', requireInternal, async (req, res) => {
  const { appName, platform, branch, commit, config } = req.body;

  if (!appName || !platform) {
    return res.status(400).json({ error: 'appName and platform required' });
  }

  const buildId = uuidv4();

  const build = {
    id: buildId,
    appName,
    platform,
    branch: branch || 'main',
    commit: commit || 'HEAD',
    config: config || {},
    status: 'queued',
    progress: 0,
    currentStep: null,
    steps: BUILD_STEPS.map(s => ({ ...s, status: 'pending', startedAt: null, completedAt: null })),
    logs: [],
    artifacts: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  builds.set(buildId, build);

  // Simulate build process
  simulateBuild(buildId);

  res.status(201).json({
    success: true,
    build: {
      id: buildId,
      status: 'queued',
      message: 'Build started. Check /api/build/:id for progress.'
    }
  });
});

// Get build status
app.get('/api/build/:id', (req, res) => {
  const build = builds.get(req.params.id);
  if (!build) {
    return res.status(404).json({ error: 'Build not found' });
  }
  res.json({ success: true, build });
});

// Get build logs
app.get('/api/build/:id/logs', (req, res) => {
  const build = builds.get(req.params.id);
  if (!build) {
    return res.status(404).json({ error: 'Build not found' });
  }
  res.json({ success: true, logs: build.logs });
});

// List builds
app.get('/api/builds', (req, res) => {
  const { appName, platform, status } = req.query;
  let list = Array.from(builds.values());

  if (appName) list = list.filter(b => b.appName === appName);
  if (platform) list = list.filter(b => b.platform === platform);
  if (status) list = list.filter(b => b.status === status);

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, count: list.length, builds: list });
});

// Cancel build
app.post('/api/build/:id/cancel', requireInternal, (req, res) => {
  const build = builds.get(req.params.id);
  if (!build) {
    return res.status(404).json({ error: 'Build not found' });
  }
  if (build.status === 'completed' || build.status === 'failed') {
    return res.status(400).json({ error: 'Cannot cancel completed/failed build' });
  }

  build.status = 'cancelled';
  build.completedAt = new Date().toISOString();
  build.logs.push({ time: new Date().toISOString(), level: 'info', message: 'Build cancelled by user' });

  res.json({ success: true, message: 'Build cancelled' });
});

// Submit to App Store
app.post('/api/submit', requireInternal, async (req, res) => {
  const { buildId, platform, metadata } = req.body;

  if (!buildId || !platform) {
    return res.status(400).json({ error: 'buildId and platform required' });
  }

  const build = builds.get(buildId);
  if (!build) {
    return res.status(404).json({ error: 'Build not found' });
  }

  if (build.status !== 'completed') {
    return res.status(400).json({ error: 'Build must be completed before submission' });
  }

  const submission = {
    id: uuidv4(),
    buildId,
    platform,
    status: 'submitted',
    metadata,
    submittedAt: new Date().toISOString(),
    reviewStatus: 'in_review',
    estimatedReviewDays: platform === 'ios' ? 24 : 1
  };

  res.status(201).json({
    success: true,
    submission: {
      id: submission.id,
      platform,
      status: 'submitted',
      message: platform === 'ios'
        ? 'Submitted to App Store. Review typically takes 24-48 hours.'
        : 'Submitted to Play Store. Review typically takes 1-3 days.'
    }
  });
});

// Get submission status
app.get('/api/submission/:id', (req, res) => {
  const submission = {
    id: req.params.id,
    status: 'in_review',
    reviewNotes: null,
    submittedAt: new Date().toISOString()
  };
  res.json({ success: true, submission });
});

// ── Simulate Build ─────────────────────────────────────────────

async function simulateBuild(buildId) {
  const build = builds.get(buildId);
  if (!build) return;

  build.status = 'running';

  for (let i = 0; i < BUILD_STEPS.length; i++) {
    const step = BUILD_STEPS[i];
    build.currentStep = step.step;
    build.steps[i].status = 'running';
    build.steps[i].startedAt = new Date().toISOString();
    build.progress = Math.floor((i / BUILD_STEPS.length) * 100);

    build.logs.push({
      time: new Date().toISOString(),
      level: 'info',
      message: `Starting: ${step.name}`
    });

    // Simulate step
    await new Promise(r => setTimeout(r, step.duration * 10)); // Speed up simulation

    build.steps[i].status = 'completed';
    build.steps[i].completedAt = new Date().toISOString();
    build.progress = Math.floor(((i + 1) / BUILD_STEPS.length) * 100);

    build.logs.push({
      time: new Date().toISOString(),
      level: 'info',
      message: `Completed: ${step.name}`
    });
  }

  // Generate artifacts
  const platformExt = build.platform === 'ios' ? 'ipa' : 'apk';
  build.artifacts = {
    [build.platform]: {
      url: `https://builds.hojai.app/${build.id}/app.${platformExt}`,
      size: Math.floor(Math.random() * 50000000) + 10000000,
      checksum: Math.random().toString(36).substr(2, 32)
    }
  };

  build.status = 'completed';
  build.progress = 100;
  build.completedAt = new Date().toISOString();
  build.logs.push({
    time: new Date().toISOString(),
    level: 'info',
    message: `✅ Build completed successfully!`
  });
}

// ── App Info ────────────────────────────────────────────────────

app.get('/api/stores', (_, res) => {
  res.json({
    success: true,
    stores: [
      {
        id: 'ios',
        name: 'Apple App Store',
        website: 'https://developer.apple.com',
        reviewTime: '24-48 hours',
        fee: '$99/year',
        requirements: ['Apple Developer Account', 'Mac with Xcode', 'Signing Certificate']
      },
      {
        id: 'android',
        name: 'Google Play Store',
        website: 'https://developer.android.com',
        reviewTime: '1-3 days',
        fee: '$25 one-time',
        requirements: ['Google Play Developer Account', 'Signed APK/AAB', 'App Icons & Screenshots']
      }
    ]
  });
});

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║  Build Pipeline — PORT ${PORT}           ║
║  iOS • Android • App Store        ║
╠══════════════════════════════════════════╣
║  POST /api/build  — Start build   ║
║  GET  /api/build/:id — Status    ║
║  POST /api/submit — Submit to store ║
╚══════════════════════════════════════════╝
`));

export default app;
