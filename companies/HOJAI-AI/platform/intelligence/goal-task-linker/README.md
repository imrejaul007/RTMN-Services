# Goal Task Linker

**Port:** 4293  
Link tasks to goals/OKRs.

```bash
POST /link {"taskId": "task_1", "goalId": "goal_1", "contribution": 0.2}
GET /task/:taskId/goals
GET /goal/:goalId/tasks
```
