# Voice Identity Bridge

**Port:** 4885  
Link voice fingerprints to CorpID.

## Architecture

```
Voice Fingerprint → Voice Identity Bridge → CorpID
```

## API

```bash
# Register voice with CorpID
POST /register
{"voiceFingerprint": "abc123", "corpId": "user_123", "trustScore": 80}

# Lookup CorpID from voice
POST /lookup
{"voiceFingerprint": "abc123"}

# Get all voices for CorpID
GET /corp/:corpId/voices

# Update trust score
PUT /trust
{"voiceFingerprint": "abc123", "delta": 10}
```