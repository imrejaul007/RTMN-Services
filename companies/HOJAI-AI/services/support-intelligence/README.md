# Support Intelligence Service

**Port:** 4900  
**Purpose:** Support behavior profiling

## API

```
POST /api/support/profile
  Input: { ticketHistory, refundRequests, sentiment, channelHistory }
  Output: { priority, recommended_tone, preferred_channel, escalation_probability }
```
