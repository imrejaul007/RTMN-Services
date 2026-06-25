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
# Helpers (module-level — no self needed)
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
# Tests
# ---------------------------------------------------------------------------

class TestGenieClient(unittest.TestCase):

    # ---------------------------------------------------------------------------
    # Auth tests
    # ---------------------------------------------------------------------------

    def test_signup(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "token": "tok-u001-alice",
                "user": {"id": "u001", "email": "alice@example.com", "name": "Alice Sharma", "role": "user"},
            }},
        ])
        auth = client.auth.signup(name="Alice Sharma", email="alice@example.com", password="secret123")
        self.assertEqual(auth.token, "tok-u001-alice")
        self.assertEqual(auth.user.email, "alice@example.com")
        self.assertEqual(auth.user.name, "Alice Sharma")
        self.assertEqual(auth.user.id, "u001")

    def test_signup_with_goals(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "token": "tok-u002-bob",
                "user": {"id": "u002", "email": "bob@example.com", "name": "Bob Kumar", "role": "user"},
            }},
        ])
        auth = client.auth.signup(name="Bob Kumar", email="bob@example.com", password="pass123", goals=["health", "finance"])
        self.assertEqual(auth.user.id, "u002")

    def test_login_success(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "token": "tok-u003-charlie",
                "user": {"id": "u003", "email": "charlie@example.com", "name": "Charlie", "role": "admin"},
            }},
        ])
        auth = client.auth.login(email="charlie@example.com", password="secret123")
        self.assertEqual(auth.token, "tok-u003-charlie")
        self.assertEqual(auth.user.role.value, "admin")

    def test_login_wrong_password(self):
        client = _make_client_with_responses([
            {"status_code": 401, "json_data": {"error": "Invalid credentials"}},
        ])
        with self.assertRaises(AuthenticationError) as exc:
            client.auth.login(email="alice@example.com", password="wrong")
        self.assertEqual(exc.exception.status_code, 401)

    def test_me(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "user": {"id": "u001", "email": "alice@example.com", "name": "Alice", "role": "user"},
            }},
        ])
        me = client.auth.me()
        self.assertEqual(me.email, "alice@example.com")
        self.assertEqual(me.id, "u001")

    def test_onboarding_set_goals(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {"success": True}},
        ])
        result = client.onboarding.set_goals(["health", "learning", "finance"])
        self.assertTrue(result.success)

    # ---------------------------------------------------------------------------
    # Core ask tests
    # ---------------------------------------------------------------------------

    def test_ask(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "answer": "Based on your data, your top priority is: Review Q3 roadmap.",
                "sources": ["calendar", "memory"],
                "suggested_actions": [{"label": "Open calendar", "action": "calendar"}],
            }},
        ])
        resp = client.ask("What's my top priority today?")
        self.assertIn("priority", resp.answer)
        self.assertIn("calendar", resp.sources)
        self.assertEqual(len(resp.suggested_actions), 1)

    def test_ask_with_context(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "answer": "Here is the summary you requested.",
                "sources": ["memory"],
                "suggested_actions": [],
            }},
        ])
        resp = client.ask("Summarize my week", context={"focus": "work"})
        self.assertIn("summary", resp.answer.lower())

    # ---------------------------------------------------------------------------
    # Memory tests
    # ---------------------------------------------------------------------------

    def test_memory_capture(self):
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
        self.assertEqual(mem.id, "mem-0001")
        self.assertEqual(mem.type, "event")
        self.assertIn("Raj", mem.content)
        self.assertEqual(mem.tags, ["work", "meeting"])

    def test_memory_recent(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": [
                    {"id": "mem-0001", "type": "note", "content": "Buy groceries", "tags": []},
                    {"id": "mem-0002", "type": "note", "content": "Call mom", "tags": ["family"]},
                ]
            }},
        ])
        recent = client.memory.recent("u001", limit=10)
        self.assertEqual(len(recent), 2)
        self.assertEqual(recent[0].id, "mem-0001")

    def test_memory_search(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": [
                    {"id": "mem-0003", "type": "note", "content": "Q3 financial review", "tags": ["finance"]},
                ]
            }},
        ])
        results = client.memory.search("financial", user_id="u001")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].id, "mem-0003")

    def test_memory_graph(self):
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
        self.assertEqual(graph.knowledge_count, 142)
        self.assertEqual(graph.relationships_count, 38)
        self.assertEqual(graph.active_goals, 5)
        self.assertEqual(graph.identity.name, "Alice")

    # ---------------------------------------------------------------------------
    # Briefing tests
    # ---------------------------------------------------------------------------

    def test_briefing_get(self):
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
            }},
        ])
        b = client.briefing.get("u001")
        self.assertEqual(b.greeting, "Good morning")
        self.assertEqual(b.active_goals, 3)
        self.assertEqual(b.todos_today, 5)
        self.assertEqual(b.habits_done_today, 2)

    # ---------------------------------------------------------------------------
    # PIOS Health tests
    # ---------------------------------------------------------------------------

    def test_pios_health(self):
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
        self.assertEqual(health.total, 3)
        self.assertEqual(health.up, 2)
        self.assertEqual(health.down, 1)
        self.assertTrue(health.voice_os_enabled)
        self.assertFalse(health.razo_enabled)
        self.assertEqual(len(health.services), 3)
        down = [s for s in health.services if s.status.value == "down"][0]
        self.assertEqual(down.name, "pi-score")

    # ---------------------------------------------------------------------------
    # Skills tests
    # ---------------------------------------------------------------------------

    def test_skills_catalog(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": [
                    {"id": "email-summary-v2", "name": "Email Summary", "version": "2.0"},
                    {"id": "smart-calendar", "name": "Smart Calendar", "version": "1.5"},
                ]
            }},
        ])
        catalog = client.pios_skills_catalog()
        self.assertIn("data", catalog)
        self.assertEqual(len(catalog["data"]), 2)

    def test_skills_installed(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": [
                    {"id": "email-summary-v2", "name": "Email Summary"},
                ]
            }},
        ])
        installed = client.pios_skills_installed("u001")
        self.assertIn("data", installed)
        self.assertEqual(len(installed["data"]), 1)

    # ---------------------------------------------------------------------------
    # Admin tests
    # ---------------------------------------------------------------------------

    def test_admin_list_users(self):
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
        self.assertEqual(len(result.users), 2)
        self.assertEqual(result.total, 2)
        self.assertEqual(result.users[0].role.value, "admin")

    def test_admin_update_role(self):
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
        self.assertEqual(user.role.value, "admin")

    def test_admin_deactivate(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "userId": "u002",
                "active": False,
            }},
        ])
        result = client.admin.deactivate("u002")
        self.assertEqual(result.user_id, "u002")
        self.assertFalse(result.active)

    def test_admin_reactivate(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "userId": "u002",
                "active": True,
            }},
        ])
        result = client.admin.reactivate("u002")
        self.assertTrue(result.active)

    def test_admin_usage(self):
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
        self.assertEqual(usage.total_requests, 1523)
        self.assertEqual(usage.active_users, 47)
        self.assertEqual(usage.by_action["ask"], 800)
        self.assertEqual(usage.by_role["admin"], 323)

    def test_admin_audit_log(self):
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
        self.assertEqual(len(log.entries), 1)
        self.assertEqual(log.entries[0].action, "role_changed")
        self.assertEqual(log.entries[0].user_email, "alice@example.com")

    def test_admin_metrics(self):
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
        self.assertEqual(metrics.pid, 12345)
        self.assertEqual(metrics.uptime_seconds, 86400.5)
        self.assertEqual(metrics.memory_heap_used_mb, 128.4)
        self.assertTrue(metrics.mongo_connected)

    def test_admin_service_health(self):
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
        self.assertEqual(len(svcs), 3)
        up = [s for s in svcs if s.status.value == "up"][0]
        self.assertEqual(up.name, "intent-engine")
        degraded = [s for s in svcs if s.status.value == "degraded"][0]
        self.assertEqual(degraded.name, "pi-score")

    def test_admin_forbidden(self):
        client = _make_client_with_responses([
            {"status_code": 403, "json_data": {"error": "Forbidden"}},
        ])
        with self.assertRaises(AuthorizationError):
            client.admin.list_users()

    # ---------------------------------------------------------------------------
    # Error handling tests
    # ---------------------------------------------------------------------------

    def test_404_raises_not_found(self):
        client = _make_client_with_responses([
            {"status_code": 404, "json_data": {"error": "not_found"}},
        ])
        with self.assertRaises(NotFoundError):
            client.briefing.get("nonexistent")

    def test_400_raises_validation(self):
        client = _make_client_with_responses([
            {"status_code": 400, "json_data": {"error": {"code": "VALIDATION_ERROR", "message": "Invalid input"}}},
        ])
        with self.assertRaises(ValidationError):
            client.auth.signup(name="", email="bad", password="short")

    def test_generic_error(self):
        client = _make_client_with_responses([
            {"status_code": 500, "json_data": {"error": "Internal server error"}},
        ])
        with self.assertRaises(GenieError) as exc:
            client.ask("test")
        self.assertEqual(exc.exception.status_code, 500)

    # ---------------------------------------------------------------------------
    # Token management
    # ---------------------------------------------------------------------------

    def test_is_authenticated(self):
        client = GenieClient(base_url="http://localhost:7100")
        self.assertFalse(client.is_authenticated)
        client.set_token("tok-test-123")
        self.assertTrue(client.is_authenticated)
        client.set_token(None)
        self.assertFalse(client.is_authenticated)

    def test_set_token_updates_header(self):
        client = GenieClient(base_url="http://localhost:7100", token="tok-old")
        self.assertEqual(client._token, "tok-old")
        client.set_token("tok-new")
        self.assertEqual(client._token, "tok-new")

    # ---------------------------------------------------------------------------
    # Model tests
    # ---------------------------------------------------------------------------

    def test_user_is_admin(self):
        from genie_client.models import User
        admin = User.model_validate({"id": "u1", "email": "a@b.com", "name": "A", "role": "admin"})
        org_admin = User.model_validate({"id": "u2", "email": "b@c.com", "name": "B", "role": "org_admin"})
        super_admin = User.model_validate({"id": "u3", "email": "c@d.com", "name": "C", "role": "super_admin"})
        regular = User.model_validate({"id": "u4", "email": "d@e.com", "name": "D", "role": "user"})
        self.assertTrue(admin.is_admin)
        self.assertTrue(org_admin.is_admin)
        self.assertTrue(super_admin.is_admin)
        self.assertFalse(regular.is_admin)

    def test_pi_score_model(self):
        ps = PiScore.model_validate({
            "score": 85.5,
            "productivity": 80,
            "wellbeing": 90,
            "relationships": 75,
            "learning": 95,
            "trend": "improving",
            "breakdown": {"focus": 0.8, "consistency": 0.9},
        })
        self.assertEqual(ps.score, 85.5)
        self.assertEqual(ps.trend, "improving")
        self.assertEqual(ps.breakdown["focus"], 0.8)

    def test_runtime_metrics_model(self):
        m = RuntimeMetrics.model_validate({
            "pid": 12345,
            "uptimeSeconds": 86400.5,
            "memoryHeapUsed": 128.4,
            "memoryHeapTotal": 256.0,
            "memoryRss": 180.2,
            "mongoConnected": True,
            "timestamp": "2026-06-25T10:00:00Z",
        })
        self.assertEqual(m.pid, 12345)
        self.assertEqual(m.uptime_seconds, 86400.5)
        self.assertEqual(m.memory_heap_used_mb, 128.4)
        self.assertIs(m.mongo_connected, True)

    def test_memory_model_alias(self):
        mem = Memory.model_validate({
            "id": "mem-1",
            "type": "note",
            "content": "Test memory",
            "createdAt": "2026-06-25T10:00:00Z",
        })
        self.assertEqual(mem.created_at, "2026-06-25T10:00:00Z")
        self.assertEqual(mem.type, "note")

    def test_health_data_alias(self):
        hd = HealthData.model_validate({
            "total": 10,
            "up": 8,
            "down": 2,
            "voiceOSEnabled": True,
            "razoEnabled": False,
            "services": [],
        })
        self.assertTrue(hd.voice_os_enabled)
        self.assertFalse(hd.razo_enabled)
        self.assertEqual(hd.total, 10)

    # ---------------------------------------------------------------------------
    # PIOS endpoint tests
    # ---------------------------------------------------------------------------

    def test_pios_widget(self):
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
        self.assertEqual(widget.pi_score.score, 72)
        self.assertEqual(len(widget.calendar.get("events", [])), 1)

    def test_pios_schedule(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": {
                    "events": [{"id": "ev-1", "title": "Sprint planning"}],
                    "tasks": [],
                }
            }},
        ])
        schedule = client.pios_schedule("u001", tz="Asia/Kolkata")
        self.assertIn("data", schedule)

    def test_pios_health_today(self):
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
        self.assertEqual(health["steps"], 8500)

    def test_serendipity(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "success": True,
                "data": [
                    {"id": "mem-old", "content": "You visited Goa in 2024"},
                ],
            }},
        ])
        items = client.serendipity()
        self.assertEqual(len(items), 1)

    def test_relationships_dashboard(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": {
                    "topContacts": [{"name": "Raj", "interactions": 42}],
                    "nurtureScore": 78,
                },
            }},
        ])
        dash = client.relationships_dashboard("u001")
        self.assertIn("data", dash)

    def test_install_skill(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {"success": True, "installed": True}},
        ])
        result = client.pios_install_skill("u001", "email-summary-v2", {"frequency": "daily"})
        self.assertTrue(result.get("installed") or result.get("success"))

    def test_long_running_tasks(self):
        client = _make_client_with_responses([
            {"status_code": 200, "json_data": {
                "data": [
                    {"id": "lrt-1", "status": "running", "progress": 45},
                ],
            }},
        ])
        tasks = client.pios_long_running_tasks("u001")
        self.assertIn("data", tasks)


if __name__ == "__main__":
    unittest.main()
