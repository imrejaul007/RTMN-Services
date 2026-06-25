# Genie Client — Python SDK for HOJAI Genie OS

Official Python client for HOJAI Genie OS — the personal AI OS that orchestrates memory, productivity, health, relationships, and autonomous agents.

## Installation

```bash
pip install genie-client
```

With async support:

```bash
pip install "genie-client[async]"
```

## Quick Start

```python
from genie_client import GenieClient

# Connect to your Genie OS instance
client = GenieClient(base_url="http://localhost:7100")

# Sign up (one-time)
auth = client.auth.signup(
    name="Alice Sharma",
    email="alice@example.com",
    password="secure-password-123",
)
client.set_token(auth.token)
print(f"Welcome, {auth.user.name}!")

# Or log in with an existing account
client = GenieClient(base_url="http://localhost:7100")
auth = client.auth.login(email="alice@example.com", password="secure-password-123")
client.set_token(auth.token)

# Ask Genie anything
response = client.ask("What's my top 3 priorities today?")
print(response.answer)

# Capture a memory
memory = client.memory.capture(
    user_id="user-001",
    content="Meeting with Raj at 3pm about the product launch.",
    type="event",
    tags=["work", "meeting"],
)
print(f"Memory saved: {memory.id}")

# Search memories
results = client.memory.search("product launch", user_id="user-001")
for m in results:
    print(f"  [{m.type}] {m.content}")

# Get your briefing
briefing = client.briefing.get("user-001")
print(f"Good {briefing.greeting}")
print(f"  Active goals: {briefing.active_goals}")
print(f"  Habits done: {briefing.habits_done_today}/{briefing.habits_done_today}")

# PIOS Health — are all services up?
health = client.pios_health()
print(f"Services: {health.up}/{health.total} up")
for svc in health.services:
    print(f"  {svc.name}: {svc.status}")
```

## Authentication

Genie OS uses JWT tokens. Get one via `signup()` or `login()`:

```python
client = GenieClient(base_url="http://localhost:7100")
auth = client.auth.login(email="alice@example.com", password="...")
client.set_token(auth.token)
```

Store the token securely (e.g. environment variable or a secrets manager) and reuse it:

```python
import os
client = GenieClient(
    base_url=os.environ["GENIE_BASE_URL"],
    token=os.environ["GENIE_TOKEN"],
)
```

## Admin Operations

Admin endpoints require an admin-role token:

```python
client.set_token("your-admin-token")

# List all users
user_list = client.admin.list_users(page=1, page_size=50)
for user in user_list.users:
    print(f"{user.name} <{user.email}> [{user.role}]")

# Change a user's role
client.admin.update_role("user-123", "admin")

# Deactivate a user
client.admin.deactivate("user-456")

# Platform usage stats
usage = client.admin.usage(period="week")
print(f"Total requests this week: {usage.total_requests}")
print(f"Active users: {usage.active_users}")

# Audit log
log = client.admin.audit_log(action="role_changed", page_size=20)
for entry in log.entries:
    print(f"{entry.timestamp}: {entry.action} by {entry.user_email}")

# Runtime metrics
metrics = client.admin.metrics()
print(f"Uptime: {metrics.uptime_seconds:.0f}s | Heap: {metrics.memory_heap_used_mb:.1f}MB")
print(f"MongoDB: {'✅' if metrics.mongo_connected else '❌'}")
```

## Memory API

```python
# Capture different types of memories
client.memory.capture(user_id="user-001", content="...", type="note")
client.memory.capture(user_id="user-001", content="...", type="voice", source="whatsapp")
client.memory.capture(user_id="user-001", content="...", type="person", tags=["friend"])

# Recent memories
recent = client.memory.recent("user-001", limit=10)

# Knowledge graph
graph = client.memory.graph("user-001")
print(f"Knowledge nodes: {graph.knowledge_count}")
print(f"Relationships: {graph.relationships_count}")

# Search
results = client.memory.search("quarterly report", user_id="user-001")
```

## PIOS — Personal Intelligence Operating System

```python
# Dashboard widget (all-in-one)
widget = client.pios_widget("user-001")
if widget.pi_score:
    print(f"PI Score: {widget.pi_score.score}/100")
print(f"Calendar events today: {len(widget.calendar.get('events', []))}")
print(f"Tasks remaining: {len(widget.tasks.get('pending', []))}")

# Per-service data
health_today = client.pios_health_today("user-001")
calendar_today = client.pios_calendar_today("user-001")
tasks_today = client.pios_tasks_today("user-001")

# Skills catalog
catalog = client.pios_skills_catalog()
installed = client.pios_skills_installed("user-001")

# Install a skill
client.pios_install_skill("user-001", skill_id="email-summary-v2")
```

## Error Handling

```python
from genie_client import (
    GenieClient,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
    GenieError,
)

client = GenieClient(base_url="http://localhost:7100", token="...")

try:
    response = client.ask("Hello")
except AuthenticationError:
    print("Token expired — please log in again")
except AuthorizationError:
    print("You don't have permission for this")
except NotFoundError:
    print("Resource not found")
except ValidationError as e:
    print(f"Bad request: {e}")
except GenieError as e:
    print(f"Unexpected error: {e.status_code} — {e}")
```

## Models Reference

All API responses are typed with Pydantic v2 models:

| Model | Description |
|---|---|
| `User` | User profile with role, goals, onboarding status |
| `AuthResponse` | Token + user from signup/login |
| `AskResponse` | Answer from Genie with sources |
| `Briefing` | Daily briefing (weather, goals, memories, calendar) |
| `Memory` | Captured memory with type, tags, importance |
| `MemoryGraph` | Knowledge graph stats |
| `PiScore` | Productivity & Wellbeing Index (0–100) |
| `WidgetData` | Aggregated PIOS dashboard data |
| `HealthData` | Service health with per-service status |
| `UsageStats` | Platform usage by action, role, top users |
| `AuditLogEntry` | Single audit log record |
| `RuntimeMetrics` | Process metrics (PID, memory, MongoDB) |

## API Base URL

By default, the SDK connects to `http://localhost:7100`. Set the base URL to match your deployment:

```python
# Local development
client = GenieClient(base_url="http://localhost:7100")

# Production
client = GenieClient(base_url="https://api.hojai.ai")

# Docker/Kubernetes internal
client = GenieClient(base_url="http://genie-os:7100")
```
