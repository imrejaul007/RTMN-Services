"""
Unit tests for genie_client using unittest.TestCase (stdlib only).
"""

from __future__ import annotations

import json
import sys
import unittest
from http import HTTPStatus
from typing import Any, Dict, Generator, Optional
from unittest.mock import MagicMock, patch

sys.path.insert(0, "src")

from genie_client import (
    AuthResponse,
    Briefing,
    GenieClient,
    HealthData,
    Memory,
    MemoryGraph,
    PiScore,
    RuntimeMetrics,
    User,
)
from genie_client.client import (
    AuthenticationError,
    AuthorizationError,
    GenieError,
    NotFoundError,
    ValidationError,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_response(
    status_code: int,
    json_data: Optional[Dict[str, Any]] = None,
    text: str = "",
) -> MagicMock:
    """Build a mock httpx.Response with the given JSON body."""
    resp = MagicMock()
    resp.status_code = status_code
    if json_data is not None:
        resp.json.return_value = json_data
        resp.text = json.dumps(json_data)
    else:
        resp.json.side_effect = ValueError("no json")
        resp.text = text
    return resp


def _mock_http_client(responses: list[Dict[str, Any]]) -> MagicMock:
    """Return a mock httpx.Client whose post/get/put return responses in order."""
    client = MagicMock()
    idx = [0]

    def mock_get(path: str, **kwargs) -> MagicMock:
        i = idx[0]
        idx[0] += 1
        return _mock_response(**responses[i])

    def mock_post(path: str, **kwargs) -> MagicMock:
        i = idx[0]
        idx[0] += 1
        return _mock_response(**responses[i])

    def mock_put(path: str, **kwargs) -> MagicMock:
        i = idx[0]
        idx[0] += 1
        return _mock_response(**responses[i])

    client.get = MagicMock(side_effect=mock_get)
    client.post = MagicMock(side_effect=mock_post)
    client.put = MagicMock(side_effect=mock_put)
    return client


class _MockHttpContext:
    """A context-manager-compatible mock for _http()."""

    def __init__(self, mock_client: MagicMock):
        self._client = mock_client

    def __enter__(self):
        return self._client

    def __exit__(self, *args):
        pass


def _make_client_with_responses(responses: list[Dict[str, Any]]) -> GenieClient:
    """Create a GenieClient whose _http() yields a mock httpx.Client."""
    client = GenieClient(base_url="http://localhost:7100")
    mock = _mock_http_client(responses)
    client._http = lambda: _MockHttpContext(mock)
    return client


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

def test_signup():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "token": "tok-u001-alice",
            "user": {"id": "u001", "email": "alice@example.com", "name": "Alice Sharma", "role": "user"},
        }},
    ])
    auth = client.auth.signup(name="Alice Sharma", email="alice@example.com", password="secret123")
    assert auth.token == "tok-u001-alice"
    assert auth.user.email == "alice@example.com"
    assert auth.user.name == "Alice Sharma"
    assert auth.user.id == "u001"


def test_signup_with_goals():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "token": "tok-u002-bob",
            "user": {"id": "u002", "email": "bob@example.com", "name": "Bob Kumar", "role": "user"},
        }},
    ])
    auth = client.auth.signup(name="Bob Kumar", email="bob@example.com", password="pass123", goals=["health", "finance"])
    assert auth.user.id == "u002"


def test_login_success():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "token": "tok-u003-charlie",
            "user": {"id": "u003", "email": "charlie@example.com", "name": "Charlie", "role": "admin"},
        }},
    ])
    auth = client.auth.login(email="charlie@example.com", password="secret123")
    assert auth.token == "tok-u003-charlie"
    assert auth.user.role.value == "admin"


def test_login_wrong_password():
    client = _make_client_with_responses([
        {"status_code": 401, "json_data": {"error": "Invalid credentials"}},
    ])
    with pytest.raises(AuthenticationError) as exc:
        client.auth.login(email="alice@example.com", password="wrong")
    assert exc.value.status_code == 401


def test_me():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "user": {"id": "u001", "email": "alice@example.com", "name": "Alice", "role": "user"},
        }},
    ])
    me = client.auth.me()
    assert me.email == "alice@example.com"
    assert me.id == "u001"


def test_onboarding_set_goals():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {"success": True}},
    ])
    result = client.onboarding.set_goals(["health", "learning", "finance"])
    assert result.success


# ---------------------------------------------------------------------------
# Core ask tests
# ---------------------------------------------------------------------------

def test_ask():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "answer": "Based on your data, your top priority is: Review Q3 roadmap.",
            "sources": ["calendar", "memory"],
            "suggested_actions": [{"label": "Open calendar", "action": "calendar"}],
        }},
    ])
    resp = client.ask("What's my top priority today?")
    assert "priority" in resp.answer
    assert "calendar" in resp.sources
    assert len(resp.suggested_actions) == 1


def test_ask_with_context():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "answer": "Here is the summary you requested.",
            "sources": ["memory"],
            "suggested_actions": [],
        }},
    ])
    resp = client.ask("Summarize my week", context={"focus": "work"})
    assert "summary" in resp.answer.lower()


# ---------------------------------------------------------------------------
# Memory tests
# ---------------------------------------------------------------------------

def test_memory_capture():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "id": "mem-0001",
            "userId": "u001",
            "type": "event",
            "content": "Met with Raj about the product launch.",
            "tags": ["work", "meeting"],
            "title": None,
            "source": "voice",
            "importance": 8,
            "createdAt": "2026-06-25T10:00:00Z",
        }},
    ])
    mem = client.memory.capture(
        user_id="u001",
        content="Met with Raj about the product launch.",
        type="event",
        tags=["work", "meeting"],
        source="voice",
        importance=8,
    )
    assert mem.id == "mem-0001"
    assert mem.type == "event"
    assert "Raj" in mem.content
    assert mem.tags == ["work", "meeting"]


def test_memory_recent():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": [
                {"id": "mem-0001", "type": "note", "content": "Buy groceries", "tags": []},
                {"id": "mem-0002", "type": "note", "content": "Call mom", "tags": ["family"]},
            ]
        }},
    ])
    recent = client.memory.recent("u001", limit=10)
    assert len(recent) == 2
    assert recent[0].id == "mem-0001"


def test_memory_search():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": [
                {"id": "mem-0003", "type": "note", "content": "Q3 financial review", "tags": ["finance"]},
            ]
        }},
    ])
    results = client.memory.search("financial", user_id="u001")
    assert len(results) == 1
    assert results[0].id == "mem-0003"


def test_memory_graph():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "identity": {"name": "Alice", "userId": "u001"},
            "knowledgeCount": 142,
            "relationshipsCount": 38,
            "activeGoals": 5,
        }},
    ])
    graph = client.memory.graph("u001")
    assert graph.knowledge_count == 142
    assert graph.relationships_count == 38
    assert graph.active_goals == 5
    assert graph.identity.name == "Alice"


# ---------------------------------------------------------------------------
# Briefing tests
# ---------------------------------------------------------------------------

def test_briefing_get():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "greeting": "Good morning",
            "date": "2026-06-25",
            "activeGoals": 3,
            "recentMemories": [],
            "insights": ["You're trending up this week."],
            "calendarEvents": [],
            "todosToday": 5,
            "habitsDoneToday": 2,
            "habitsDoneToday": 2,
        }},
    ])
    b = client.briefing.get("u001")
    assert b.greeting == "Good morning"
    assert b.active_goals == 3
    assert b.todos_today == 5
    assert b.habits_done_today == 2


# ---------------------------------------------------------------------------
# PIOS Health tests
# ---------------------------------------------------------------------------

def test_pios_health():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "data": {
                "total": 3,
                "up": 2,
                "down": 1,
                "voiceOSEnabled": True,
                "razoEnabled": False,
                "services": [
                    {"name": "intent-engine", "status": "up", "latencyMs": 12.3, "httpStatus": 200},
                    {"name": "memory-substrate", "status": "up", "latencyMs": 8.1, "httpStatus": 200},
                    {"name": "pi-score", "status": "down", "error": "connection refused", "httpStatus": None},
                ],
            },
            "meta": {"timestamp": "2026-06-25T10:00:00Z"},
        }},
    ])
    health = client.pios_health()
    assert health.total == 3
    assert health.up == 2
    assert health.down == 1
    assert health.voice_os_enabled
    assert not health.razo_enabled
    assert len(health.services) == 3
    down = [s for s in health.services if s.status.value == "down"][0]
    assert down.name == "pi-score"


# ---------------------------------------------------------------------------
# Skills tests
# ---------------------------------------------------------------------------

def test_skills_catalog():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": [
                {"id": "email-summary-v2", "name": "Email Summary", "version": "2.0"},
                {"id": "smart-calendar", "name": "Smart Calendar", "version": "1.5"},
            ]
        }},
    ])
    catalog = client.pios_skills_catalog()
    assert "data" in catalog
    assert len(catalog["data"]) == 2


def test_skills_installed():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": [
                {"id": "email-summary-v2", "name": "Email Summary"},
            ]
        }},
    ])
    installed = client.pios_skills_installed("u001")
    assert "data" in installed
    assert len(installed["data"]) == 1


# ---------------------------------------------------------------------------
# Admin tests
# ---------------------------------------------------------------------------

def test_admin_list_users():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "users": [
                {"id": "u001", "email": "alice@example.com", "name": "Alice", "role": "admin"},
                {"id": "u002", "email": "bob@example.com", "name": "Bob", "role": "user"},
            ],
            "total": 2,
            "page": 1,
            "pageSize": 20,
        }},
    ])
    result = client.admin.list_users()
    assert len(result.users) == 2
    assert result.total == 2
    assert result.users[0].role.value == "admin"


def test_admin_update_role():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "user": {
                "id": "u002",
                "email": "bob@example.com",
                "name": "Bob",
                "role": "admin",
            },
        }},
    ])
    user = client.admin.update_role("u002", "admin")
    assert user.role.value == "admin"


def test_admin_deactivate():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "userId": "u002",
            "active": False,
        }},
    ])
    result = client.admin.deactivate("u002")
    assert result.user_id == "u002"
    assert not result.active


def test_admin_reactivate():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "userId": "u002",
            "active": True,
        }},
    ])
    result = client.admin.reactivate("u002")
    assert result.active


def test_admin_usage():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "period": "week",
            "totalRequests": 1523,
            "activeUsers": 47,
            "byAction": {"ask": 800, "memory_capture": 400, "login": 323},
            "byRole": {"user": 1200, "admin": 323},
            "topUsers": [],
        }},
    ])
    usage = client.admin.usage(period="week")
    assert usage.total_requests == 1523
    assert usage.active_users == 47
    assert usage.by_action["ask"] == 800
    assert usage.by_role["admin"] == 323


def test_admin_audit_log():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "entries": [
                {
                    "id": "aud-001",
                    "timestamp": "2026-06-25T10:00:00Z",
                    "action": "role_changed",
                    "userId": "u001",
                    "userEmail": "alice@example.com",
                    "details": {"target": "u002", "from": "user", "to": "admin"},
                },
            ],
            "total": 1,
            "page": 1,
            "pageSize": 50,
        }},
    ])
    log = client.admin.audit_log(action="role_changed")
    assert len(log.entries) == 1
    assert log.entries[0].action == "role_changed"
    assert log.entries[0].user_email == "alice@example.com"


def test_admin_metrics():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "pid": 12345,
            "uptimeSeconds": 86400.5,
            "memoryHeapUsed": 128.4,
            "memoryHeapTotal": 256.0,
            "memoryRss": 180.2,
            "mongoConnected": True,
            "timestamp": "2026-06-25T10:00:00Z",
        }},
    ])
    metrics = client.admin.metrics()
    assert metrics.pid == 12345
    assert metrics.uptime_seconds == 86400.5
    assert metrics.memory_heap_used_mb == 128.4
    assert metrics.mongo_connected


def test_admin_service_health():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "data": {
                "total": 25,
                "up": 23,
                "services": [
                    {"name": "intent-engine", "status": "up", "latencyMs": 5.1},
                    {"name": "pi-score", "status": "degraded", "latencyMs": 1200.0},
                    {"name": "unknown-svc", "status": "down", "error": "timeout"},
                ],
            },
            "meta": {"timestamp": "2026-06-25T10:00:00Z"},
        }},
    ])
    svcs = client.admin.service_health()
    assert len(svcs) == 3
    up = [s for s in svcs if s.status.value == "up"][0]
    assert up.name == "intent-engine"
    degraded = [s for s in svcs if s.status.value == "degraded"][0]
    assert degraded.name == "pi-score"


def test_admin_forbidden():
    client = _make_client_with_responses([
        {"status_code": 403, "json_data": {"error": "Forbidden"}},
    ])
    with pytest.raises(AuthorizationError):
        client.admin.list_users()


# ---------------------------------------------------------------------------
# Error handling tests
# ---------------------------------------------------------------------------

def test_404_raises_not_found():
    client = _make_client_with_responses([
        {"status_code": 404, "json_data": {"error": "not_found"}},
    ])
    with pytest.raises(NotFoundError):
        client.briefing.get("nonexistent")


def test_400_raises_validation():
    client = _make_client_with_responses([
        {"status_code": 400, "json_data": {"error": {"code": "VALIDATION_ERROR", "message": "Invalid input"}}},
    ])
    with pytest.raises(ValidationError):
        client.auth.signup(name="", email="bad", password="short")


def test_generic_error():
    client = _make_client_with_responses([
        {"status_code": 500, "json_data": {"error": "Internal server error"}},
    ])
    with pytest.raises(GenieError) as exc:
        client.ask("test")
    assert exc.value.status_code == 500


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def test_is_authenticated():
    client = GenieClient(base_url="http://localhost:7100")
    assert not client.is_authenticated
    client.set_token("tok-test-123")
    assert client.is_authenticated
    # Setting None clears it
    client.set_token(None)
    assert not client.is_authenticated


def test_set_token_updates_header():
    client = GenieClient(base_url="http://localhost:7100", token="tok-old")
    assert client._token == "tok-old"
    client.set_token("tok-new")
    assert client._token == "tok-new"


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

def test_user_is_admin():
    from genie_client.models import User
    admin = User.model_validate({"id": "u1", "email": "a@b.com", "name": "A", "role": "admin"})
    org_admin = User.model_validate({"id": "u2", "email": "b@c.com", "name": "B", "role": "org_admin"})
    super_admin = User.model_validate({"id": "u3", "email": "c@d.com", "name": "C", "role": "super_admin"})
    regular = User.model_validate({"id": "u4", "email": "d@e.com", "name": "D", "role": "user"})
    assert admin.is_admin
    assert org_admin.is_admin
    assert super_admin.is_admin
    assert not regular.is_admin


def test_pi_score_model():
    ps = PiScore.model_validate({
        "score": 85.5,
        "productivity": 80,
        "wellbeing": 90,
        "relationships": 75,
        "learning": 95,
        "trend": "improving",
        "breakdown": {"focus": 0.8, "consistency": 0.9},
    })
    assert ps.score == 85.5
    assert ps.trend == "improving"
    assert ps.breakdown["focus"] == 0.8


def test_runtime_metrics_model():
    m = RuntimeMetrics.model_validate({
        "pid": 12345,
        "uptimeSeconds": 86400.5,
        "memoryHeapUsed": 128.4,
        "memoryHeapTotal": 256.0,
        "memoryRss": 180.2,
        "mongoConnected": True,
        "timestamp": "2026-06-25T10:00:00Z",
    })
    assert m.pid == 12345
    assert m.uptime_seconds == 86400.5
    assert m.memory_heap_used_mb == 128.4
    assert m.mongo_connected is True


def test_memory_model_alias():
    mem = Memory.model_validate({
        "id": "mem-1",
        "type": "note",
        "content": "Test memory",
        "createdAt": "2026-06-25T10:00:00Z",
    })
    assert mem.created_at == "2026-06-25T10:00:00Z"
    assert mem.type == "note"


def test_health_data_alias():
    hd = HealthData.model_validate({
        "total": 10,
        "up": 8,
        "down": 2,
        "voiceOSEnabled": True,
        "razoEnabled": False,
        "services": [],
    })
    assert hd.voice_os_enabled
    assert not hd.razo_enabled
    assert hd.total == 10


# ---------------------------------------------------------------------------
# PIOS endpoint tests
# ---------------------------------------------------------------------------

def test_pios_widget():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "data": {
                "piScore": {"score": 72},
                "calendar": {"events": [{"id": "ev-1", "title": "Team standup"}]},
                "tasks": {"pending": [{"id": "t-1", "title": "Review PR"}]},
                "health": None,
            },
        }},
    ])
    widget = client.pios_widget("u001")
    assert widget.pi_score.score == 72
    assert len(widget.calendar.get("events", [])) == 1


def test_pios_schedule():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": {
                "events": [{"id": "ev-1", "title": "Sprint planning"}],
                "tasks": [],
            }
        }},
    ])
    schedule = client.pios_schedule("u001", tz="Asia/Kolkata")
    assert "data" in schedule


def test_pios_health_today():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "data": {
                "steps": 8500,
                "sleep_hours": 7.5,
                "water_ml": 2000,
            },
        }},
    ])
    health = client.pios_health_today("u001")
    assert health["steps"] == 8500


def test_serendipity():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "success": True,
            "data": [
                {"id": "mem-old", "content": "You visited Goa in 2024"},
            ],
        }},
    ])
    items = client.serendipity()
    assert len(items) == 1


def test_relationships_dashboard():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": {
                "topContacts": [{"name": "Raj", "interactions": 42}],
                "nurtureScore": 78,
            },
        }},
    ])
    dash = client.relationships_dashboard("u001")
    assert "data" in dash


def test_install_skill():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {"success": True, "installed": True}},
    ])
    result = client.pios_install_skill("u001", "email-summary-v2", {"frequency": "daily"})
    assert result.get("installed") is True or result.get("success") is True


def test_long_running_tasks():
    client = _make_client_with_responses([
        {"status_code": 200, "json_data": {
            "data": [
                {"id": "lrt-1", "status": "running", "progress": 45},
            ],
        }},
    ])
    tasks = client.pios_long_running_tasks("u001")
    assert "data" in tasks
