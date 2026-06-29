# Voice Identity & TrustOS

> **Part of HOJAI VoiceOS** | Port: 4884

Voiceprint management, consent, and trust for voice interactions:
- **Voice Enrollment**: Register personal, agent, company voices
- **Voice Verification**: Liveness checks, identity matching
- **Consent Management**: Granular control over voice usage
- **Trust Scoring**: 0-100 trust score with factors
- **Voice Cloning**: Authorized cloning with consent
- **Relationship Graph**: Human-agent relationships

## Architecture

```
Voice Input → Voice Identity → Trust Score → Authorization
                    ↓
              Consent Engine
                    ↓
              Voice Gateway → TTS
```

## Identity Types

| Type | Description | Example |
|------|-------------|---------|
| **human** | Personal voice | User's own voice |
| **agent** | AI agent voice | Genie, RAZO |
| **company** | Organization voice | Hotel brand, restaurant |
| **family** | Family member voice | Parent, child |
| **brand** | Product brand voice | Hotel chain |

## Trust Levels

| Level | Score | Requirements |
|-------|-------|-------------|
| **Unverified** | 0 | No verification |
| **Basic** | 10-30 | Email/phone verified |
| **Verified** | 30-50 | Voice verification passed |
| **Trusted** | 50-70 | 3+ verifications |
| **Platinum** | 70-100 | Liveness + 5+ verifications |

## Consent Settings

| Setting | Options | Description |
|---------|---------|-------------|
| **cloneVoice** | none/family/trusted/all | Who can clone this voice |
| **financialActions** | none/family/trusted/all | Voice payment authorization |
| **personalData** | none/family/trusted/all | Access personal information |
| **shareWithAgents** | none/family/trusted/all | Share with AI agents |
| **thirdPartyAccess** | none/family/trusted/all | Third-party access |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/identity/register` | Register voice identity |
| POST | `/api/identity/verify` | Verify voice |
| POST | `/api/identity/clone` | Request voice cloning |
| GET | `/api/identity/:id` | Get identity details |
| GET | `/api/identity/user/:id` | Get user identities |
| PUT | `/api/identity/:id/consent` | Update consent |
| GET | `/api/trust/:id` | Get trust score |
| POST | `/api/relationship` | Add relationship |
| GET | `/api/relationships/:id` | Get relationships |
| POST | `/api/authorize/action` | Authorize action |
| GET | `/health` | Health check |

## Example Usage

```bash
# Register voice identity
curl -X POST http://localhost:4884/api/identity/register \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-123",
    "type": "human",
    "name": "Reza",
    "audioSamples": ["base64audio..."],
    "consent": {
      "cloneVoice": "family",
      "financialActions": "trusted"
    }
  }'

# Verify voice
curl -X POST http://localhost:4884/api/identity/verify \
  -H 'Content-Type: application/json' \
  -d '{
    "identityId": "id-123",
    "audioSample": "base64audio...",
    "type": "liveness"
  }'

# Check trust score
curl http://localhost:4884/api/trust/id-123

# Authorize action
curl -X POST http://localhost:4884/api/authorize/action \
  -H 'Content-Type: application/json' \
  -d '{
    "identityId": "id-123",
    "actionType": "financial"
  }'
```

## Privacy & Security

- Voiceprints stored securely with encryption
- Consent required for all voice usage
- Liveness detection prevents recording spoofing
- Audit trail for all voice interactions
- GDPR-compliant consent management

## Integration

- **Voice Gateway (4880)**: Receives verification results before TTS
- **TrustOS**: Integrates with SUTAR trust infrastructure
- **MemoryOS**: Stores consent and relationship data
- **Genie**: Voice verification for Genie interactions

---

*Part of the 12-layer VoiceOS architecture. See [HOJAI VoiceOS](../CLAUDE.md)*
