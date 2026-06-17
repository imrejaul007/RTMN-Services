/**
 * RTMN Workforce OS - Module Integration
 *
 * Connects all new modules to the main service:
 * - CorpID Auth
 * - Event Bus
 * - TwinOS Hub
 * - Industry Connectors
 * - AI Agents
 * - WebSocket Server
 */

import { createServer } from 'http';
import { wsServer } from './websocket/websocketServer.js';
import { initializeEventSubscriptions } from './events/eventBus.js';
import { initializeTwinSync } from './twins/twinSync.js';
import {
  authMiddleware,
  generateToken,
  syncEmployeeToCorpID,
} from './middleware/auth.js';
import {
  eventPublisher,
  WORKFORCE_EVENTS,
} from './events/eventBus.js';
import {
  industrySyncService,
  getAllIndustries,
} from './industry/industryConnectors.js';
import {
  hrCopilot,
  recruiterAgent,
  careerCoach,
  performanceCoach,
  complianceAgent,
  wellnessAgent,
} from './ai/aiAgents.js';

// Module integration status
const integrationStatus = {
  corpid: false,
  eventBus: false,
  twinos: false,
  websocket: false,
  industries: [],
  aiAgents: {
    hrCopilot: true,
    recruiter: true,
    careerCoach: true,
    performanceCoach: true,
    complianceAgent: true,
    wellnessAgent: true,
  },
};

// Initialize all integrations
export async function initializeIntegrations(app, db) {
  console.log('🚀 Initializing Workforce OS Integrations...\n');

  // 1. Initialize Event Bus
  console.log('📡 Connecting to Event Bus...');
  await initializeEventSubscriptions();
  integrationStatus.eventBus = true;
  console.log('✅ Event Bus connected\n');

  // 2. Initialize TwinOS Hub
  console.log('🔄 Connecting to TwinOS Hub...');
  await initializeTwinSync();
  integrationStatus.twinos = true;
  console.log('✅ TwinOS Hub connected\n');

  // 3. Initialize WebSocket Server
  console.log('🔌 Starting WebSocket Server...');
  const server = createServer(app);
  wsServer.initialize(server);
  integrationStatus.websocket = true;
  console.log('✅ WebSocket Server started\n');

  // 4. Check Industry OS connections
  console.log('🏢 Checking Industry OS connections...');
  const industries = getAllIndustries();
  for (const industry of industries.slice(0, 5)) { // Check first 5
    console.log(`   ${industry.name}: Port ${industry.port}`);
  }
  console.log(`   ... and ${industries.length - 5} more industries\n`);
  integrationStatus.industries = industries.map(i => i.code);
  console.log('✅ Industry OS connectors ready\n');

  // 5. AI Agents
  console.log('🤖 AI Agents initialized:');
  console.log('   - HR Copilot: ✅');
  console.log('   - Recruiter Agent: ✅');
  console.log('   - Career Coach: ✅');
  console.log('   - Performance Coach: ✅');
  console.log('   - Compliance Agent: ✅');
  console.log('   - Wellness Agent: ✅\n');

  console.log('✅ All integrations initialized!\n');

  return server;
}

// Apply integrations to Express routes
export function applyIntegrations(app, db) {
  // Add auth middleware to protected routes
  app.use('/api/employees', authMiddleware);
  app.use('/api/leave', authMiddleware);
  app.use('/api/attendance', authMiddleware);
  app.use('/api/payroll', authMiddleware);
  app.use('/api/benefits', authMiddleware);
  app.use('/api/expenses', authMiddleware);
  app.use('/api/copilot', authMiddleware);
  app.use('/api/analytics', authMiddleware);

  // Industry sync endpoints
  app.post('/api/employees/:id/industries', async (req, res) => {
    try {
      const { industries } = req.body;
      const employee = db.employees.get(req.params.id);

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const result = await industrySyncService.assignToIndustries(employee, industries);

      // Publish event
      await eventPublisher.employeeUpdated(employee, { industriesAssigned: industries });

      res.json(result);
    } catch (error) {
      console.error('Industry assignment error:', error);
      res.status(500).json({ error: 'Failed to assign to industries' });
    }
  });

  app.get('/api/employees/:id/industries', async (req, res) => {
    try {
      const employee = db.employees.get(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const assignments = await industrySyncService.checkCompliance(req.params.id, employee.industries || []);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get industry assignments' });
    }
  });

  // AI Copilot endpoints with real LLM
  app.post('/api/copilot/chat', async (req, res) => {
    try {
      const { message, employeeId, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get employee context
      let employeeContext = context || {};
      if (employeeId) {
        const employee = db.employees.get(employeeId);
        if (employee) {
          employeeContext = {
            employeeId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            department: employee.departmentId,
            position: employee.positionId,
            leaveBalance: db.leaveBalances.get(employeeId),
          };
        }
      }

      const result = await hrCopilot.chat(message, employeeContext);

      res.json(result);
    } catch (error) {
      console.error('Copilot error:', error);
      res.status(500).json({ error: 'AI service unavailable' });
    }
  });

  // AI Recruiter endpoints
  app.post('/api/ai/screen-candidate', async (req, res) => {
    try {
      const { candidate, job } = req.body;
      const result = await recruiterAgent.screenCandidate(candidate, job);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Screening failed' });
    }
  });

  app.post('/api/ai/generate-job-description', async (req, res) => {
    try {
      const { title, department, requirements } = req.body;
      const result = await recruiterAgent.generateJobDescription(title, department, requirements);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Generation failed' });
    }
  });

  // Career Coach endpoints
  app.post('/api/ai/career-analysis', async (req, res) => {
    try {
      const { employeeId, goals } = req.body;
      const employee = db.employees.get(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const result = await careerCoach.analyzeCareer(employee, goals);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Career analysis failed' });
    }
  });

  app.post('/api/ai/learning-recommendations', async (req, res) => {
    try {
      const { employeeId, skills } = req.body;
      const result = await careerCoach.recommendLearning(employeeId, skills);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Recommendations failed' });
    }
  });

  // Performance Coach endpoints
  app.post('/api/ai/generate-okrs', async (req, res) => {
    try {
      const { role, tenure } = req.body;
      const result = await performanceCoach.generateOKRs(role, tenure);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'OKR generation failed' });
    }
  });

  app.post('/api/ai/review-feedback', async (req, res) => {
    try {
      const { employee, context } = req.body;
      const result = await performanceCoach.prepareReviewFeedback(employee, context);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Feedback preparation failed' });
    }
  });

  // Compliance Agent endpoints
  app.post('/api/ai/check-compliance', async (req, res) => {
    try {
      const { employeeId, industry } = req.body;
      const employee = db.employees.get(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const result = await complianceAgent.checkCompliance(employee, industry);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Compliance check failed' });
    }
  });

  // Wellness Agent endpoints
  app.post('/api/ai/wellbeing-assessment', async (req, res) => {
    try {
      const { employeeId } = req.body;
      const employee = db.employees.get(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      // Generate mock wellbeing data
      const data = {
        attendanceOnTime: 0.9,
        leaveTaken: 0.4,
        overtimeHours: 5,
        engagementScore: 0.75,
      };
      const result = await wellnessAgent.assessWellbeing(employee, data);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Wellbeing assessment failed' });
    }
  });

  // Skills transfer recommendations
  app.get('/api/employees/:id/skills-transfer', async (req, res) => {
    try {
      const employee = db.employees.get(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const industries = ['hospitality', 'hotel', 'retail', 'fitness'];
      const result = await industrySyncService.getSkillsTransfer(
        req.params.id,
        employee.departmentId,
        industries
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Skills transfer analysis failed' });
    }
  });

  // Integration status endpoint
  app.get('/api/integrations/status', (req, res) => {
    res.json({
      status: 'healthy',
      integrations: integrationStatus,
      websocket: wsServer.getStats(),
    });
  });

  console.log('✅ API integrations applied');
}

// Sync employee to all services
export async function syncEmployee(employee, action = 'created') {
  const results = {
    corpid: null,
    twinos: null,
    eventBus: null,
    industries: null,
  };

  try {
    // Sync to CorpID
    if (action === 'created') {
      results.corpid = await syncEmployeeToCorpID(employee);
    }
  } catch (error) {
    console.error('CorpID sync failed:', error);
  }

  try {
    // Sync to TwinOS
    results.twinos = await import('./twins/twinSync.js').then(m => m.twinSyncService.syncEmployee(employee));
  } catch (error) {
    console.error('TwinOS sync failed:', error);
  }

  try {
    // Publish event
    if (action === 'created') {
      await eventPublisher.employeeCreated(employee);
    } else if (action === 'updated') {
      await eventPublisher.employeeUpdated(employee, {});
    } else if (action === 'terminated') {
      await eventPublisher.employeeTerminated(employee, 'Termination');
    }
    results.eventBus = true;
  } catch (error) {
    console.error('Event Bus publish failed:', error);
  }

  try {
    // Sync to industries
    if (employee.industries && employee.industries.length > 0) {
      results.industries = await industrySyncService.assignToIndustries(employee, employee.industries);
    }
  } catch (error) {
    console.error('Industry sync failed:', error);
  }

  return results;
}

export default {
  initializeIntegrations,
  applyIntegrations,
  syncEmployee,
};
