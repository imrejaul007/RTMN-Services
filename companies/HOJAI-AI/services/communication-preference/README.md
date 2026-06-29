# Communication Preference Service

**Port:** 4905  
**Purpose:** Channel and tone preferences

## API

```
POST /api/communication/preferences
  Input: { channelHistory, sentimentHistory }
  Output: { preferred_channel, preferred_tone, best_time, personalization }
```
