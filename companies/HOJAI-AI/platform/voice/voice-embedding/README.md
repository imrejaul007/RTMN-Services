# Voice Embedding Service

**Port:** 4895  
**Version:** 1.0.0

Real voice embedding generation for speaker verification. This **replaces the mock embeddings** in `voice-identity`.

## Key Capabilities

### 1. Voice Embedding Generation
- 512-dim voice embeddings from audio samples
- Deterministic (same audio → same embedding)
- Supports Azure Speaker Recognition API
- Fallback to enhanced local generation

### 2. Speaker Enrollment
- Multi-sample enrollment (3+ samples)
- Creates persistent voiceprint
- Supports retraining with new samples

### 3. Speaker Verification
- Verify audio matches enrolled voice
- Configurable confidence threshold
- Caching for performance

### 4. Speaker Identification
- Identify speaker from pool of enrolled users
- Returns ranked matches

## This Replaces

**BEFORE (voice-identity):**
```javascript
function generateMockEmbedding(sampleCount) {
  // Random vectors - NOT real voiceprints
  const embedding = [];
  for (let i = 0; i < 512; i++) {
    embedding.push(Math.random() * 2 - 1);
  }
  return embedding;
}
```

**AFTER (voice-embedding):**
```javascript
// Real voice embeddings via Azure or local model
const embedding = await generateAzureEmbedding(audio);
// or
const embedding = await generateLocalEmbedding(audio);
```

## Configuration

```bash
# Azure Speaker Recognition (production)
export AZURE_SPEECH_KEY=your_key
export AZURE_SPEECH_REGION=eastus

# Local ONNX model (alternative)
export USE_LOCAL_MODEL=true
export LOCAL_MODEL_PATH=./models/speaker_embedding.onnx

# Thresholds
export VERIFICATION_THRESHOLD=0.85
export IDENTIFICATION_THRESHOLD=0.75
export ENROLLMENT_MIN_SAMPLES=3

# Cache
export CACHE_ENABLED=true
export CACHE_TTL_MS=86400000
```

## Usage Example

### 1. Enroll a Speaker

```javascript
// Start enrollment
await fetch('http://localhost:4895/api/enrollment/start', {
  method: 'POST',
  body: JSON.stringify({ userId: 'rejaul_001', name: 'Rejaul' })
});

// Add 3+ samples
for (const sample of audioSamples) {
  await fetch('http://localhost:4895/api/enrollment/add-sample', {
    method: 'POST',
    body: JSON.stringify({ userId: 'rejaul_001', audio: sample })
  });
}

// Complete enrollment
await fetch('http://localhost:4895/api/enrollment/complete', {
  method: 'POST',
  body: JSON.stringify({ userId: 'rejaul_001' })
});
```

### 2. Verify Speaker

```javascript
const result = await fetch('http://localhost:4895/api/verify', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'rejaul_001',
    audio: verificationAudio
  })
});

console.log(result);
// { verified: true, confidence: 0.92, threshold: 0.85 }
```

### 3. Identify Speaker

```javascript
const result = await fetch('http://localhost:4895/api/identify', {
  method: 'POST',
  body: JSON.stringify({
    audio: unknownAudio,
    candidateUserIds: ['rejaul_001', 'investor_001', 'designer_001']
  })
});

console.log(result);
// { identified: true, speaker: { userId: 'rejaul_001', confidence: 0.94 } }
```

## Production Integration

### Azure Speaker Recognition API

1. Get Azure Speech subscription
2. Enable Speaker Recognition in Azure Portal
3. Set `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`

### Local Model (Resemblyzer/ONNX)

1. Train or download a speaker embedding model
2. Export to ONNX format
3. Set `USE_LOCAL_MODEL=true` and `LOCAL_MODEL_PATH`

### Integration with voice-identity

The `speaker-diarization` service calls `voice-embedding` for real voice verification:

```
speaker-diarization → voice-embedding → voice-identity
```

## Health Check

```bash
curl http://localhost:4895/health
```

---

*This service enables reliable voice verification for the critical use case: "Detect my voice at 5% in a noisy conversation."*
