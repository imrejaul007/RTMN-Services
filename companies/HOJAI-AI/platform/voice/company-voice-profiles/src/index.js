import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4892;

app.use(helmet());
app.use(cors());
app.use(express.json());

const profiles = new Map();

// Create company voice profile
function createProfile(companyId, data = {}) {
  const profile = {
    companyId,
    voiceType: data.voiceType || 'professional',
    language: data.language || 'en-US',
    tone: data.tone || 'friendly',
    greeting: data.greeting || 'Hello, how can I help you today?',
    permissions: data.permissions || {},
    createdAt: new Date().toISOString()
  };
  profiles.set(companyId, profile);
  return profile;
}

app.post('/profiles', (req, res) => {
  const { companyId, voiceType, language, tone, greeting } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId required' });
  }

  const profile = createProfile(companyId, { voiceType, language, tone, greeting });
  res.json({ success: true, profile });
});

app.get('/profiles/:companyId', (req, res) => {
  const { companyId } = req.params;
  const profile = profiles.get(companyId);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({ profile });
});

app.put('/profiles/:companyId', (req, res) => {
  const { companyId } = req.params;
  const profile = profiles.get(companyId);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  Object.assign(profile, req.body);
  profiles.set(companyId, profile);
  res.json({ success: true, profile });
});

app.get('/profiles', (req, res) => {
  res.json({ profiles: Array.from(profiles.values()) });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'company-voice-profiles', port: PORT });
});

app.listen(PORT, () => console.log(`Company Voice Profiles running on port ${PORT}`));
export default app;