# Meeting Intelligence

**Port:** 4890  
Meeting transcription, summarization, action extraction.

## API

```bash
POST /transcribe {"meetingId": "mtg_1", "audioData": {}}
POST /summarize {"meetingId": "mtg_1"}
POST /actions {"meetingId": "mtg_1"}
POST /analyze {"meetingId": "mtg_1"}
```
