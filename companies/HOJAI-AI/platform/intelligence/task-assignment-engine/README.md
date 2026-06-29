# Task Assignment Engine

**Port:** 4290  
Route tasks to responsible parties.

```bash
POST /tasks {"title": "Review budget", "department": "finance", "priority": "high"}
GET /tasks/:id
POST /tasks/:id/assign
```