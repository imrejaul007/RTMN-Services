# Speaker Diarization Service

**Port:** 4894  
**Version:** 1.0.0

Real-time speaker diarization and identification service. This is the **critical missing piece** for: *"Detect my voice even when I'm only 5% of a noisy conversation."*

## Key Capabilities

### 1. Speaker Diarization
- Detects number of speakers in audio
- Timestamps per speaker segment
- Supports 2-20 speakers
- Languages: en-US, hi-IN, ta-IN, bn-IN, mr-IN, gu-IN

### 2. Speaker Identification
- Matches diarized speakers to known voices
- Integrates with `voice-identity` service (port 4884)
- Real-time and batch processing

### 3. Voice Enrollment
- Enroll new speakers with audio samples
- Creates voice profile for matching
- Supports 3-10 samples per enrollment

### 4. Meeting Intelligence
- Full meeting analysis pipeline
- Speaking time per participant
- Participation balance metrics
- Primary user detection (the account owner)

## The Critical Use Case

```
Input: 2-hour meeting, 5 people, user speaks only 5% of the time
Output: 
- "Rejaul" identified as Speaker #3 (even at 5%)
- Speaking time: 6 minutes out of 120
- Emotional state: confident (from voice analysis)
- Commitments: 3 tasks extracted
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/diarize` | Full diarization |
| POST | `/api/meeting/analyze` | Meeting intelligence pipeline |
| POST | `/api/identify-speaker` | Voice verification |
| POST | `/api/enroll-speaker` | Voice enrollment |
| GET | `/api/session/:sessionId` | Get session results |
| GET | `/api/profile/:userId` | Get voice profile |
| GET | `/capabilities` | Service capabilities |

## Configuration

```bash
# Azure Speech (production)
export AZURE_SPEECH_KEY=your_key
export AZURE_SPEECH_REGION=eastus

# PyAnnote (alternative open-source)
export PYANNOTE_URL=http://localhost:8000
export PYANNOTE_ENABLED=true

# Voice Identity integration
export VOICE_IDENTITY_URL=http://localhost:4884

# Thresholds
export SPEAKER_MATCH_THRESHOLD=0.85
export MIN_SPEECH_MS=500

# Development mode (uses mock data)
export MOCK_MODE=false  # Set to false for real processing
```

## Usage Example

### Meeting Analysis

```javascript
const response = await fetch('http://localhost:4894/api/meeting/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audio: audioBase64,
    userId: 'rejaul_001',  // Primary user
    knownSpeakers: [
      { userId: 'rejaul_001', name: 'Rejaul', role: 'founder' },
      { userId: 'investor_001', name: 'Investor A', role: 'investor' },
      { userId: 'designer_001', name: 'Designer', role: 'employee' }
    ],
    meetingId: 'meeting_2026_06_30_001'
  })
});

const result = await response.json();
// result.primaryUserSpeakingTime: 360 (6 minutes)
// result.segments: speaker-attributed transcript segments
```

### Voice Enrollment

```javascript
// Enroll the user
await fetch('http://localhost:4894/api/enroll-speaker', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'rejaul_001',
    name: 'Rejaul',
    audioSamples: [sample1, sample2, sample3]  // 3+ samples
  })
});
```

## Architecture

```
Audio Input
     │
     ▼
┌─────────────────────────────────┐
│    Speaker Diarization          │
│  ┌────────────────────────────┐ │
│  │ Azure Speech SDK            │ │
│  │ OR PyAnnote Audio          │ │
│  │ OR Mock (dev mode)          │ │
│  └────────────────────────────┘ │
└──────────────┬──────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────────┐    ┌─────────────────┐
│   Diarized   │    │ Voice Identity  │
│   Segments   │    │   Service       │
│              │    │   (4884)        │
└──────┬───────┘    └────────┬────────┘
       │                      │
       └──────────┬───────────┘
                  ▼
         ┌─────────────────┐
         │ Speaker Match  │
         │ & Attribution  │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │  Meeting        │
         │  Intelligence   │
         └─────────────────┘
```

## Production Deployment

For production, set up one of:

1. **Azure Speech SDK**
   - Enable `diarizationEnabled: true` in transcription properties
   - Set `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`

2. **PyAnnote Audio** (self-hosted)
   - Install: `pip install pyannote.audio`
   - Run: `pyannote.audio server --port 8000`
   - Set `PYANNOTE_URL` and `PYANNOTE_ENABLED=true`

3. **Mock Mode** (development)
   - Default behavior
   - Generates realistic synthetic diarization

## Health Check

```bash
curl http://localhost:4894/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "speaker-diarization",
  "config": {
    "mockMode": true,
    "azureConfigured": false,
    "pyannoteEnabled": false
  }
}
```

---

*This service enables the core Genie capability: hearing, understanding, and remembering conversations.*
