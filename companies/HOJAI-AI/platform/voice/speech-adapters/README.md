# Speech Adapters Library

Multi-provider STT adapter for real production transcription.

## Providers

| Provider | Real Transcription | Speaker Diarization | Cost |
|----------|-------------------|---------------------|------|
| **Azure Speech SDK** | ✅ | ✅ | Pay-per-use |
| **OpenAI Whisper** | ✅ | ❌ (add separately) | $0.006/min |
| **Google Cloud Speech** | ✅ | ✅ | Pay-per-use |
| **Local Whisper** | ✅ | ❌ (add separately) | Free |

## Usage

```javascript
import { createSpeechAdapter } from './index.js';

// Azure Speech
const azure = createSpeechAdapter('azure', {
  key: process.env.AZURE_SPEECH_KEY,
  region: 'eastus'
});

// OpenAI Whisper
const whisper = createSpeechAdapter('whisper', {
  apiKey: process.env.OPENAI_API_KEY
});

// Google Cloud Speech
const google = createSpeechAdapter('google', {
  projectId: 'my-project'
});

// Local Whisper
const local = createSpeechAdapter('local-whisper', {
  endpoint: 'http://localhost:8000'
});

// Transcribe
const result = await adapter.transcribe(audioBase64, {
  language: 'en-US',
  enableSpeakerDiarization: true
});

console.log(result.text);
console.log(result.segments);
```

## Configuration

### Azure Speech

```bash
export AZURE_SPEECH_KEY=your_key
export AZURE_SPEECH_REGION=eastus
```

### OpenAI Whisper

```bash
export OPENAI_API_KEY=sk-...
```

### Google Cloud Speech

```bash
export GOOGLE_CLOUD_PROJECT=my-project
# Set up credentials:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Local Whisper

```bash
# Start Whisper server
python -m whisper_server --port 8000

export WHISPER_ENDPOINT=http://localhost:8000
```

## Speaker Diarization

All providers support adding speaker diarization:

```javascript
import { createSpeechAdapter, addSpeakerDiarization } from './index.js';

const azure = createSpeechAdapter('azure');
const result = await azure.transcribe(audio, { enableSpeakerDiarization: true });

// Or add diarization to any result:
const whisperResult = await whisper.transcribe(audio);
const withSpeakers = await addSpeakerDiarization(whisperResult, {
  method: 'pyannote' // or 'energy'
});
```

## API

### createSpeechAdapter(provider, config)

| Provider | Config Options |
|----------|---------------|
| azure | key, region, useRealtime |
| whisper | apiKey, baseUrl, model |
| google | credentials, projectId, model |
| local-whisper | endpoint, model |

### adapter.transcribe(audio, options)

| Option | Default | Description |
|--------|---------|-------------|
| language | en-US | BCP-47 language code |
| enableSpeakerDiarization | true | Enable speaker identification |
| enableWordLevelTimestamps | true | Get timestamps per word |

### adapter.listModels()

Returns available models for the provider.

---

*Real transcription, finally.*
