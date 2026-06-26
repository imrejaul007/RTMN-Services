/**
 * MobileOS - App Store Infrastructure
 *
 * Handles:
 * - iOS Build (Xcode Cloud simulation)
 * - Android Build (Gradle simulation)
 * - Code Signing (Certificates, Provisioning)
 * - Store Submission (App Store, Play Store)
 * - OTA Updates
 * - Crash Reporting
 * - Push Notifications
 * - Release Management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { buildQueue } from './build-queue.js';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.MOBILE_OS_PORT || 4598;

// In-memory stores
const builds = new Map();           // buildId -> build info
const certificates = new Map();    // certId -> certificate
const provisioningProfiles = new Map(); // profileId -> profile
const submissions = new Map();     // submissionId -> submission
const releases = new Map();       // releaseId -> release
const crashReports = new Map();   // crashId -> crash report
const pushNotifications = new Map(); // notifId -> notification

// App statuses
const APP_STATUS = {
  DRAFT: 'draft',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
  REMOVED: 'removed'
};

// Build statuses
const BUILD_STATUS = {
  PENDING: 'pending',
  BUILDING: 'building',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Build types
const BUILD_TYPES = {
  DEBUG: 'debug',
  RELEASE: 'release',
  ADHOC: 'adhoc',
  ENTERPRISE: 'enterprise'
};

/**
 * APP MANAGEMENT
 */

// POST /api/apps - Create app
app.post('/api/apps', (req, res) => {
  const { companyId, name, bundleId, platform, category, description, icon } = req.body;

  if (!companyId || !name || !bundleId || !platform) {
    return res.status(400).json({ error: 'companyId, name, bundleId, and platform are required' });
  }

  const appId = uuidv4();
  const now = new Date();

  const app = {
    id: appId,
    companyId,
    name,
    bundleId,
    platform, // 'ios' | 'android' | 'both'
    category: category || 'Business',
    description: description || '',
    icon: icon || null,
    status: APP_STATUS.DRAFT,
    versions: [],
    builds: [],
    storeIds: {
      ios: null,
      android: null
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  res.status(201).json({
    success: true,
    app: {
      id: appId,
      name,
      bundleId,
      platform,
      status: APP_STATUS.DRAFT
    }
  });
});

// GET /api/apps - List apps
app.get('/api/apps', (req, res) => {
  const { companyId, status, platform } = req.query;

  // Mock apps
  const apps = [
    {
      id: 'app-1',
      companyId: 'company-1',
      name: 'FastBite Delivery',
      bundleId: 'com.fastbite.delivery',
      platform: 'both',
      status: APP_STATUS.PUBLISHED,
      version: '2.1.0',
      storeIds: { ios: '123456789', android: 'com.fastbite.delivery' }
    },
    {
      id: 'app-2',
      companyId: 'company-1',
      name: 'QuickMart Shop',
      bundleId: 'com.quickmart.shop',
      platform: 'both',
      status: APP_STATUS.IN_REVIEW,
      version: '1.0.0'
    },
    {
      id: 'app-3',
      companyId: 'company-2',
      name: 'HealthFirst',
      bundleId: 'com.healthfirst.app',
      platform: 'ios',
      status: APP_STATUS.DRAFT,
      version: '0.1.0'
    }
  ];

  let filtered = apps;
  if (companyId) filtered = filtered.filter(a => a.companyId === companyId);
  if (status) filtered = filtered.filter(a => a.status === status);
  if (platform) filtered = filtered.filter(a => a.platform === platform || a.platform === 'both');

  res.json({
    success: true,
    count: filtered.length,
    apps: filtered
  });
});

// GET /api/apps/:id - Get app details
app.get('/api/apps/:id', (req, res) => {
  res.json({
    success: true,
    app: {
      id: req.params.id,
      name: 'Sample App',
      bundleId: 'com.sample.app',
      platform: 'both',
      status: APP_STATUS.PUBLISHED,
      version: '2.0.0',
      storeIds: { ios: '123456789', android: 'com.sample.app' },
      statistics: {
        downloads: 15000,
        activeUsers: 8500,
        rating: 4.5,
        reviews: 234
      }
    }
  });
});

/**
 * BUILD MANAGEMENT (Real Build Queue)
 */

// POST /api/builds - Queue a new build
app.post('/api/builds', async (req, res) => {
  const {
    appId,
    platform,
    buildType,
    branch,
    commitSha,
    commitMessage,
    configuration,
    priority,
    metadata
  } = req.body;

  if (!appId || !platform) {
    return res.status(400).json({ error: 'appId and platform are required' });
  }

  // Enqueue with real build queue
  const build = await buildQueue.enqueueBuild({
    appId,
    platform,
    branch: branch || 'main',
    commitSha: commitSha || uuidv4().substring(0, 8),
    commitMessage,
    configuration: configuration || 'Release',
    priority: priority || 5,
    metadata: {
      ...metadata,
      buildType: buildType || BUILD_TYPES.RELEASE
    },
    cacheKey: `app-${appId}-${branch}`
  });

  res.status(201).json({
    success: true,
    build: {
      id: build.id,
      status: build.status,
      platform,
      branch: build.branch,
      priority: build.priority,
      queuePosition: buildQueue.listBuilds({ platform, status: 'pending' }).length
    }
  });
});

// GET /api/builds - List builds from queue
app.get('/api/builds', (req, res) => {
  const { appId, platform, status, limit = 50 } = req.query;

  const builds = buildQueue.listBuilds({
    appId,
    platform,
    status
  });

  res.json({
    success: true,
    count: builds.length,
    builds: builds.slice(0, parseInt(limit)).map(b => ({
      id: b.id,
      appId: b.appId,
      platform: b.platform,
      branch: b.branch,
      status: b.status,
      progress: b.progress,
      currentStage: b.currentStage,
      duration: b.duration,
      createdAt: b.createdAt,
      startedAt: b.startedAt,
      completedAt: b.completedAt
    }))
  });
});

// GET /api/builds/:id - Get build details from queue
app.get('/api/builds/:id', (req, res) => {
  const build = buildQueue.getBuild(req.params.id);
  if (!build) {
    return res.status(404).json({ error: 'Build not found' });
  }
  res.json({ success: true, build });
});

// GET /api/builds/:id/logs - Get build logs from queue
app.get('/api/builds/:id/logs', (req, res) => {
  const logs = buildQueue.getBuildLogs(req.params.id);
  if (logs.length === 0) {
    return res.status(404).json({ error: 'Build logs not found' });
  }
  res.json({
    success: true,
    buildId: req.params.id,
    logs
  });
});

// POST /api/builds/:id/cancel - Cancel a build
app.post('/api/builds/:id/cancel', (req, res) => {
  const success = buildQueue.cancelBuild(req.params.id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot cancel build (not pending or running)' });
  }
  res.json({ success: true, message: 'Build cancelled' });
});

// POST /api/builds/:id/retry - Retry a failed build
app.post('/api/builds/:id/retry', async (req, res) => {
  const newBuild = buildQueue.retryBuild(req.params.id);
  if (!newBuild) {
    return res.status(400).json({ error: 'Cannot retry (build not failed)' });
  }
  res.status(201).json({
    success: true,
    build: {
      id: newBuild.id,
      status: newBuild.status,
      priority: newBuild.priority
    }
  });
});

// GET /api/builds/:id/download - Get signed download URL
app.get('/api/builds/:id/download', (req, res) => {
  const { type = 'ipa' } = req.query;
  const artifact = buildQueue.getBuildArtifact(req.params.id, type);

  if (!artifact) {
    return res.status(404).json({ error: 'Build not found or not completed' });
  }

  res.json({
    success: true,
    download: {
      url: artifact.url,
      expiresAt: artifact.expiresAt
    }
  });
});

// GET /api/builds/queue/status - Get queue status
app.get('/api/builds/queue/status', (req, res) => {
  const status = buildQueue.getQueueStatus();
  res.json({ success: true, ...status });
});

/**
 * CERTIFICATES & PROFILES (iOS)
 */

// POST /api/certificates - Upload certificate
app.post('/api/certificates', (req, res) => {
  const { companyId, type, name, file, password } = req.body;

  if (!companyId || !type || !name) {
    return res.status(400).json({ error: 'companyId, type, and name are required' });
  }

  const certId = uuidv4();
  const cert = {
    id: certId,
    companyId,
    type, // 'ios_development' | 'ios_distribution' | 'android'
    name,
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  certificates.set(certId, cert);

  res.status(201).json({
    success: true,
    certificate: {
      id: certId,
      name,
      type,
      status: 'active'
    }
  });
});

// GET /api/certificates - List certificates
app.get('/api/certificates', (req, res) => {
  const { companyId, type } = req.query;

  let certs = Array.from(certificates.values());

  if (companyId) certs = certs.filter(c => c.companyId === companyId);
  if (type) certs = certs.filter(c => c.type === type);

  res.json({
    success: true,
    count: certs.length,
    certificates: certs
  });
});

// DELETE /api/certificates/:id - Revoke certificate
app.delete('/api/certificates/:id', (req, res) => {
  const cert = certificates.get(req.params.id);
  if (!cert) {
    return res.status(404).json({ error: 'Certificate not found' });
  }

  cert.status = 'revoked';
  res.json({ success: true, message: 'Certificate revoked' });
});

/**
 * PROVISIONING PROFILES (iOS)
 */

// POST /api/profiles - Create provisioning profile
app.post('/api/profiles', (req, res) => {
  const { companyId, name, type, appId, certificateId, devices } = req.body;

  if (!companyId || !name || !type || !appId) {
    return res.status(400).json({ error: 'companyId, name, type, and appId are required' });
  }

  const profileId = uuidv4();
  const profile = {
    id: profileId,
    companyId,
    name,
    type, // 'development' | 'distribution' | 'ad_hoc' | 'enterprise'
    appId,
    certificateId,
    devices: devices || [],
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  provisioningProfiles.set(profileId, profile);

  res.status(201).json({
    success: true,
    profile: {
      id: profileId,
      name,
      type,
      status: 'active'
    }
  });
});

// GET /api/profiles - List profiles
app.get('/api/profiles', (req, res) => {
  const { companyId, appId } = req.query;

  let profiles = Array.from(provisioningProfiles.values());

  if (companyId) profiles = profiles.filter(p => p.companyId === companyId);
  if (appId) profiles = profiles.filter(p => p.appId === appId);

  res.json({
    success: true,
    count: profiles.length,
    profiles
  });
});

/**
 * STORE SUBMISSION
 */

// POST /api/submissions - Submit to app store
app.post('/api/submissions', (req, res) => {
  const { appId, platform, buildId, releaseNotes, screenshots, metadata } = req.body;

  if (!appId || !platform) {
    return res.status(400).json({ error: 'appId and platform are required' });
  }

  const submissionId = uuidv4();
  const submission = {
    id: submissionId,
    appId,
    platform,
    buildId,
    status: 'pending_review',
    releaseNotes: releaseNotes || {},
    screenshots: screenshots || {},
    metadata: metadata || {},
    reviewInfo: {
      firstSubmittedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      reviewDuration: null
    },
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  submissions.set(submissionId, submission);

  // Simulate review process
  simulateReview(submissionId);

  res.status(201).json({
    success: true,
    submission: {
      id: submissionId,
      status: 'pending_review',
      platform
    }
  });
});

// GET /api/submissions - List submissions
app.get('/api/submissions', (req, res) => {
  const { appId, platform, status } = req.query;

  let subs = Array.from(submissions.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (appId) subs = subs.filter(s => s.appId === appId);
  if (platform) subs = subs.filter(s => s.platform === platform);
  if (status) subs = subs.filter(s => s.status === status);

  res.json({
    success: true,
    count: subs.length,
    submissions: subs
  });
});

// GET /api/submissions/:id - Get submission details
app.get('/api/submissions/:id', (req, res) => {
  const submission = submissions.get(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  res.json({ success: true, submission });
});

// POST /api/submissions/:id/cancel - Cancel submission
app.post('/api/submissions/:id/cancel', (req, res) => {
  const submission = submissions.get(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (submission.status === 'pending_review') {
    submission.status = 'cancelled';
    submission.completedAt = new Date().toISOString();
  }

  res.json({ success: true, submission });
});

/**
 * RELEASES
 */

// POST /api/releases - Create release
app.post('/api/releases', (req, res) => {
  const { appId, version, platform, buildId, releaseType, mandatory, rolloutPercentage } = req.body;

  if (!appId || !version || !platform) {
    return res.status(400).json({ error: 'appId, version, and platform are required' });
  }

  const releaseId = uuidv4();
  const release = {
    id: releaseId,
    appId,
    version,
    platform,
    buildId,
    releaseType: releaseType || 'gradual', // 'immediate' | 'gradual' | 'holdback'
    mandatory: mandatory || false,
    rolloutPercentage: rolloutPercentage || 100,
    status: 'draft',
    stores: {
      appStore: false,
      playStore: false
    },
    stats: {
      installs: 0,
      updates: 0,
      rollbacks: 0
    },
    createdAt: new Date().toISOString(),
    publishedAt: null
  };

  releases.set(releaseId, release);

  res.status(201).json({
    success: true,
    release: {
      id: releaseId,
      version,
      platform,
      status: 'draft'
    }
  });
});

// GET /api/releases - List releases
app.get('/api/releases', (req, res) => {
  const { appId, platform, status } = req.query;

  let rels = Array.from(releases.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (appId) rels = rels.filter(r => r.appId === appId);
  if (platform) rels = rels.filter(r => r.platform === platform);
  if (status) rels = rels.filter(r => r.status === status);

  res.json({
    success: true,
    count: rels.length,
    releases: rels
  });
});

// POST /api/releases/:id/publish - Publish release
app.post('/api/releases/:id/publish', (req, res) => {
  const release = releases.get(req.params.id);
  if (!release) {
    return res.status(404).json({ error: 'Release not found' });
  }

  release.status = 'published';
  release.publishedAt = new Date().toISOString();

  // Update app version
  // Would update the app record here

  res.json({
    success: true,
    release
  });
});

// POST /api/releases/:id/rollback - Rollback release
app.post('/api/releases/:id/rollback', (req, res) => {
  const release = releases.get(req.params.id);
  if (!release) {
    return res.status(404).json({ error: 'Release not found' });
  }

  release.status = 'rolled_back';
  release.rollbacks++;

  res.json({
    success: true,
    release
  });
});

/**
 * OTA UPDATES (CodePush style)
 */

// POST /api/ota/deploy - Deploy OTA update
app.post('/api/ota/deploy', (req, res) => {
  const { appId, version, platform, bundleUrl, description, mandatory } = req.body;

  if (!appId || !version || !platform || !bundleUrl) {
    return res.status(400).json({ error: 'appId, version, platform, and bundleUrl are required' });
  }

  const deployId = uuidv4();

  res.status(201).json({
    success: true,
    deployment: {
      id: deployId,
      appId,
      version,
      platform,
      status: 'deployed',
      deployedAt: new Date().toISOString()
    }
  });
});

// GET /api/ota/check - Check for updates
app.get('/api/ota/check', (req, res) => {
  const { appId, version, platform } = req.query;

  // Simulate update check
  const hasUpdate = Math.random() > 0.7;

  if (hasUpdate) {
    res.json({
      success: true,
      update: {
        available: true,
        version: incrementVersion(version),
        description: 'Performance improvements and bug fixes',
        mandatory: false,
        downloadUrl: `https://cdn.hojai.app/ota/${appId}/${platform}/latest.bundle`,
        size: 2450000
      }
    });
  } else {
    res.json({
      success: true,
      update: {
        available: false
      }
    });
  }
});

/**
 * CRASH REPORTING
 */

// POST /api/crashes - Report crash
app.post('/api/crashes', (req, res) => {
  const { appId, platform, version, crashType, stackTrace, deviceInfo, metadata } = req.body;

  if (!appId || !platform || !crashType) {
    return res.status(400).json({ error: 'appId, platform, and crashType are required' });
  }

  const crashId = uuidv4();
  const crash = {
    id: crashId,
    appId,
    platform,
    version,
    crashType,
    stackTrace,
    deviceInfo: deviceInfo || {},
    metadata: metadata || {},
    status: 'new',
    occurrences: 1,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  };

  crashReports.set(crashId, crash);

  res.status(201).json({
    success: true,
    crashId
  });
});

// GET /api/crashes - List crashes
app.get('/api/crashes', (req, res) => {
  const { appId, platform, status, limit = 50 } = req.query;

  let crashes = Array.from(crashReports.values())
    .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));

  if (appId) crashes = crashes.filter(c => c.appId === appId);
  if (platform) crashes = crashes.filter(c => c.platform === platform);
  if (status) crashes = crashes.filter(c => c.status === status);

  res.json({
    success: true,
    count: crashes.length,
    crashes: crashes.slice(0, parseInt(limit)).map(c => ({
      id: c.id,
      appId: c.appId,
      platform: c.platform,
      crashType: c.crashType,
      status: c.status,
      occurrences: c.occurrences,
      lastSeenAt: c.lastSeenAt
    }))
  });
});

// GET /api/crashes/:id - Get crash details
app.get('/api/crashes/:id', (req, res) => {
  const crash = crashReports.get(req.params.id);
  if (!crash) {
    return res.status(404).json({ error: 'Crash not found' });
  }
  res.json({ success: true, crash });
});

// POST /api/crashes/:id/resolve - Mark crash as resolved
app.post('/api/crashes/:id/resolve', (req, res) => {
  const crash = crashReports.get(req.params.id);
  if (!crash) {
    return res.status(404).json({ error: 'Crash not found' });
  }

  crash.status = 'resolved';
  crash.resolvedAt = new Date().toISOString();

  res.json({ success: true, crash });
});

/**
 * PUSH NOTIFICATIONS
 */

// POST /api/notifications/send - Send push notification
app.post('/api/notifications/send', (req, res) => {
  const { appId, platform, title, body, data, target } = req.body;

  if (!appId || !title || !body) {
    return res.status(400).json({ error: 'appId, title, and body are required' });
  }

  const notifId = uuidv4();
  const notification = {
    id: notifId,
    appId,
    platform: platform || 'both',
    title,
    body,
    data: data || {},
    target: target || 'all', // 'all' | 'segment' | 'specific'
    status: 'sent',
    sentAt: new Date().toISOString(),
    stats: {
      sent: 10000,
      delivered: 9850,
      opened: 2340,
      failed: 150
    }
  };

  pushNotifications.set(notifId, notification);

  res.status(201).json({
    success: true,
    notification: {
      id: notifId,
      status: 'sent',
      stats: notification.stats
    }
  });
});

// GET /api/notifications - List notifications
app.get('/api/notifications', (req, res) => {
  const { appId, limit = 20 } = req.query;

  let notifs = Array.from(pushNotifications.values())
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  if (appId) notifs = notifs.filter(n => n.appId === appId);

  res.json({
    success: true,
    count: notifs.length,
    notifications: notifs.slice(0, parseInt(limit))
  });
});

/**
 * ANALYTICS
 */

// GET /api/analytics - App analytics
app.get('/api/analytics', (req, res) => {
  const { appId, period = '30d' } = req.query;

  res.json({
    success: true,
    period,
    analytics: {
      downloads: {
        total: 45000,
        thisWeek: 3200,
        thisMonth: 12500
      },
      activeUsers: {
        daily: 8500,
        weekly: 15000,
        monthly: 32000
      },
      retention: {
        day1: 45,
        day7: 28,
        day30: 18
      },
      crashes: {
        total: 23,
        resolved: 18,
        uniqueUsers: 156
      },
      ratings: {
        average: 4.5,
        count: 234,
        distribution: {
          5: 120,
          4: 67,
          3: 28,
          2: 12,
          1: 7
        }
      },
      revenue: {
        total: 125000,
        thisMonth: 35000
      }
    }
  });
});

/**
 * HELPER FUNCTIONS
 */

function simulateBuild(buildId) {
  const build = builds.get(buildId);
  if (!build) return;

  build.status = BUILD_STATUS.BUILDING;
  build.progress = 0;
  build.logs.push({ level: 'info', message: 'Build started', timestamp: new Date().toISOString() });

  // Simulate build stages
  const stages = [
    { name: 'Preparing build environment', duration: 2000 },
    { name: 'Installing dependencies', duration: 5000 },
    { name: 'Compiling source code', duration: 15000 },
    { name: 'Linking resources', duration: 3000 },
    { name: 'Optimizing', duration: 5000 },
    { name: 'Signing', duration: 3000 },
    { name: 'Packaging', duration: 4000 }
  ];

  let totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
  let elapsed = 0;

  for (const stage of stages) {
    setTimeout(() => {
      const b = builds.get(buildId);
      if (!b || b.status === BUILD_STATUS.CANCELLED) return;

      elapsed += stage.duration;
      b.progress = Math.round((elapsed / totalDuration) * 100);
      b.logs.push({ level: 'info', message: stage.name, timestamp: new Date().toISOString() });

      if (stage === stages[stages.length - 1]) {
        b.status = BUILD_STATUS.SUCCEEDED;
        b.completedAt = new Date().toISOString();
        b.duration = elapsed;

        // Generate artifact
        if (build.platform === 'ios' || build.platform === 'both') {
          b.artifacts.ipa = {
            url: `https://cdn.hojai.app/builds/${buildId}/app.ipa`,
            size: Math.floor(Math.random() * 50000000) + 10000000,
            checksum: 'abc123def456'
          };
        }
        if (build.platform === 'android' || build.platform === 'both') {
          b.artifacts.aab = {
            url: `https://cdn.hojai.app/builds/${buildId}/app.aab`,
            size: Math.floor(Math.random() * 30000000) + 5000000,
            checksum: 'xyz789ghi012'
          };
          b.artifacts.apk = {
            url: `https://cdn.hojai.app/builds/${buildId}/app.apk`,
            size: Math.floor(Math.random() * 25000000) + 5000000,
            checksum: 'mno345pqr678'
          };
        }

        b.logs.push({ level: 'info', message: 'Build completed successfully', timestamp: new Date().toISOString() });
      }
    }, elapsed);
  }
}

function simulateReview(submissionId) {
  const submission = submissions.get(submissionId);
  if (!submission) return;

  setTimeout(() => {
    const s = submissions.get(submissionId);
    if (!s) return;

    s.status = 'in_review';
    s.reviewInfo.lastUpdatedAt = new Date().toISOString();
  }, 5000);

  setTimeout(() => {
    const s = submissions.get(submissionId);
    if (!s || s.status === 'cancelled') return;

    // 90% approval rate
    if (Math.random() > 0.1) {
      s.status = 'approved';
      s.reviewInfo.reviewDuration = Math.floor(Math.random() * 48) + 2; // 2-48 hours
      s.completedAt = new Date().toISOString();
    } else {
      s.status = 'rejected';
      s.reviewInfo.rejectionReason = 'Minor metadata improvements needed';
      s.completedAt = new Date().toISOString();
    }
    s.reviewInfo.lastUpdatedAt = new Date().toISOString();
  }, 20000);
}

function incrementVersion(version) {
  const parts = version.split('.');
  parts[2] = parseInt(parts[2]) + 1;
  return parts.join('.');
}

// Health check
app.get('/health', (req, res) => {
  const queueStatus = buildQueue.getQueueStatus();

  res.json({
    service: 'mobile-os',
    status: 'healthy',
    version: '2.0.0',
    stats: {
      apps: 0, // In production, count from DB
      builds: builds.size,
      certificates: certificates.size,
      provisioningProfiles: provisioningProfiles.size,
      submissions: submissions.size,
      releases: releases.size,
      crashReports: crashReports.size,
      notifications: pushNotifications.size
    },
    queue: queueStatus
  });
});

/**
 * CODEMAGIC INTEGRATION
 * Real CI/CD for iOS, Android, React Native
 */

const CODEMAGIC_API = 'https://api.codemagic.io/v1';

// Codemagic configuration store
const codemagicApps = new Map();

// POST /api/codemagic/apps - Register app with Codemagic
app.post('/api/codemagic/apps', async (req, res) => {
  const { appId, platform, repoUrl, branch } = req.body;

  if (!appId || !platform || !repoUrl) {
    return res.status(400).json({ error: 'appId, platform, and repoUrl are required' });
  }

  const appKey = `${appId}-${platform}`;

  try {
    // In production, call Codemagic API
    // POST /apps
    const codemagicApp = {
      appId,
      platform,
      repoUrl,
      branch: branch || 'main',
      codemagicAppId: uuidv4(), // Would be returned from Codemagic
      status: 'registered',
      workflows: getDefaultWorkflows(platform),
      createdAt: new Date().toISOString()
    };

    codemagicApps.set(appKey, codemagicApp);

    res.status(201).json({
      success: true,
      app: codemagicApp,
      message: 'App registered with Codemagic'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to register with Codemagic', details: error.message });
  }
});

// GET /api/codemagic/apps/:id - Get Codemagic app status
app.get('/api/codemagic/apps/:appId', (req, res) => {
  const appKey = Array.from(codemagicApps.keys()).find(k => k.startsWith(req.params.appId));
  const app = appKey ? codemagicApps.get(appKey) : null;

  if (!app) {
    return res.status(404).json({ error: 'Codemagic app not found' });
  }

  res.json({ success: true, app });
});

// POST /api/codemagic/builds - Trigger Codemagic build
app.post('/api/codemagic/builds', async (req, res) => {
  const { appId, platform, branch, workflowId } = req.body;

  if (!appId || !platform) {
    return res.status(400).json({ error: 'appId and platform are required' });
  }

  const appKey = `${appId}-${platform}`;
  const codemagicApp = codemagicApps.get(appKey);

  if (!codemagicApp) {
    return res.status(404).json({ error: 'Codemagic app not registered' });
  }

  try {
    // In production, call Codemagic API
    // POST /builds
    const buildId = uuidv4();

    const build = {
      id: buildId,
      appId,
      platform,
      branch: branch || codemagicApp.branch,
      workflowId: workflowId || codemagicApp.workflows[0]?.id,
      status: 'preparing',
      createdAt: new Date().toISOString()
    };

    // Enqueue local build as well
    await buildQueue.enqueueBuild({
      appId,
      platform,
      branch: build.branch,
      commitSha: uuidv4().substring(0, 8),
      metadata: {
        codemagicBuildId: buildId,
        source: 'codemagic'
      }
    });

    res.status(201).json({
      success: true,
      build,
      message: 'Build triggered on Codemagic'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger build', details: error.message });
  }
});

// GET /api/codemagic/builds - List Codemagic builds
app.get('/api/codemagic/builds', (req, res) => {
  const { appId, platform, status } = req.query;

  // Get local builds with codemagic source
  const builds = buildQueue.listBuilds({ appId, platform })
    .filter(b => b.metadata?.source === 'codemagic');

  if (status) {
    // Map Codemagic status to local status
    const statusMap = {
      'success': 'success',
      'failed': 'failed',
      'running': 'running',
      'pending': 'pending',
      'canceled': 'cancelled'
    };
  }

  res.json({
    success: true,
    count: builds.length,
    builds
  });
});

// POST /api/codemagic/workflows/generate - Generate workflow config
app.post('/api/codemagic/workflows/generate', (req, res) => {
  const { platform, appName, bundleId, signing } = req.body;

  if (!platform || !appName) {
    return res.status(400).json({ error: 'platform and appName are required' });
  }

  let workflow;

  if (platform === 'ios') {
    workflow = generateIOSWorkflow(appName, bundleId, signing);
  } else if (platform === 'android') {
    workflow = generateAndroidWorkflow(appName, signing);
  } else if (platform === 'react-native') {
    workflow = generateReactNativeWorkflow(appName, signing);
  } else {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  res.json({
    success: true,
    workflow: {
      platform,
      appName,
      codemagicYaml: workflow.codemagicYaml,
      githubActions: workflow.githubActions,
      gitlabCi: workflow.gitlabCi
    }
  });
});

// GET /api/codemagic/webhooks - Get webhook URL for Git integration
app.get('/api/codemagic/webhooks/:appId', (req, res) => {
  const { appId } = req.params;

  // In production, get from Codemagic API
  const webhookUrl = `https://api.codemagic.io/webhooks/github/${appId}`;

  res.json({
    success: true,
    webhookUrl,
    instructions: 'Add this webhook URL to your Git repository settings'
  });
});

/**
 * HELPERS
 */

function getDefaultWorkflows(platform) {
  if (platform === 'ios') {
    return [
      { id: 'ios-release', name: 'iOS Release', trigger: 'push' },
      { id: 'ios-beta', name: 'iOS Beta', trigger: 'pull_request' }
    ];
  }
  if (platform === 'android') {
    return [
      { id: 'android-release', name: 'Android Release', trigger: 'push' },
      { id: 'android-beta', name: 'Android Beta', trigger: 'pull_request' }
    ];
  }
  return [{ id: 'default', name: 'Default', trigger: 'push' }];
}

function generateIOSWorkflow(appName, bundleId, signing) {
  return {
    codemagicYaml: `workflows:
  ios-release:
    name: ${appName} iOS Release
    max_build_duration: 120
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_id: ${bundleId}
      xcode: latest
      cocoapods: default
    scripts:
      - name: Set up code signing
        script: |
          keychain initialize
          app-store-connect fetch-signing-files "$APP_STORE_ID" --type IOS_APP_STORE --create
          xcode-distribute
      - name: Build
        script: |
          xcodebuild build \\
            -workspace ios/${appName}.xcworkspace \\
            -scheme ${appName} \\
            -configuration Release \\
            CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log`,
    githubActions: `.github/workflows/ios.yml`,
    gitlabCi: `.gitlab-ci.yml (iOS section)`
  };
}

function generateAndroidWorkflow(appName, signing) {
  return {
    codemagicYaml: `workflows:
  android-release:
    name: ${appName} Android Release
    max_build_duration: 60
    environment:
      java: 17
    scripts:
      - name: Build
        script: |
          ./gradlew assembleRelease
      - name: Build AAB
        script: |
          ./gradlew bundleRelease
    artifacts:
      - app/build/outputs/**/*.apk
      - app/build/outputs/**/*.aab`,
    githubActions: `.github/workflows/android.yml`,
    gitlabCi: `.gitlab-ci.yml (Android section)`
  };
}

function generateReactNativeWorkflow(appName, signing) {
  return {
    codemagicYaml: `workflows:
  rn-ios:
    name: ${appName} iOS
    max_build_duration: 60
    environment:
      node: 18
      xcode: latest
    scripts:
      - name: Install dependencies
        script: |
          npm install
          cd ios && pod install
      - name: Build iOS
        script: |
          xcodebuild build -workspace ios/${appName}.xcworkspace -scheme ${appName} -configuration Release
      - name: Build Android
        script: |
          cd android && ./gradlew assembleRelease
    artifacts:
      - ios/build/**/*.ipa
      - android/app/build/outputs/**/*.apk`,
    githubActions: `.github/workflows/react-native.yml`,
    gitlabCi: `.gitlab-ci.yml (React Native section)`
  };
}

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  MobileOS — PORT ${PORT}                              ║
║  App Store Infrastructure                      ║
╠══════════════════════════════════════════════════════╣
║  Builds: ${builds.size.toString().padEnd(43)}║
║  Certificates: ${certificates.size.toString().padEnd(36)}║
║  Profiles: ${provisioningProfiles.size.toString().padEnd(40)}║
║  Submissions: ${submissions.size.toString().padEnd(38)}║
║  Releases: ${releases.size.toString().padEnd(41)}║
║  Crashes: ${crashReports.size.toString().padEnd(42)}║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
