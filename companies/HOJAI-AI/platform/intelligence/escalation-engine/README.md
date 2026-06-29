# Escalation Engine

**Port:** 4296  
**Package:** `@hojai/escalation-engine`

Auto-escalate tasks based on rules.

## API

```bash
POST /escalate {"taskId": "task_1", "task": {"priority": "critical"}}
```

## Testing

```bash
npm test
```
