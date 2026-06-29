/**
 * HOJAI API Gateway
 * Wires all services together
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const TwilioSMSClient = require('../../connectors/twilio-sms-connector/src');
const TwilioVoiceClient = require('../../connectors/twilio-voice-connector/src');
const WhatsAppBusinessClient = require('../../connectors/whatsapp-business-connector/src');
const BackgroundCheckClient = require('../../connectors/background-check-connector/src');
const MeetingRecordingClient = require('../../connectors/meeting-recording-connector/src');
const VoiceToTaskClient = require('../../connectors/voice-to-task-connector/src');

const ReplyDraftingService = require('../../services/reply-drafting-service/src');
const RefundApprovalService = require('../../services/refund-approval-service/src');
const RootCauseAnalysis = require('../../services/root-cause-service/src');
const ROICalculator = require('../../services/roi-calculator-service/src');

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Initialize clients
const twilioSMS = new TwilioSMSClient({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
});

const twilioVoice = new TwilioVoiceClient({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
  aiCallbackUrl: process.env.AI_CALLBACK_URL,
});

const whatsapp = new WhatsAppBusinessClient({
  phoneNumberId: process.env.WA_PHONE_ID,
  accessToken: process.env.WA_ACCESS_TOKEN,
  businessId: process.env.WA_BUSINESS_ID,
  verifyToken: process.env.WA_VERIFY_TOKEN,
  appSecret: process.env.WA_APP_SECRET,
});

const backgroundCheck = new BackgroundCheckClient({
  apiKey: process.env.BACKGROUND_CHECK_API_KEY,
  baseUrl: process.env.BACKGROUND_CHECK_BASE_URL,
});

const meetingRecording = new MeetingRecordingClient({
  provider: process.env.MEETING_PROVIDER || 'zoom',
  clientId: process.env.ZOOM_CLIENT_ID,
  clientSecret: process.env.ZOOM_CLIENT_SECRET,
  accountId: process.env.ZOOM_ACCOUNT_ID,
  aiEngineUrl: process.env.AI_ENGINE_URL,
  webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
});

const voiceToTask = new VoiceToTaskClient({
  openaiKey: process.env.OPENAI_API_KEY,
  aiServiceUrl: process.env.AI_AGENT_URL,
});

const replyDrafting = new ReplyDraftingService({
  openaiKey: process.env.OPENAI_API_KEY,
  kbServiceUrl: process.env.KB_SERVICE_URL,
});

const refundApproval = new RefundApprovalService({
  aiServiceUrl: process.env.AI_AGENT_URL,
});

const rootCause = new RootCauseAnalysis({
  aiServiceUrl: process.env.AI_AGENT_URL,
  metricsServiceUrl: process.env.METRICS_SERVICE_URL,
});

const roiCalculator = new ROICalculator({
  aiEngineUrl: process.env.AI_AGENT_URL,
});

// ===== Health =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: [
      'twilio-sms', 'twilio-voice', 'whatsapp-business',
      'background-check', 'meeting-recording', 'voice-to-task',
      'reply-drafting', 'refund-approval', 'root-cause', 'roi-calculator',
    ],
    timestamp: new Date().toISOString(),
  });
});

// ===== TWILIO SMS =====
app.post('/api/sms/send', async (req, res) => {
  const result = await twilioSMS.sendSMS(req.body);
  res.json(result);
});

app.post('/api/sms/otp', async (req, res) => {
  const { to, code, message } = req.body;
  const result = await twilioSMS.sendOTP(to, code, message);
  res.json(result);
});

app.post('/api/sms/bulk', async (req, res) => {
  const result = await twilioSMS.sendBulk(req.body);
  res.json(result);
});

app.get('/api/sms/balance', async (req, res) => {
  const result = await twilioSMS.getBalance();
  res.json(result);
});

app.post('/api/sms/validate', async (req, res) => {
  const result = await twilioSMS.validateNumber(req.body.phoneNumber);
  res.json(result);
});

// ===== TWILIO VOICE =====
app.post('/api/voice/call', async (req, res) => {
  const result = await twilioVoice.makeCall(req.body);
  res.json(result);
});

app.get('/api/voice/call/:sid', async (req, res) => {
  const result = await twilioVoice.getCall(req.params.sid);
  res.json(result);
});

app.get('/api/voice/recordings/:sid', async (req, res) => {
  const result = await twilioVoice.getRecordings(req.params.sid);
  res.json(result);
});

// TwiML webhook endpoints
app.post('/webhooks/voice/inbound', (req, res) => {
  const twiml = twilioVoice.handleInboundCall(req.body);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/webhooks/voice/status', (req, res) => {
  console.log('[Voice] Status:', req.body.CallStatus);
  res.sendStatus(200);
});

// ===== WHATSAPP BUSINESS =====
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = whatsapp.verifyWebhook(mode, token, challenge);
  res.status(result === 403 ? 403 : 200).send(result);
});

app.post('/webhooks/whatsapp', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const isValid = whatsapp.verifySignature(JSON.stringify(req.body), signature);

  if (!isValid) return res.sendStatus(403);

  // Process messages
  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        whatsapp.handleIncomingMessages(change.value.messages, change.value.contacts);
      }
    }
  }
  res.sendStatus(200);
});

app.post('/api/whatsapp/send', async (req, res) => {
  const result = await whatsapp.sendText(req.body);
  res.json(result);
});

app.post('/api/whatsapp/template', async (req, res) => {
  const result = await whatsapp.sendTemplate(req.body);
  res.json(result);
});

app.post('/api/whatsapp/buttons', async (req, res) => {
  const result = await whatsapp.sendButtons(req.body);
  res.json(result);
});

// ===== BACKGROUND CHECK =====
app.post('/api/background-check', async (req, res) => {
  const result = await backgroundCheck.check(req.body);
  res.json(result);
});

app.get('/api/background-check/:candidateId', async (req, res) => {
  const result = await backgroundCheck.getCandidate(req.params.candidateId);
  res.json(result);
});

app.post('/api/background-check/webhook', (req, res) => {
  const result = backgroundCheck.handleReportUpdate(req.body);
  res.json(result);
});

// ===== MEETING RECORDING =====
app.post('/api/meeting/process', async (req, res) => {
  const result = await meetingRecording.processWithAI(
    req.body.recordingUrl,
    req.body.meetingId
  );
  res.json(result);
});

app.get('/api/meeting/zoom/:userId', async (req, res) => {
  const result = await meetingRecording.getZoomRecordings(
    req.params.userId,
    req.query.from,
    req.query.to
  );
  res.json(result);
});

// ===== VOICE TO TASK =====
app.post('/api/voice/transcribe', async (req, res) => {
  const result = await voiceToTask.transcribe(req.body.audioUrl);
  res.json(result);
});

app.post('/api/voice/to-tasks', async (req, res) => {
  const result = await voiceToTask.voiceToTasks(req.body.audioUrl);
  res.json(result);
});

app.post('/api/voice/process', async (req, res) => {
  const result = await voiceToTask.process(
    req.body.audioUrl,
    req.body.projectId,
    req.body.options || {}
  );
  res.json(result);
});

// ===== REPLY DRAFTING =====
app.post('/api/reply/draft', async (req, res) => {
  const result = await replyDrafting.generateReply(req.body);
  res.json(result);
});

app.post('/api/reply/refine', async (req, res) => {
  const result = await replyDrafting.refineReply(req.body);
  res.json(result);
});

// ===== REFUND APPROVAL =====
app.post('/api/refund/process', async (req, res) => {
  const result = await refundApproval.processRefund(req.body);
  res.json(result);
});

app.post('/api/refund/approve', async (req, res) => {
  const result = await refundApproval.approve(req.body);
  res.json(result);
});

// ===== ROOT CAUSE =====
app.post('/api/incidents/analyze', async (req, res) => {
  const result = await rootCause.analyze(req.body);
  res.json(result);
});

// ===== ROI CALCULATOR =====
app.post('/api/roi/calculate', async (req, res) => {
  const result = await roiCalculator.calculate(req.body);
  res.json(result);
});

app.post('/api/roi/department', async (req, res) => {
  const result = await roiCalculator.calculateDepartment(req.body);
  res.json(result);
});

// ===== HEALTH CHECKS =====
app.get('/api/health/sms', async (req, res) => {
  try {
    const balance = await twilioSMS.getBalance();
    res.json({ healthy: true, balance });
  } catch (error) {
    res.status(503).json({ healthy: false, error: error.message });
  }
});

app.get('/api/health/whatsapp', async (req, res) => {
  try {
    const result = await whatsapp.validateNumber('+1234567890');
    res.json({ healthy: true });
  } catch (error) {
    res.status(503).json({ healthy: false, error: error.message });
  }
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('[API]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

const PORT = process.env.PORT || 4500;

app.listen(PORT, () => {
  console.log(`🚀 HOJAI API Gateway on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  - SMS:        /api/sms/*`);
  console.log(`  - Voice:      /api/voice/*`);
  console.log(`  - WhatsApp:   /api/whatsapp/*`);
  console.log(`  - BG Check:   /api/background-check/*`);
  console.log(`  - Meetings:   /api/meeting/*`);
  console.log(`  - Voice:      /api/voice/*`);
  console.log(`  - Reply:      /api/reply/*`);
  console.log(`  - Refund:     /api/refund/*`);
  console.log(`  - RCA:        /api/incidents/analyze`);
  console.log(`  - ROI:        /api/roi/*`);
});

module.exports = app;
