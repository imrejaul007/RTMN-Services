# Voice Twin Retriever

**Port:** 4886  
**Package:** `@hojai/voice-twin-retriever`

Auto-fetch digital twin on voice detection.

## Features

- Twin retrieval by CorpID
- Voice-to-twin caching
- Support for multiple twin types

## API

```bash
POST /retrieve {"voiceFingerprint": "abc", "corpId": "user_001"}
GET /twin/:corpId
GET /voice/:fingerprint/twin
```

## Testing

```bash
npm test
```
