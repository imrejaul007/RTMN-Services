# HOJAI AI Python Agent SDK
# Source served by services/agent-sdk (port 4187)

"""Python SDK for building HOJAI AI agents."""

import json
import urllib.request
from typing import Any, Dict, List, Optional


class HojaiAgentClient:
    """Client for HOJAI AI agent security + capability APIs."""

    def __init__(self, base_url: str = "http://localhost:4186", api_key: str = ""):
        self.base_url = base_url
        self.api_key = api_key

    def register(self, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new agent with the security registry."""
        return self._post("/api/agents", manifest)

    def issue_capability_token(self, agent_id: str, capabilities: List[str]) -> Dict[str, Any]:
        """Issue a capability token for this agent."""
        return self._post("/api/capability-tokens", {"agent_id": agent_id, "capabilities": capabilities})

    def verify_capability_token(self, token: Dict[str, Any], required_capability: str) -> bool:
        """Verify a capability token before invoking an action."""
        res = self._post("/api/capability-tokens/verify", {"token": token, "required_capability": required_capability})
        return res.get("valid") is True

    def scan(self, input_text: str) -> Dict[str, Any]:
        """Scan input for threats (credential exposure, injection, etc.)."""
        return self._post("/api/scan", {"input": input_text})

    def quarantine(self, agent_id: str) -> None:
        """Quarantine an agent."""
        self._post(f"/api/agents/{agent_id}/quarantine", {})

    def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        if self.api_key:
            req.add_header("Authorization", f"Bearer {self.api_key}")
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))


def sales_assistant_manifest(name: str) -> Dict[str, Any]:
    """Helper: build a sales-assistant agent manifest."""
    return {
        "name": name,
        "owner": "sales-team",
        "scopes": ["read:contacts", "write:leads", "invoke:llm"]
    }