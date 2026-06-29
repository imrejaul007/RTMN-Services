# Cross-Modal Emotion

**Port:** 4766  
Text + voice emotion analysis.

## Features

- Text emotion analysis
- Voice emotion analysis
- Fused emotion detection

## API

```bash
# Text only
POST /analyze/text {"text": "I'm so happy today!"}

# Voice only
POST /analyze/voice {"pitch": 75, "energy": 80, "speechRate": 170}

# Fused
POST /analyze/fused {"text": "I'm happy", "voiceFeatures": {"pitch": 75}}
```
