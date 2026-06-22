#!/usr/bin/env python3
"""
Mock webhook receiver for Event Bus e2e tests.
Listens on PORT (default 4599) and appends every POST request body to /tmp/_eb_received.json
as a single JSON array (one element per request, in arrival order).

Usage:
    python3 tests/mock-receiver.py
    python3 tests/mock-receiver.py --port 4599 --out /tmp/_eb_received.json

Endpoints:
    POST *  -> capture body, headers, return 200 OK
    GET  /_count   -> returns count of captured requests (JSON: {"count": N})
    POST /_reset   -> resets the captured list
"""
import argparse
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

_received_lock = threading.Lock()
_received_path = "/tmp/_eb_received.json"


def _load_existing():
    if not os.path.exists(_received_path):
        return []
    try:
        with open(_received_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_all(items):
    tmp = _received_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)
    os.replace(tmp, _received_path)


def _append(item):
    with _received_lock:
        items = _load_existing()
        items.append(item)
        _save_all(items)


def _reset():
    with _received_lock:
        _save_all([])


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default request logging to keep test output clean
        return

    def _send_json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/_count":
            with _received_lock:
                items = _load_existing()
            self._send_json(200, {"count": len(items)})
            return
        if self.path == "/_list":
            with _received_lock:
                items = _load_existing()
            self._send_json(200, {"count": len(items), "items": items})
            return
        # Default 200 — any GET is fine
        self._send_json(200, {"ok": True, "method": "GET", "path": self.path})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b""
        try:
            parsed = json.loads(raw.decode("utf-8")) if raw else None
        except Exception:
            parsed = None

        item = {
            "path": self.path,
            "method": "POST",
            "headers": {k: v for k, v in self.headers.items()},
            "body_raw": raw.decode("utf-8", errors="replace"),
            "body_json": parsed,
        }

        # Built-in test endpoints
        if self.path == "/_reset":
            _reset()
            self._send_json(200, {"ok": True, "reset": True})
            return

        # Optional failure-injection:
        # POST /fail-3x  -> fail first 3 calls with 500, then succeed
        # POST /fail     -> always fail with 500
        if self.path.startswith("/fail"):
            tag = self.path[len("/fail"):]  # "" or "-3x"
            with _received_lock:
                items = _load_existing()
                count = sum(1 for it in items if it.get("path") == self.path)
            allowed = -1  # default: always fail
            if tag.startswith("-") and tag.endswith("x"):
                try:
                    allowed = int(tag[1:-1])
                except Exception:
                    allowed = -1
            # Always record the attempt
            _append(item)
            if allowed == -1:
                # always-fail mode
                self._send_json(500, {"ok": False, "fail": True, "attempt": count + 1})
                return
            if count < allowed:
                self._send_json(500, {"ok": False, "fail": True, "attempt": count + 1})
                return
            self._send_json(200, {"ok": True, "attempt": count + 1, "recovered": True})
            return

        # Default: record + 200 OK
        _append(item)
        self._send_json(200, {"ok": True, "received": True, "id": (parsed or {}).get("id") if isinstance(parsed, dict) else None})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4599)
    parser.add_argument("--out", default="/tmp/_eb_received.json")
    args = parser.parse_args()

    global _received_path
    _received_path = args.out
    # Reset on startup
    _reset()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    print(f"MockReceiver listening on :{args.port}, writing to {_received_path}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
