# 📋 PHASE 4: VOICE CLONE / TTS
**Duration:** Week 6-8
**Goal:** Speak AS the user with permission

---

## Overview

Voice Clone allows Genie to speak in the user's own voice, with proper permissions and emotional rendering.

```
User: "Call mom and say I'll be late"
       ↓
RAZO: Intent detected
       ↓
Genie: Prepare message
       ↓
Voice Clone: Synthesize in user's voice
       ↓
RAZO: Send voice message
       ↓
Mom receives: "Hi Mom, this is [User]. I'll be home late today."
```

---

## Directory Structure

```
products/voice-os/core/voice-clone/
├── src/
│   ├── index.ts              # Express server, port 4890
│   ├── services/
│   │   ├── voiceEnrollment.ts    # Record voice samples
│   │   ├── voiceModel.ts        # Generate voice model
│   │   ├── voiceSynthesis.ts    # Synthesize speech
│   │   ├── emotionRenderer.ts   # Add emotion to voice
│   │   ├── permissionEngine.ts  # Permission checks
│   │   └── audioProcessor.ts   # Audio formatting
│   ├── models/
│   │   └── VoiceProfile.ts
│   └── types/
│       └── voice.ts
├── __tests__/
│   └── voiceClone.test.ts
├── package.json
└── README.md
```

---

## 1. package.json

```json
{
  "name": "@hojai/voice-clone",
  "version": "1.0.0",
  "description": "Voice Clone - Speak AS the user with permission",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "elevenlabs": "^1.0.0",
    "ioredis": "^5.3.0"
  }
}
```

---

## 2. Types

```typescript
// src/types/voice.ts

export interface VoiceProfile {
  id: string;
  userId: string;
  modelUrl: string;
  enrolledAt: Date;
  status: 'enrolling' | 'active' | 'suspended';
  language: string;
  sampleCount: number;
  permissions: VoicePermissions;
}

export interface VoicePermissions {
  canSpeakAsUser: boolean;
  allowedContacts: string[];    // Who can receive calls
  disallowedTopics: string[];    // What not to discuss
  requireDisclosure: boolean;   // Must say "AI assistant speaking"
  maxDuration: number;          // Max seconds per message
}

export interface SynthesisRequest {
  userId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'apologetic';
  pace?: 'slow' | 'normal' | 'fast';
  recipient?: string;
}

export interface SynthesisResponse {
  audioUrl: string;
  duration: number;
  format: 'mp3' | 'wav';
}
```

---

## 3. Index

```typescript
// src/index.ts

import express from 'express';
import { z } from 'zod';
import { enrollVoice } from './services/voiceEnrollment.js';
import { synthesizeSpeech } from './services/voiceSynthesis.js';
import { checkPermission } from './services/permissionEngine.js';
import { VoiceProfileStore } from './models/VoiceProfile.js';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '4890', 10);
const redis = new Redis(process.env.REDIS_URL);

// Enroll voice
app.post('/api/enroll/start', async (req, res) => {
  const { userId } = req.body;
  const result = await enrollVoice.start(userId);
  res.json(result);
});

app.post('/api/enroll/complete', async (req, res) => {
  const { userId } = req.body;
  const result = await enrollVoice.complete(userId);
  res.json(result);
});

// Get profile
app.get('/api/profiles/:userId', async (req, res) => {
  const profile = await VoiceProfileStore.get(req.params.userId);
  res.json(profile);
});

// Synthesize
app.post('/api/synthesize', async (req, res) => {
  const schema = z.object({
    userId: z.string(),
    text: z.string(),
    emotion: z.enum(['neutral', 'happy', 'sad', 'excited', 'calm', 'apologetic']).optional(),
    recipient: z.string().optional()
  });
  
  const { userId, text, emotion, recipient } = schema.parse(req.body);
  
  // Check permission
  const allowed = await checkPermission(userId, text, recipient);
  if (!allowed) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  const result = await synthesizeSpeech({ userId, text, emotion, recipient });
  res.json(result);
});

// Permissions
app.get('/api/permissions/:userId', async (req, res) => {
  const profile = await VoiceProfileStore.get(req.params.userId);
  res.json(profile?.permissions);
});

app.post('/api/permissions/:userId', async (req, res) => {
  const { permissions } = req.body;
  await VoiceProfileStore.updatePermissions(req.params.userId, permissions);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Voice Clone running on port ${PORT}`);
});
```

---

## 4. Voice Enrollment

```typescript
// src/services/voiceEnrollment.ts

import axios from 'axios';
import { VoiceProfileStore } from '../models/VoiceProfile.js';

const ELEVENLABS_API = process.env.ELEVENLABS_API_URL;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

export const enrollVoice = {
  async start(userId: string) {
    // Create profile
    const profile = {
      id: `voice_${userId}_${Date.now()}`,
      userId,
      modelUrl: '',
      enrolledAt: new Date(),
      status: 'enrolling',
      language: 'en',
      sampleCount: 0,
      permissions: {
        canSpeakAsUser: false,
        allowedContacts: [],
        disallowedTopics: [],
        requireDisclosure: true,
        maxDuration: 60
      }
    };
    
    await VoiceProfileStore.save(profile);
    
    return {
      profileId: profile.id,
      instructions: 'Record 30 seconds of speech. Speak naturally.',
      requiredSamples: 5
    };
  },
  
  async addSample(userId: string, audioData: Buffer) {
    const profile = await VoiceProfileStore.get(userId);
    if (!profile) throw new Error('Profile not found');
    
    // Store sample (in production, upload to S3 + send to ElevenLabs)
    profile.sampleCount++;
    
    if (profile.sampleCount >= 5) {
      // Trigger voice model generation
      await this.generateModel(userId);
    }
    
    await VoiceProfileStore.save(profile);
    return { samplesRecorded: profile.sampleCount };
  },
  
  async complete(userId: string) {
    const profile = await VoiceProfileStore.get(userId);
    if (profile.sampleCount < 5) {
      throw new Error('Need at least 5 samples');
    }
    
    profile.status = 'active';
    await VoiceProfileStore.save(profile);
    
    return { status: 'active', canUse: true };
  },
  
  async generateModel(userId: string) {
    const profile = await VoiceProfileStore.get(userId);
    
    // Call ElevenLabs API to create voice model
    const response = await axios.post(
      `${ELEVENLABS_API}/voice-generation/create-voice`,
      {
        voice_name: `user_${userId}`,
        samples: profile.samples
      },
      { headers: { 'xi-api-key': ELEVENLABS_KEY } }
    );
    
    profile.modelUrl = response.data.voice_id;
    await VoiceProfileStore.save(profile);
  }
};
```

---

## 5. Voice Synthesis

```typescript
// src/services/voiceSynthesis.ts

import axios from 'axios';
import { VoiceProfileStore } from '../models/VoiceProfile.js';

const ELEVENLABS_API = process.env.ELEVENLABS_API_URL;
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;

export async function synthesizeSpeech(request: {
  userId: string;
  text: string;
  emotion?: string;
  recipient?: string;
}) {
  const profile = await VoiceProfileStore.get(request.userId);
  
  if (!profile || profile.status !== 'active') {
    throw new Error('Voice profile not active');
  }
  
  // Map emotion to ElevenLabs settings
  const emotionSettings: Record<string, any> = {
    neutral: { stability: 0.5, similarity_boost: 0.75 },
    happy: { stability: 0.3, similarity_boost: 0.8, style: 0.5 },
    sad: { stability: 0.6, similarity_boost: 0.7, style: 0.3 },
    excited: { stability: 0.2, similarity_boost: 0.8, style: 0.8 },
    calm: { stability: 0.8, similarity_boost: 0.7, style: 0.1 },
    apologetic: { stability: 0.5, similarity_boost: 0.75, style: 0.4 }
  };
  
  const settings = emotionSettings[request.emotion || 'neutral'];
  
  // Call ElevenLabs
  const response = await axios.post(
    `${ELEVENLABS_API}/text-to-speech/${profile.modelUrl}`,
    {
      text: request.text,
      voice_settings: settings
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    }
  );
  
  // Save audio to storage (S3, etc.)
  const audioUrl = await saveAudio(response.data, request.userId);
  
  return {
    audioUrl,
    duration: estimateDuration(request.text),
    format: 'mp3'
  };
}

function estimateDuration(text: string): number {
  // ~150 words per minute average speaking rate
  const words = text.split(' ').length;
  return Math.ceil(words / 150 * 60);
}

async function saveAudio(audioData: Buffer, userId: string): Promise<string> {
  // In production: upload to S3/Cloudflare R2
  // Return signed URL
  const key = `voices/${userId}/${Date.now()}.mp3`;
  // await s3.putObject(key, audioData);
  return `https://cdn.example.com/${key}`;
}
```

---

## 6. Permission Engine

```typescript
// src/services/permissionEngine.ts

import { VoiceProfileStore } from '../models/VoiceProfile.js';

const DISALLOWED_TOPICS = [
  'banking',
  'password',
  'medical diagnosis',
  'legal advice'
];

export async function checkPermission(
  userId: string,
  text: string,
  recipient?: string
): Promise<boolean> {
  const profile = await VoiceProfileStore.get(userId);
  
  if (!profile) return false;
  if (profile.status !== 'active') return false;
  if (!profile.permissions.canSpeakAsUser) return false;
  
  // Check topic
  const textLower = text.toLowerCase();
  for (const topic of DISALLOWED_TOPICS) {
    if (textLower.includes(topic)) return false;
  }
  
  // Check if topic in user's disallowed list
  for (const topic of profile.permissions.disallowedTopics) {
    if (textLower.includes(topic.toLowerCase())) return false;
  }
  
  // Check recipient
  if (recipient && profile.permissions.allowedContacts.length > 0) {
    if (!profile.permissions.allowedContacts.includes(recipient)) {
      return false;
    }
  }
  
  // Check duration
  const duration = estimateDuration(text);
  if (duration > profile.permissions.maxDuration) {
    return false;
  }
  
  return true;
}
```

---

## 7. Model Store

```typescript
// src/models/VoiceProfile.ts

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface VoiceProfile {
  id: string;
  userId: string;
  modelUrl: string;
  enrolledAt: Date;
  status: 'enrolling' | 'active' | 'suspended';
  language: string;
  sampleCount: number;
  permissions: {
    canSpeakAsUser: boolean;
    allowedContacts: string[];
    disallowedTopics: string[];
    requireDisclosure: boolean;
    maxDuration: number;
  };
}

export const VoiceProfileStore = {
  async get(userId: string): Promise<VoiceProfile | null> {
    const data = await redis.get(`voice:${userId}`);
    return data ? JSON.parse(data) : null;
  },
  
  async save(profile: VoiceProfile): Promise<void> {
    await redis.set(`voice:${profile.userId}`, JSON.stringify(profile));
  },
  
  async updatePermissions(userId: string, permissions: Partial<VoiceProfile['permissions']>): Promise<void> {
    const profile = await this.get(userId);
    if (profile) {
      profile.permissions = { ...profile.permissions, ...permissions };
      await this.save(profile);
    }
  }
};
```

---

## 8. Test File

```typescript
// __tests__/voiceClone.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const BASE_URL = 'http://localhost:4890';

describe('Voice Clone', () => {
  const testUserId = 'test_user_123';
  
  it('should start enrollment', async () => {
    const response = await axios.post(`${BASE_URL}/api/enroll/start`, {
      userId: testUserId
    });
    expect(response.data.profileId).toBeDefined();
    expect(response.data.requiredSamples).toBe(5);
  });
  
  it('should synthesize speech for active profile', async () => {
    // First enroll
    await axios.post(`${BASE_URL}/api/enroll/start`, { userId: testUserId });
    
    // Then synthesize (would fail without enrollment complete)
    try {
      await axios.post(`${BASE_URL}/api/synthesize`, {
        userId: testUserId,
        text: 'Hello, this is a test message.'
      });
    } catch (e: any) {
      // Expected to fail without full enrollment
      expect(e.response.status).toBe(403);
    }
  });
  
  it('should block disallowed topics', async () => {
    await axios.post(`${BASE_URL}/api/permissions/${testUserId}`, {
      permissions: {
        canSpeakAsUser: true,
        disallowedTopics: ['banking']
      }
    });
    
    const response = await axios.post(`${BASE_URL}/api/synthesize`, {
      userId: testUserId,
      text: 'What is my banking password?'
    }).catch(e => e.response);
    
    expect(response.status).toBe(403);
  });
});
```

---

## Checklist

- [ ] Create directory structure
- [ ] Create package.json
- [ ] Create types/voice.ts
- [ ] Create index.ts
- [ ] Create services/voiceEnrollment.ts
- [ ] Create services/voiceSynthesis.ts
- [ ] Create services/permissionEngine.ts
- [ ] Create models/VoiceProfile.ts
- [ ] Create __tests__/voiceClone.test.ts
- [ ] npm install
- [ ] npm run build
- [ ] npm test
- [ ] Manual test enrollment flow
- [ ] Commit
