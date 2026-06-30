/**
 * HOJAI Nexha SDK — HTTP Client with Retry + Circuit Breaker
 * QW2: retry + circuit breaker wired into every request.
 */
// ─── Errors ────────────────────────────────────────────────────────────
export class NexhaTimeoutError extends Error {
    constructor(ms) {
        super("Timeout after " + ms + "ms");
        this.name = "NexhaTimeoutError";
    }
}
export class NexhaConnError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "NexhaConnError";
    }
}
// ─── Circuit Breaker ────────────────────────────────────────────────
export class CircuitBreaker {
    name;
    threshold;
    resetMs;
    state = "CLOSED";
    fails = 0;
    okays = 0;
    lastFailure = 0;
    constructor(name, threshold = 5, resetMs = 30000) {
        this.name = name;
        this.threshold = threshold;
        this.resetMs = resetMs;
    }
    getState() { this.tick(); return this.state; }
    isOpen() { this.tick(); return this.state === "OPEN"; }
    async exec(fn) {
        this.tick();
        if (this.state === "OPEN")
            throw new Error("Circuit OPEN for " + this.name);
        try {
            return await fn();
        }
        catch (e) {
            this.fail();
            throw e;
        }
        finally {
            this.ok();
        }
    }
    fail() {
        this.okays = 0;
        this.fails++;
        this.lastFailure = Date.now();
        this.state = this.fails >= this.threshold ? "OPEN" : this.state;
    }
    ok() {
        this.fails = 0;
        if (this.state === "HALF_OPEN") {
            this.okays++;
            if (this.okays >= 2)
                this.state = "CLOSED";
        }
    }
    tick() {
        if (this.state === "OPEN" && Date.now() - this.lastFailure >= this.resetMs) {
            this.state = "HALF_OPEN";
            this.okays = 0;
        }
    }
}
// ─── Retry ────────────────────────────────────────────────────────
export async function withRetry(fn, maxRetries = 3, baseMs = 200) {
    let last;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (e) {
            last = e;
            if (i < maxRetries - 1) {
                const delay = Math.min(baseMs * Math.pow(2, i), 5000);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }
    throw last;
}
// ─── HTTP Client ────────────────────────────────────────────────
export async function request(config, method, path, body, opts = {}) {
    const cb = new CircuitBreaker("nexha:" + path);
    return withRetry(() => cb.exec(async () => {
        const timeout = opts.timeout ?? config.timeout ?? 10000;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), timeout);
        try {
            const res = await fetch(new URL(path, config.baseUrl).toString(), {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(config.apiKey ? { Authorization: "Bearer " + config.apiKey } : {}),
                },
                body: body != null ? JSON.stringify(body) : undefined,
                signal: ctrl.signal,
            });
            if (!res.ok) {
                if (res.status === 401)
                    throw new Error("HTTP 401: Unauthorized");
                if (res.status >= 500)
                    throw new Error("HTTP " + res.status + ": Server error");
                if (res.status === 404)
                    throw new Error("HTTP 404: Not Found");
                throw new Error("HTTP " + res.status + ": Client error");
            }
            const data = await res.json();
            if (data.error)
                throw new NexhaConnError(data.error.message || "API error");
            return data.data;
        }
        catch (e) {
            if (e instanceof Error && e.message.startsWith("HTTP 401"))
                throw e;
            if (e instanceof Error && e.message.startsWith("Circuit"))
                throw e;
            if (e?.name === "AbortError")
                throw new NexhaTimeoutError(timeout);
            if (e instanceof TypeError)
                throw new NexhaConnError(e.message);
            throw e;
        }
        finally {
            clearTimeout(tid);
        }
    }), opts.maxRetries ?? config.maxRetries ?? 3, 200);
}
export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
export function buildUrl(base, path, params) {
    const u = new URL(path, base);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            if (v != null)
                u.searchParams.set(k, String(v));
        }
    }
    return u.toString();
}
export function backoff(attempt, base = 300) {
    return Math.min(base * Math.pow(2, attempt), 30000);
}
//# sourceMappingURL=utils.js.map