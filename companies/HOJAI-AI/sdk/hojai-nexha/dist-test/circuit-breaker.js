export class CircuitBreaker {
    opts;
    state = "CLOSED";
    consecF = 0;
    consecS = 0;
    lastF = 0;
    snaps = [];
    constructor(opts) {
        this.opts = {
            name: opts.name,
            failureThreshold: opts.failureThreshold ?? 5,
            successThreshold: opts.successThreshold ?? 2,
            windowMs: opts.windowMs ?? 60_000,
            resetTimeoutMs: opts.resetTimeoutMs ?? 30_000,
            errorThresholdPercent: opts.errorThresholdPercent ?? 50,
        };
    }
    getState() { this._tick(); return this.state; }
    isOpen() { this._tick(); return this.state === "OPEN"; }
    async execute(fn) {
        this._tick();
        if (this.state === "OPEN")
            throw new Error(`Circuit OPEN for "${this.opts.name}". Retry in ${this._waitMs()}ms`);
        try {
            const r = await fn();
            this._ok();
            return r;
        }
        catch (e) {
            this._fail();
            throw e;
        }
    }
    trip() { this.state = "OPEN"; this.lastF = Date.now(); this.consecF++; }
    reset() { this.state = "CLOSED"; this.consecF = 0; this.consecS = 0; this.snaps = []; this.lastF = 0; }
    getStats() {
        const now = Date.now();
        const win = now - this.opts.windowMs;
        const recent = this.snaps.filter(s => s.ts > win);
        const f = recent.reduce((a, s) => a + s.f, 0);
        const ss = recent.reduce((a, s) => a + s.s, 0);
        const tot = f + ss;
        const rate = tot > 0 ? (f / tot) * 100 : 0;
        return {
            state: this.state,
            failures: f,
            successes: ss,
            errorRate: Math.round(rate),
            lastFailure: this.lastF || null,
            nextRetryMs: this.state === "OPEN" ? this._waitMs() : 0,
        };
    }
    _ok() {
        this.consecF = 0;
        if (this.state === "HALF_OPEN") {
            this.consecS++;
            if (this.consecS >= this.opts.successThreshold)
                this.state = "CLOSED";
        }
    }
    _fail() {
        this.consecS = 0;
        this.consecF++;
        this.lastF = Date.now();
        this.snaps.push({ f: 1, s: 0, ts: Date.now() });
        const win = Date.now() - this.opts.windowMs;
        this.snaps = this.snaps.filter(s => s.ts > win);
        const recent = this.snaps.filter(s => s.ts > win);
        const tot = recent.reduce((a, s) => a + s.f + s.s, 0);
        if (tot > 0) {
            const rate = (recent.reduce((a, s) => a + s.f, 0) / tot) * 100;
            if (rate >= this.opts.errorThresholdPercent) {
                this.state = "OPEN";
                return;
            }
        }
        if (this.consecF >= this.opts.failureThreshold)
            this.state = "OPEN";
    }
    _tick() {
        if (this.state === "OPEN" && this._waitMs() <= 0)
            this.state = "HALF_OPEN";
    }
    _waitMs() {
        return Math.max(0, this.opts.resetTimeoutMs - (Date.now() - this.lastF));
    }
}
//# sourceMappingURL=circuit-breaker.js.map