# Voice Relationship Graph

**Port:** 4888  
Track voice interaction relationships.

## API

```bash
POST /relationships {"fromCorpId": "user_1", "toCorpId": "user_2", "type": "colleague"}
GET /relationships/:corpId
POST /interactions {"fromCorpId": "user_1", "toCorpId": "user_2"}
```
