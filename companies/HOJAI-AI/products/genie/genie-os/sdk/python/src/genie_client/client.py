"""
GenieClient — the main Python SDK client for HOJAI Genie OS.

Example usage::

    from genie_client import GenieClient

    # Authenticate
    client = GenieClient(base_url="http://localhost:7100")
    auth = client.auth.signup(name="Alice", email="alice@example.com", password="secret123")
    client.set_token(auth.token)

    # Or with an existing token
    client = GenieClient(base_url="http://localhost:7100", token="eyJ...")

    # Ask Genie
    response = client.ask("What's on my calendar today?")
    print(response.answer)

    # Admin operations
    client.set_token("admin-token")
    users = client.admin.list_users()
    for u in users:
        print(u.name, u.role)
"""

from __future__ import annotations

import json as _json
import time as _time
from contextlib import contextmanager
from typing import (
    Any,
    Dict,
    List,
    Optional,
    TypeVar,
)

import httpx

from genie_client import models as _models
from genie_client.models import (
    ApiResponse,
    AuditLogEntry,
    Briefing,
    HealthData,
    Memory,
    MemoryGraph,
    RuntimeMetrics,
    ServiceHealth,
    UsageStats,
    User,
)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class GenieError(Exception):
    """Base exception for all Genie client errors."""

    def __init__(self, message: str, status_code: int | None = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class AuthenticationError(GenieError):
    """Raised when authentication fails (401)."""


class AuthorizationError(GenieError):
    """Raised when the token lacks required permissions (403)."""


class NotFoundError(GenieError):
    """Raised when a resource is not found (404)."""


class ValidationError(GenieError):
    """Raised when request validation fails (400)."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _parse_body(body: Any, expected_type: type[T]) -> T:
    """Parse a JSON body into a Pydantic model."""
    if expected_type in (dict, list, str, int, float, bool, None):
        return body
    if isinstance(body, expected_type):
        return body
    if body is None:
        return None
    if expected_type == Any:
        return body
    return expected_type.model_validate(body)


def _handle_response(response: httpx.Response, expected_type: type[T]) -> T:
    """Convert an httpx response to a typed model or raise an exception."""
    if response.status_code == 401:
        raise AuthenticationError(
            "Authentication failed. Check your token.", status_code=401
        )
    if response.status_code == 403:
        raise AuthorizationError(
            "Insufficient permissions for this operation.", status_code=403
        )
    if response.status_code == 404:
        raise NotFoundError(
            "Resource not found.", status_code=404
        )
    if response.status_code == 400:
        body = response.json() if response.text else {}
        msg = body.get("error", {}).get("message") if isinstance(body, dict) else str(body)
        raise ValidationError(msg or "Validation error", status_code=400, body=body)

    if not (200 <= response.status_code < 300):
        body = response.json() if response.text else None
        raise GenieError(
            f"Request failed with status {response.status_code}",
            status_code=response.status_code,
            body=body,
        )

    try:
        body = response.json()
    except Exception:
        body = response.text

    if expected_type in (None, Any, type(None)):
        return None

    return _parse_body(body, expected_type)


# ---------------------------------------------------------------------------
# Sub-clients
# ---------------------------------------------------------------------------


class AuthClient:
    """Authentication: signup, login, me."""

    def __init__(self, _client: GenieClient):
        self._c = _client

    def signup(
        self,
        name: str,
        email: str,
        password: str,
        *,
        goals: Optional[List[str]] = None,
    ) -> _models.AuthResponse:
        """
        Create a new user account and return a JWT token.

        Args:
            name: Display name for the new user.
            email: Valid email address.
            password: Password (min 8 characters).
            goals: Optional list of user goals for onboarding.
        """
        payload = {
            "name": name,
            "email": email,
            "password": password,
        }
        if goals:
            payload["goals"] = goals

        with self._c._http() as http:
            r = http.post("/api/auth/signup", json=payload)
        return _handle_response(r, _models.AuthResponse)

    def login(self, email: str, password: str) -> _models.AuthResponse:
        """
        Authenticate with email + password and return a JWT token.

        Args:
            email: Registered email address.
            password: Account password.
        """
        payload = {"email": email, "password": password}
        with self._c._http() as http:
            r = http.post("/api/auth/login", json=payload)
        return _handle_response(r, _models.AuthResponse)

    def me(self) -> User:
        """Return the currently authenticated user's profile."""
        with self._c._http() as http:
            r = http.get("/api/auth/me")
        body = _handle_response(r, dict)
        # API returns { success, user } — unwrap to pass user dict to model
        if isinstance(body, dict) and "user" in body:
            return _parse_body(body["user"], User)
        return _parse_body(body, User)


class OnboardingClient:
    """Onboarding flow."""

    def __init__(self, _client: GenieClient):
        self._c = _client

    def set_goals(self, goals: List[str]) -> ApiResponse:
        """
        Save the user's selected goals (used during onboarding).

        Args:
            goals: List of goal strings the user selected.
        """
        with self._c._http() as http:
            r = http.post("/api/onboarding/goals", json={"goals": goals})
        return _handle_response(r, ApiResponse)


class BriefingClient:
    """Daily briefings (morning / evening / weekly)."""

    def __init__(self, _client: GenieClient):
        self._c = _client

    def get(self, user_id: str) -> Briefing:
        """
        Fetch the briefing for a user.

        Args:
            user_id: Target user ID.
        """
        with self._c._http() as http:
            r = http.get(f"/api/briefing/{user_id}")
        return _handle_response(r, Briefing)

    def morning(self, user_id: str) -> Briefing:
        """Fetch the morning briefing."""
        return self.get(user_id)

    def evening(self, user_id: str) -> Briefing:
        """Fetch the evening briefing."""
        return self.get(user_id)


class MemoryClient:
    """Personal memory — capture, search, graph, inbox."""

    def __init__(self, _client: GenieClient):
        self._c = _client

    def capture(
        self,
        user_id: str,
        content: str,
        type: str = "note",
        *,
        title: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source: Optional[str] = None,
        importance: Optional[float] = None,
    ) -> Memory:
        """
        Capture a new memory.

        Args:
            user_id: Owner user ID.
            content: The memory text.
            type: Memory type — note | photo | voice | event | person | place | idea.
            title: Optional short title.
            tags: Optional tag list.
            source: Optional source (e.g. "whatsapp", "voice").
            importance: Optional 0–10 score.
        """
        payload: Dict[str, Any] = {"userId": user_id, "content": content, "type": type}
        if title is not None:
            payload["title"] = title
        if tags is not None:
            payload["tags"] = tags
        if source is not None:
            payload["source"] = source
        if importance is not None:
            payload["importance"] = importance

        with self._c._http() as http:
            r = http.post("/api/genie-inbox/capture", json=payload)
        return _handle_response(r, Memory)

    def recent(self, user_id: str, limit: int = 10) -> List[Memory]:
        """
        Fetch recent memories for a user.

        Args:
            user_id: Target user ID.
            limit: Maximum number of memories (default 10).
        """
        params = {"userId": user_id, "limit": limit}
        with self._c._http() as http:
            r = http.get("/api/genie-inbox/recent", params=params)
        data = _handle_response(r, dict)
        return [_parse_body(item, Memory) for item in (data.get("data", []) if isinstance(data, dict) else [])]

    def search(self, query: str, user_id: str, limit: int = 20) -> List[Memory]:
        """
        Full-text search across memories.

        Args:
            query: Search query string.
            user_id: Target user ID.
            limit: Maximum results (default 20).
        """
        params = {"q": query, "userId": user_id, "limit": limit}
        with self._c._http() as http:
            r = http.get("/api/genie-search", params=params)
        data = _handle_response(r, dict)
        return [_parse_body(item, Memory) for item in (data.get("data", []) if isinstance(data, dict) else [])]

    def graph(self, user_id: str) -> MemoryGraph:
        """
        Fetch the user's memory knowledge graph.

        Args:
            user_id: Target user ID.
        """
        with self._c._http() as http:
            r = http.get(f"/api/genie-graph/{user_id}")
        return _handle_response(r, MemoryGraph)

    def inbox(self, user_id: str, limit: int = 20) -> List[Memory]:
        """
        Alias for recent memories.
        """
        return self.recent(user_id, limit=limit)


class GenieClient:
    """
    Main Python SDK client for HOJAI Genie OS.

    Args:
        base_url: Base URL of the Genie OS service (e.g. http://localhost:7100).
        token: Optional JWT token. Use ``set_token()`` to update later.
        timeout: HTTP request timeout in seconds (default 30).
        raise_on_errors: If True (default), raises exceptions on HTTP errors.
                        If False, returns None on failures.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:7100",
        token: Optional[str] = None,
        timeout: float = 30.0,
        raise_on_errors: bool = True,
    ):
        self.base_url = base_url.rstrip("/")
        self._token = token
        self._timeout = timeout
        self._raise_on_errors = raise_on_errors

        # Sub-clients
        self.auth = AuthClient(self)
        self.onboarding = OnboardingClient(self)
        self.briefing = BriefingClient(self)
        self.memory = MemoryClient(self)
        self.admin = AdminClient(self)

    # -------------------------------------------------------------------------
    # Token management
    # -------------------------------------------------------------------------

    def set_token(self, token: str) -> None:
        """Update the JWT token used for authenticated requests."""
        self._token = token

    @property
    def is_authenticated(self) -> bool:
        """True if a token has been set."""
        return bool(self._token)

    # -------------------------------------------------------------------------
    # HTTP layer
    # -------------------------------------------------------------------------

    @contextmanager
    def _http(self):
        """
        Context manager that yields an httpx Client with auth headers.

        Can be overridden in tests with a MagicMock.
        """
        headers = {}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        with httpx.Client(
            base_url=self.base_url,
            timeout=self._timeout,
            headers=headers,
        ) as client:
            yield client

    # -------------------------------------------------------------------------
    # Core ask endpoint
    # -------------------------------------------------------------------------

    def ask(
        self,
        query: str,
        *,
        context: Optional[Dict[str, Any]] = None,
    ) -> _models.AskResponse:
        """
        Ask Genie anything — the main conversational interface.

        Genie will consult memory, calendar, tasks, health, and all connected
        services to build a contextually-aware response.

        Args:
            query: Natural language question or request.
            context: Optional additional context to pass to Genie.

        Returns:
            AskResponse with ``answer`` and optional ``sources``.
        """
        payload: Dict[str, Any] = {"query": query}
        if context:
            payload["context"] = context

        with self._http() as http:
            r = http.post("/api/ask", json=payload)
        return _handle_response(r, _models.AskResponse)

    # -------------------------------------------------------------------------
    # PIOS endpoints
    # -------------------------------------------------------------------------

    def pios_health(self) -> HealthData:
        """
        Aggregate health of all 23+ PIOS services.

        Returns:
            HealthData with per-service status list.
        """
        with self._http() as http:
            r = http.get("/api/pios/health")
        body = _handle_response(r, dict)
        # API returns { success, data: HealthData, meta } — unwrap data
        if isinstance(body, dict) and "data" in body:
            return _parse_body(body["data"], HealthData)
        return _parse_body(body, HealthData)

    def pios_widget(self, user_id: str) -> _models.WidgetData:
        """
        Fetch the PIOS dashboard widget data for a user.

        Args:
            user_id: Target user ID.
        """
        with self._http() as http:
            r = http.get(f"/api/pios/widget/{user_id}")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            return _parse_body(data["data"], _models.WidgetData)
        return _parse_body(data, _models.WidgetData)

    def pios_schedule(
        self,
        user_id: str,
        tz: str = "Asia/Kolkata",
    ) -> Dict[str, Any]:
        """
        Get today's schedule for a user.

        Args:
            user_id: Target user ID.
            tz: IANA timezone string (default Asia/Kolkata).
        """
        params = {"tz": tz}
        with self._http() as http:
            r = http.get(f"/api/pios/schedule/{user_id}", params=params)
        return _handle_response(r, dict)

    def pios_ambient(
        self,
        user_id: str,
        kind: str = "morning",
    ) -> Dict[str, Any]:
        """
        Trigger an ambient briefing for a user.

        Args:
            user_id: Target user ID.
            kind: Briefing kind — morning | evening | weekly.
        """
        with self._http() as http:
            r = http.post(f"/api/pios/ambient/{user_id}/{kind}", json={})
        return _handle_response(r, dict)

    def pios_health_today(self, user_id: str) -> Dict[str, Any]:
        """Get today's health summary for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/health/{user_id}/today")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data

    def pios_calendar_today(self, user_id: str) -> Dict[str, Any]:
        """Get today's calendar events for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/calendar/{user_id}/today")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data

    def pios_tasks_today(self, user_id: str) -> Dict[str, Any]:
        """Get today's tasks for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/tasks/{user_id}/today")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data

    def pios_email_digest(self, user_id: str) -> Dict[str, Any]:
        """Get email digest for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/email/{user_id}/digest")
        return _handle_response(r, dict)

    def pios_skills_catalog(self) -> Dict[str, Any]:
        """List all available Genie Skills in the catalog."""
        with self._http() as http:
            r = http.get("/api/pios/skills/catalog")
        return _handle_response(r, dict)

    def pios_skills_installed(self, user_id: str) -> Dict[str, Any]:
        """List skills installed for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/skills/{user_id}/installed")
        return _handle_response(r, dict)

    def pios_install_skill(
        self,
        user_id: str,
        skill_id: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Install a skill for a user."""
        payload = {"skillId": skill_id}
        if config:
            payload["config"] = config
        with self._http() as http:
            r = http.post(f"/api/pios/skills/{user_id}/install", json=payload)
        return _handle_response(r, dict)

    def pios_long_running_tasks(self, user_id: str) -> Dict[str, Any]:
        """List long-running tasks for a user."""
        with self._http() as http:
            r = http.get(f"/api/pios/lrt/{user_id}/tasks")
        return _handle_response(r, dict)

    # -------------------------------------------------------------------------
    # Serendipity & Relationships
    # -------------------------------------------------------------------------

    def serendipity(self) -> List[Dict[str, Any]]:
        """Fetch random memory resurfacing items."""
        with self._http() as http:
            r = http.get("/api/genie-serendipity/random")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            return data["data"] if isinstance(data["data"], list) else []
        return data if isinstance(data, list) else []

    def relationships_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Fetch the relationship graph dashboard for a user."""
        with self._http() as http:
            r = http.get(f"/api/genie-relationships/{user_id}/dashboard")
        return _handle_response(r, dict)

    # -------------------------------------------------------------------------
    # Service health (top-level)
    # -------------------------------------------------------------------------

    def health(self) -> HealthData:
        """
        Aggregate health of all Genie OS services.

        Returns:
            HealthData with per-service status list.
        """
        return self.pios_health()


# ---------------------------------------------------------------------------
# Admin client
# ---------------------------------------------------------------------------


class AdminClient:
    """
    Admin operations — requires a token with admin role.

    Role hierarchy::

        super_admin  >  org_admin  >  admin  >  user

    Usage::

        client.set_token("admin-token")
        users = client.admin.list_users()
        for u in users:
            print(u.name, u.role)
    """

    def __init__(self, _client: GenieClient):
        self._c = _client

    def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        role: Optional[str] = None,
        search: Optional[str] = None,
    ) -> _models.AdminUserList:
        """
        List all users (paginated).

        Args:
            page: Page number (1-indexed).
            page_size: Results per page (max 100).
            role: Filter by role (super_admin | org_admin | admin | user).
            search: Search by name or email.
        """
        params: Dict[str, Any] = {"page": page, "pageSize": page_size}
        if role:
            params["role"] = role
        if search:
            params["search"] = search

        with self._c._http() as http:
            r = http.get("/api/admin/users", params=params)
        return _handle_response(r, _models.AdminUserList)

    def update_role(self, user_id: str, role: str) -> User:
        """
        Change a user's role.

        Args:
            user_id: Target user ID.
            role: New role — super_admin | org_admin | admin | user.

        Requires: org_admin or higher.
        """
        with self._c._http() as http:
            r = http.put(f"/api/admin/users/{user_id}/role", json={"role": role})
        body = _handle_response(r, dict)
        if isinstance(body, dict) and "user" in body:
            return _parse_body(body["user"], User)
        return _parse_body(body, User)

    def deactivate(self, user_id: str) -> _models.UserDeactivateResponse:
        """
        Deactivate a user account.

        Requires: org_admin or higher.
        """
        with self._c._http() as http:
            r = http.post(f"/api/admin/users/{user_id}/deactivate")
        return _handle_response(r, _models.UserDeactivateResponse)

    def reactivate(self, user_id: str) -> _models.UserDeactivateResponse:
        """
        Reactivate a previously deactivated user.

        Requires: org_admin or higher.
        """
        with self._c._http() as http:
            r = http.post(f"/api/admin/users/{user_id}/reactivate")
        return _handle_response(r, _models.UserDeactivateResponse)

    def usage(
        self,
        period: str = "week",
    ) -> UsageStats:
        """
        Fetch platform usage statistics.

        Args:
            period: Aggregation period — today | week | month.
        """
        params = {"period": period}
        with self._c._http() as http:
            r = http.get("/api/admin/usage", params=params)
        return _handle_response(r, UsageStats)

    def audit_log(
        self,
        page: int = 1,
        page_size: int = 50,
        action: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> _models.AuditLogResponse:
        """
        Fetch audit log entries (paginated).

        Args:
            page: Page number (1-indexed).
            page_size: Results per page (max 200).
            action: Filter by action type (e.g. "role_changed").
            user_id: Filter by actor user ID.
            start_date: ISO date string — filter entries after this.
            end_date: ISO date string — filter entries before this.

        Requires: org_admin or higher.
        """
        params: Dict[str, Any] = {"page": page, "pageSize": page_size}
        if action:
            params["action"] = action
        if user_id:
            params["userId"] = user_id
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        with self._c._http() as http:
            r = http.get("/api/admin/audit", params=params)
        return _handle_response(r, _models.AuditLogResponse)

    def metrics(self) -> RuntimeMetrics:
        """
        Fetch runtime metrics for the Genie OS process.

        Includes PID, uptime, heap/RSS memory, MongoDB connection status.

        Requires: admin role.
        """
        with self._c._http() as http:
            r = http.get("/api/admin/metrics")
        return _handle_response(r, RuntimeMetrics)

    def service_health(self) -> List[ServiceHealth]:
        """
        Fetch detailed health for all Genie OS services.

        Returns a flat list of per-service health records.

        Requires: admin role.
        """
        with self._c._http() as http:
            r = http.get("/api/admin/services/health")
        data = _handle_response(r, dict)
        if isinstance(data, dict) and "data" in data:
            svc_list = data["data"].get("services", []) if isinstance(data["data"], dict) else []
        elif isinstance(data, dict) and "services" in data:
            svc_list = data["services"]
        else:
            svc_list = data if isinstance(data, list) else []
        return [_parse_body(s, ServiceHealth) for s in svc_list]
