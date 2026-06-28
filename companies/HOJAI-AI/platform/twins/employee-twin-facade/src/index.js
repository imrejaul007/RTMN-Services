/**
 * Employee Twin Facade
 *
 * Single unified API that ties together all twin services.
 * This is the main entry point for employee twin operations.
 *
 * Port: 4739
 *
 * Services Integrated:
 * - Twin Learning OS (4735) - Twin context and learning
 * - Twin Feedback OS (4736) - Human corrections
 * - Twin Execution OS (4737) - Task execution
 * - CorpPerks Backend (4006) - HRMS data
 * - Twin Learning Bridge (4748) - CorpPerks events
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

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

const PORT = process.env.PORT || 4739;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================================
// SERVICE CONNECTIONS
// ============================================================

const SERVICES = {
  // Core Twin Services
  twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735',
  twinFeedbackOS: process.env.TWIN_FEEDBACK_OS_URL || 'http://localhost:4736',
  twinExecutionOS: process.env.TWIN_EXECUTION_OS_URL || 'http://localhost:4737',
  twinLearningBridge: process.env.TWIN_LEARNING_BRIDGE_URL || 'http://localhost:4748',

  // CorpPerks
  corpPerksBackend: process.env.CORPPERKS_BACKEND_URL || 'http://localhost:4006',

  // Existing TwinOS
  employeeTwin: process.env.EMPLOYEE_TWIN_URL || 'http://localhost:4730',
  memoryOS: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  twinMemoryBridge: process.env.TWIN_MEMORY_BRIDGE_URL || 'http://localhost:4704',
  salarOS: process.env.SALAR_OS_URL || 'http://localhost:4710',
  skillOS: process.env.SKILL_OS_URL || 'http://localhost:4743',
  flowOrchestrator: process.env.FLOW_ORCHESTRATOR_URL || 'http://localhost:4244',
  decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
  sadaOS: process.env.SADA_OS_URL || 'http://localhost:4190',
};

// ============================================================
// HTTP HELPERS
// ============================================================

async function callService(service, path, options = {}) {
  const url = `${SERVICES[service]}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error(`[Facade] Failed to call ${service}${path}:`, error.message);
    return null;
  }
}

async function callAllServices(requests) {
  const results = await Promise.allSettled(
    requests.map(({ service, path, key }) =>
      callService(service, path).then(data => ({ key, data }))
    )
  );

  return results.reduce((acc, r) => {
    if (r.status === 'fulfilled' && r.value?.data) {
      acc[r.value.key] = r.value.data;
    }
    return acc;
  }, {});
}

// ============================================================
// MAIN API: GET COMPLETE EMPLOYEE TWIN
// ============================================================

/**
 * Get complete employee twin with all 9 types
 * This is the main unified endpoint
 */
async function getEmployeeTwin(employeeId) {
  console.log(`[Facade] Getting complete twin for ${employeeId}`);

  // Fetch from all services in parallel
  const [twinContext, feedbackHistory, taskQueue, employeeData, skillProfiles, trustScore] = await Promise.all([
    callService('twinLearningOS', `/api/twin/${employeeId}`),
    callService('twinFeedbackOS', `/api/feedback/${employeeId}`),
    callService('twinExecutionOS', `/api/queue/${employeeId}`),
    callService('corpPerksBackend', `/api/employees/${employeeId}`),
    callService('salarOS', `/api/human-twin/${employeeId}`),
    callService('sadaOS', `/api/trust/${employeeId}`),
  ]);

  // Build complete response
  return {
    employeeId,
    timestamp: new Date().toISOString(),

    // Basic info from CorpPerks
    profile: employeeData?.data || null,

    // All 9 twin types
    twins: twinContext?.data?.twins || {},

    // Twin health
    health: twinContext?.data?.health || {
      coverage: 0,
      score: 0,
      level: 'new',
    },

    // Skills from Salar OS
    skills: skillProfiles?.data || { capabilities: [] },

    // Trust/reputation from SADA OS
    reputation: trustScore?.data || { trustScore: 0 },

    // Feedback history
    feedback: {
      total: feedbackHistory?.data?.totalFeedback || 0,
      recent: feedbackHistory?.data?.recent || [],
      confidence: feedbackHistory?.data || null,
    },

    // Task queue
    tasks: {
      pending: taskQueue?.data?.byStatus?.pending || 0,
      approved: taskQueue?.data?.byStatus?.approved || 0,
      completed: taskQueue?.data?.byStatus?.completed || 0,
      failed: taskQueue?.data?.byStatus?.failed || 0,
      total: taskQueue?.data?.total || 0,
    },

    // Summary
    summary: {
      name: employeeData?.data?.firstName ? `${employeeData.data.firstName} ${employeeData.data.lastName || ''}` : 'Unknown',
      department: employeeData?.data?.department || 'Unknown',
      twinLevel: twinContext?.data?.health?.level || 'new',
      twinScore: twinContext?.data?.health?.score || 0,
      automationReady: twinContext?.data?.health?.score >= 70,
    },
  };
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'employee-twin-facade',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    integratedServices: Object.keys(SERVICES).length,
  });
});

// GET complete employee twin (MAIN ENDPOINT)
app.get('/api/employee/:employeeId/twin', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const twin = await getEmployeeTwin(employeeId);

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    console.error('[Facade] Error getting employee twin:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET twin health
app.get('/api/employee/:employeeId/twin/health', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const health = await callService('twinLearningOS', `/api/health/${employeeId}`);

    res.json({
      success: true,
      data: health?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET specific twin type
app.get('/api/employee/:employeeId/twin/:twinType', async (req, res) => {
  try {
    const { employeeId, twinType } = req.params;
    const data = await callService('twinLearningOS', `/api/twin/${employeeId}/${twinType}`);

    res.json({
      success: true,
      data: data?.data,
      twinType,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET feedback history
app.get('/api/employee/:employeeId/feedback', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const feedback = await callService('twinFeedbackOS', `/api/feedback/${employeeId}`);

    res.json({
      success: true,
      data: feedback?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET feedback patterns
app.get('/api/employee/:employeeId/patterns', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const patterns = await callService('twinFeedbackOS', `/api/patterns/${employeeId}`);

    res.json({
      success: true,
      data: patterns?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET confidence scores
app.get('/api/employee/:employeeId/confidence', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const confidence = await callService('twinFeedbackOS', `/api/confidence/${employeeId}`);

    res.json({
      success: true,
      data: confidence?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET task queue
app.get('/api/employee/:employeeId/tasks', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status } = req.query;
    const tasks = await callService('twinExecutionOS', `/api/queue/${employeeId}${status ? `?status=${status}` : ''}`);

    res.json({
      success: true,
      data: tasks?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET task by ID
app.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const task = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}`);

    res.json({
      success: true,
      data: task?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET execution history
app.get('/api/employee/:employeeId/history', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { days = 7 } = req.query;
    const history = await callService('twinExecutionOS', `/api/history/${employeeId}?days=${days}`);

    res.json({
      success: true,
      data: history?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET tool permissions
app.get('/api/employee/:employeeId/permissions', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const permissions = await callService('twinExecutionOS', `/api/permissions/${employeeId}`);

    res.json({
      success: true,
      data: permissions?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET skills
app.get('/api/employee/:employeeId/skills', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const skills = await callService('salarOS', `/api/human-twin/${employeeId}`);

    res.json({
      success: true,
      data: skills?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET RLHF training data
app.get('/api/employee/:employeeId/rlhf', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const rlhf = await callService('twinFeedbackOS', `/api/rlhf/${employeeId}`);

    res.json({
      success: true,
      data: rlhf?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// MUTATION ENDPOINTS
// ============================================================

// Submit feedback
app.post('/api/feedback', requireInternal, async (req, res) => {
  try {
    const feedback = await callService('twinFeedbackOS', '/api/feedback', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    res.json({
      success: true,
      data: feedback?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Learn from events
app.post('/api/employee/:employeeId/learn', requireInternal, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { events } = req.body;

    const result = await callService('twinLearningOS', `/api/twin/${employeeId}/learn`, {
      method: 'POST',
      body: JSON.stringify({ events }),
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Observe event
app.post('/api/observe', requireInternal, async (req, res) => {
  try {
    const { employeeId, event } = req.body;
    const result = await callService('twinLearningOS', '/api/observe', {
      method: 'POST',
      body: JSON.stringify({ employeeId, event }),
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create task
app.post('/api/tasks', requireInternal, async (req, res) => {
  try {
    const task = await callService('twinExecutionOS', '/api/tasks', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    res.json({
      success: true,
      data: task?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve task
app.post('/api/tasks/:taskId/approve', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}/approve`, {
      method: 'POST',
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject task
app.post('/api/tasks/:taskId/reject', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel task
app.post('/api/tasks/:taskId/cancel', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}/cancel`, {
      method: 'POST',
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retry task
app.post('/api/tasks/:taskId/retry', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}/retry`, {
      method: 'POST',
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rollback task
app.post('/api/tasks/:taskId/rollback', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/tasks/${req.params.taskId}/rollback`, {
      method: 'POST',
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update permissions
app.patch('/api/employee/:employeeId/permissions', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinExecutionOS', `/api/permissions/${req.params.employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(req.body),
    });

    res.json({
      success: true,
      data: result?.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emit CorpPerks event
app.post('/api/events', requireInternal, async (req, res) => {
  try {
    const result = await callService('twinLearningBridge', '/api/events', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List integrated services
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    data: {
      count: Object.keys(SERVICES).length,
      services: SERVICES,
    },
  });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          Employee Twin Facade - Started                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Integrated Services: ${Object.keys(SERVICES).length}
║                                                             ║
║  MAIN ENDPOINT:                                            ║
║  GET /api/employee/:id/twin  (Complete employee twin)      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
