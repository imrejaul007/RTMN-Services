# Voice Twin Retriever

**Port:** 4886  
Auto-fetch twin on voice detection.

## API

```bash
POST /retrieve {"voiceFingerprint": "abc123", "twinType": "employee"}
GET /twin/:corpId
GET /voice/:fingerprint/twin
DELETE /cache
```
