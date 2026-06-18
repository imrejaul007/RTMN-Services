# Genie Execution Engine - Documentation

> **Version:** 1.0.0  
> **Port:** 4726  
> **Status:** ✅ Complete - All Routes Built  
> **Last Updated:** June 18, 2026

---

## 🎯 Overview

Genie Execution Engine provides comprehensive task management, automation, workflow orchestration, calendar integration, smart reminders, and action execution capabilities to help you get things done.

---

## 🏗️ Architecture

```
Port 4726
└── Execution Engine
    ├── /tasks      - Task management and Eisenhower matrix
    ├── /automation - Scheduled and triggered automations
    ├── /workflows  - Multi-step workflow orchestration
    ├── /calendar   - Calendar and event management
    ├── /reminders  - Smart reminders and notifications
    └── /execution  - Action execution and tracking
```

---

## 📚 Routes

### Task Management (`/tasks`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create task |
| `/:userId` | GET | Get tasks (with filters) |
| `/:taskId` | PUT | Update task |
| `/:taskId/complete` | POST | Complete task |
| `/:taskId/subtask` | POST | Add subtask |
| `/:taskId/subtask/:subtaskId` | PUT | Toggle subtask |
| `/:taskId` | DELETE | Delete task |
| `/project` | POST | Create project |
| `/project/:userId` | GET | Get projects |
| `/:userId/matrix` | GET | Get Eisenhower matrix |
| `/priorities/all` | GET | Get priorities |

**Priorities:**
- Urgent & Important (Red) - Do immediately
- Important, Not Urgent (Orange) - Schedule
- Urgent, Not Important (Blue) - Delegate
- Not Urgent, Not Important (Gray) - Eliminate

### Automation (`/automation`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create automation |
| `/:userId` | GET | Get automations |
| `/:automationId` | PUT | Update automation |
| `/:automationId/run` | POST | Run automation manually |
| `/:automationId` | DELETE | Delete automation |
| `/routine` | POST | Create routine |
| `/routine/:routineId/execute` | POST | Execute routine |
| `/routine/:userId` | GET | Get routines |
| `/types/all` | GET | Get automation types |
| `/suggestions/:userId` | GET | Get suggestions |

**Automation Types:** Scheduled, Triggered, Conditional, Recurring

**Actions:** Notification, Email, Task, Reminder, Calendar, Message, Data, Webhook

### Workflows (`/workflows`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create workflow |
| `/:userId` | GET | Get workflows |
| `/:workflowId/start` | POST | Start workflow |
| `/:workflowId/advance` | POST | Execute current step |
| `/templates/all` | GET | Get workflow templates |
| `/from-template/:templateId` | POST | Create from template |
| `/:workflowId` | DELETE | Delete workflow |

**Workflow Templates:**
- Employee Onboarding (5 steps)
- Content Publishing (5 steps)
- Lead Nurturing (5 steps)
- Project Kickoff (5 steps)

### Calendar (`/calendar`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create event |
| `/:userId` | GET | Get events |
| `/:userId/day` | GET | Get day view |
| `/:eventId` | PUT | Update event |
| `/:eventId` | DELETE | Delete event |
| `/:userId/availability` | POST | Check availability |
| `/:userId/recurring` | POST | Create recurring events |
| `/types/all` | GET | Get event types |

**Event Types:** Meeting, Task Due, Reminder, Appointment, Deadline, Event

### Reminders (`/reminders`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Create reminder |
| `/:userId` | GET | Get reminders |
| `/:reminderId/snooze` | POST | Snooze reminder |
| `/:reminderId/dismiss` | POST | Dismiss reminder |
| `/:reminderId/complete` | POST | Complete reminder |
| `/:reminderId` | DELETE | Delete reminder |
| `/smart` | POST | Create smart reminder |
| `/suggestions/:userId` | GET | Get suggestions |
| `/types/all` | GET | Get reminder types |

**Smart Reminders:** Location-based, Context-aware, Behavioral triggers

### Execution (`/execution`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/action` | POST | Execute single action |
| `/batch` | POST | Execute batch actions |
| `/schedule` | POST | Schedule action |
| `/:userId/scheduled` | GET | Get scheduled actions |
| `/:userId/history` | GET | Get execution history |
| `/:userId/stats` | GET | Get execution stats |
| `/scheduled/:executionId` | DELETE | Cancel scheduled |
| `/retry/:actionId` | POST | Retry failed action |
| `/types/all` | GET | Get action types |
| `/:userId/suggestions` | GET | Get suggestions |

**Action Types:** Send Email, Send Message, Create Task, Schedule Event, Make Call, Book Meeting, Set Reminder, Update Status, Share File, Post Content

---

## ⚡ Execution Capabilities

### Task Management
- Eisenhower Matrix prioritization
- Subtasks and dependencies
- Project organization
- Priority-based sorting
- Productivity scoring

### Automation
- Scheduled routines (daily, weekly)
- Trigger-based actions
- Conditional logic
- Routine execution tracking
- Streak monitoring

### Workflows
- Multi-step orchestration
- Template library
- Progress tracking
- Step-by-step execution
- Completion analytics

### Smart Reminders
- Time-based
- Location-based
- Context-aware
- Snooze functionality
- Smart suggestions

### Action Execution
- Single and batch execution
- Scheduling
- History tracking
- Retry failed actions
- Success rate analytics

---

## 🔗 Integration

**RTMN Integration:**
- Operations OS (5250) - Task and project management
- Genie Calendar (4709) - Scheduling
- Genie Memory Inbox (4710) - Universal capture
- Genie Briefing (4712) - Daily briefings

---

## 🚀 Quick Start

```bash
cd services/genie-execution-engine
npm install
npm start  # Port 4726
```

### Test Commands

```bash
# Create task
curl -X POST http://localhost:4726/tasks \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "title": "Complete report", "priority": "urgent-important"}'

# Get Eisenhower matrix
curl http://localhost:4726/tasks/user123/matrix

# Create automation
curl -X POST http://localhost:4726/automation \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "name": "Morning Briefing", "trigger": {"type": "time"}}'

# Create event
curl -X POST http://localhost:4726/calendar \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "title": "Team Meeting", "start": "2026-06-18T10:00:00Z"}'

# Execute action
curl -X POST http://localhost:4726/execution/action \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "actionType": "send-email", "config": {"to": "team@example.com"}}'
```

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| Task Priorities | 4 |
| Automation Types | 4 |
| Action Types | 10 |
| Event Types | 6 |
| Workflow Templates | 4 |
| Reminder Types | 4 |

---

## 🎯 Key Features

1. **Smart Prioritization**: Eisenhower Matrix for focused execution
2. **Powerful Automation**: Scheduled, triggered, and conditional automations
3. **Workflow Orchestration**: Multi-step processes with templates
4. **Intelligent Scheduling**: Conflict detection and availability checking
5. **Context-Aware Reminders**: Smart snoozing and suggestions
6. **Action Tracking**: Execution history and success metrics
7. **Batch Operations**: Execute multiple actions efficiently
8. **Retry Logic**: Automatic retry for failed actions

---

*Genie Execution Engine - Make It Happen*