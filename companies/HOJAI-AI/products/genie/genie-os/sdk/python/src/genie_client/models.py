"""
Pydantic models for all Genie OS API responses and requests.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    ADMIN = "admin"
    USER = "user"


class ServiceStatus(str, Enum):
    UP = "up"
    DOWN = "down"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique user identifier")
    email: str
    name: str
    created_at: Optional[str] = Field(None, alias="createdAt")
    goals: Optional[List[str]] = Field(default_factory=list)
    onboarding_complete: Optional[bool] = Field(False, alias="onboardingComplete")
    role: Optional[Role] = Field(Role.USER)
    active: Optional[bool] = True
    org_id: Optional[str] = Field(None, alias="orgId")

    @property
    def is_admin(self) -> bool:
        return self.role in (Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.ADMIN)


class AuthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str
    user: User


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------


class GoalsRequest(BaseModel):
    goals: List[str] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Core Genie
# ---------------------------------------------------------------------------


class AskRequest(BaseModel):
    query: str = Field(..., description="Natural language question to Genie")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AskResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    answer: str
    sources: Optional[List[str]] = Field(default_factory=list)
    suggested_actions: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class Briefing(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    greeting: str
    date: str
    weather: Optional[WeatherInfo] = None
    active_goals: int = Field(0, alias="activeGoals")
    recent_memories: List[Memory] = Field(default_factory=list, alias="recentMemories")
    insights: List[str] = Field(default_factory=list)
    calendar_events: List[CalendarEvent] = Field(default_factory=list, alias="calendarEvents")
    todos_today: int = Field(0, alias="todosToday")
    habits_done_today: int = Field(0, alias="habitsDoneToday")
    pi_score: Optional[PiScore] = Field(None, alias="piScore")


class WeatherInfo(BaseModel):
    temp: float
    condition: str
    city: str


class CalendarEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    start: Optional[str] = None  # HomeTab format
    end: Optional[str] = None
    start_time: Optional[str] = Field(None, alias="startTime")  # CalendarScreen format
    end_time: Optional[str] = Field(None, alias="endTime")
    all_day: bool = Field(False, alias="allDay")
    location: Optional[str] = None
    attendees: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Memory
# ---------------------------------------------------------------------------


class Memory(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    type: str  # note | photo | voice | event | person | place | idea
    title: Optional[str] = None
    content: str
    tags: List[str] = Field(default_factory=list)
    created_at: Optional[str] = Field(None, alias="createdAt")
    importance: Optional[float] = Field(None, ge=0, le=10)
    source: Optional[str] = None


class MemoryGraph(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    identity: IdentityInfo
    knowledge_count: int = Field(0, alias="knowledgeCount")
    relationships_count: int = Field(0, alias="relationshipsCount")
    active_goals: int = Field(0, alias="activeGoals")


class IdentityInfo(BaseModel):
    name: str
    user_id: str = Field(alias="userId")


# ---------------------------------------------------------------------------
# PIOS / Widget
# ---------------------------------------------------------------------------


class PiScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    score: float = Field(..., ge=0, le=100, description="Overall PI score (0-100)")
    productivity: float = Field(0, ge=0, le=100)
    wellbeing: float = Field(0, ge=0, le=100)
    relationships: float = Field(0, ge=0, le=100)
    learning: float = Field(0, ge=0, le=100)
    trend: str = Field("stable")  # improving | declining | stable
    breakdown: Dict[str, float] = Field(default_factory=dict)


class WidgetData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pi_score: Optional[PiScore] = Field(None, alias="piScore")
    health: Optional[Dict[str, Any]] = Field(None)
    calendar: Dict[str, Any] = Field(default_factory=dict)
    tasks: Dict[str, Any] = Field(default_factory=dict)
    email_digest: Optional[Dict[str, Any]] = Field(None, alias="emailDigest")
    stale_contacts: Optional[List[str]] = Field(None, alias="staleContacts")
    year_ago_photos: Optional[List[str]] = Field(None, alias="yearAgoPhotos")
    active_agents: Optional[List[Dict[str, Any]]] = Field(None, alias="activeAgents")


# ---------------------------------------------------------------------------
# Health & Metrics
# ---------------------------------------------------------------------------


class ServiceHealth(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    status: ServiceStatus
    latency_ms: Optional[float] = Field(None, alias="latencyMs")
    http_status: Optional[int] = Field(None, alias="httpStatus")
    error: Optional[str] = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    data: HealthData
    meta: MetaInfo


class HealthData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    total: int
    up: int
    down: int
    services: List[ServiceHealth]
    voice_os_enabled: bool = Field(alias="voiceOSEnabled")
    razo_enabled: bool = Field(alias="razoEnabled")


class MetaInfo(BaseModel):
    timestamp: str


# ---------------------------------------------------------------------------
# Admin — Users
# ---------------------------------------------------------------------------


class AdminUserList(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    users: List[User]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")


class RoleChangeRequest(BaseModel):
    role: Role


class UserDeactivateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    user_id: str = Field(alias="userId")
    active: bool = False


# ---------------------------------------------------------------------------
# Admin — Usage
# ---------------------------------------------------------------------------


class UsageStats(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    period: str  # today | week | month
    total_requests: int = Field(0, alias="totalRequests")
    active_users: int = Field(0, alias="activeUsers")
    by_action: Dict[str, int] = Field(default_factory=dict, alias="byAction")
    by_role: Dict[str, int] = Field(default_factory=dict, alias="byRole")
    top_users: List[Dict[str, Any]] = Field(default_factory=list, alias="topUsers")


# ---------------------------------------------------------------------------
# Admin — Audit
# ---------------------------------------------------------------------------


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: str
    action: str
    user_id: Optional[str] = Field(None, alias="userId")
    user_email: Optional[str] = Field(None, alias="userEmail")
    target: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip: Optional[str] = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    entries: List[AuditLogEntry]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")


# ---------------------------------------------------------------------------
# Admin — Runtime Metrics
# ---------------------------------------------------------------------------


class RuntimeMetrics(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pid: int
    uptime_seconds: float = Field(alias="uptimeSeconds")
    memory_heap_used_mb: float = Field(0, alias="memoryHeapUsed")
    memory_heap_total_mb: float = Field(0, alias="memoryHeapTotal")
    memory_rss_mb: float = Field(0, alias="memoryRss")
    mongo_connected: bool = Field(False, alias="mongoConnected")
    timestamp: str


# ---------------------------------------------------------------------------
# Generic wrappers
# ---------------------------------------------------------------------------


class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, str]] = None
    message: Optional[str] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
