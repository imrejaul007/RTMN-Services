"""
genie_client — Official Python client for HOJAI Genie OS.

Usage::

    from genie_client import GenieClient

    client = GenieClient(
        base_url="http://localhost:7100",
        token="your-jwt-token",
    )

    # Ask Genie anything
    response = client.ask("What's my top 3 priorities today?")
    print(response)

    # Admin: list all users
    for user in client.admin.list_users():
        print(user)
"""

from genie_client.client import GenieClient
from genie_client import models as _models
from genie_client.models import (
    AskResponse,
    AuthResponse,
    Briefing,
    Memory,
    MemoryGraph,
    PiScore,
    ServiceHealth,
    User,
    AuditLogEntry,
    UsageStats,
    RuntimeMetrics,
    HealthData,
    PiScore,
)

__all__ = [
    "GenieClient",
    "AskResponse",
    "AuthResponse",
    "Briefing",
    "Memory",
    "MemoryGraph",
    "PiScore",
    "ServiceHealth",
    "User",
    "AuditLogEntry",
    "UsageStats",
    "RuntimeMetrics",
]
