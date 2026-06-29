# Voice Action Router

**Port:** 4889  
Route voice commands to action systems.

## Intent → Action Mapping

| Intent | System | Port |
|--------|--------|------|
| task | GoalOS | 4297 |
| flow | FlowOS | 4298 |
| genie | Genie | 4701 |
| payment | Payment | 4301 |
| calendar | Calendar | 4709 |
| email | Email | 4710 |
| crm | CRM | 4800 |

## API

```bash
POST /route {"voiceText": "Remind me to call Sarah tomorrow"}
```
