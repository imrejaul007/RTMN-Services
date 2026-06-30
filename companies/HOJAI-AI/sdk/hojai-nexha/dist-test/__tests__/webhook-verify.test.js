/**
 * HOJAI Nexha SDK — Webhook Signature Verification Tests
 * Uses Node's built-in test runner.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyWebhook, signWebhook, computeSignature, WebhookSignatureError } from "../webhook-verify.js";
test("verifies a freshly signed webhook", () => {
    const secret = "my-secret-key";
    const payload = JSON.stringify({ event: "payment.completed", amount: 100 });
    const sig = signWebhook(secret, payload);
    const r = verifyWebhook({ payload, signature: sig, secret });
    assert.equal(r.valid, true);
    assert.ok(r.timestamp);
});
test("rejects tampered payload", () => {
    const secret = "my-secret";
    const payload = JSON.stringify({ amount: 100 });
    const sig = signWebhook(secret, payload);
    const tampered = JSON.stringify({ amount: 99999 });
    const r = verifyWebhook({ payload: tampered, signature: sig, secret });
    assert.equal(r.valid, false);
    assert.equal(r.reason, "signature mismatch");
});
test("rejects wrong secret", () => {
    const payload = JSON.stringify({ event: "x" });
    const sig = signWebhook("correct-secret", payload);
    const r = verifyWebhook({ payload, signature: sig, secret: "wrong-secret" });
    assert.equal(r.valid, false);
});
test("rejects replayed signature outside tolerance", () => {
    const secret = "x";
    const payload = "{}";
    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const sig = signWebhook(secret, payload, oldTs);
    const r = verifyWebhook({ payload, signature: sig, secret, toleranceSeconds: 300 });
    assert.equal(r.valid, false);
    assert.equal(r.replayed, true);
});
test("accepts signature within custom tolerance", () => {
    const secret = "x";
    const payload = "{}";
    const ts = Math.floor(Date.now() / 1000) - 60;
    const sig = signWebhook(secret, payload, ts);
    const r = verifyWebhook({ payload, signature: sig, secret, toleranceSeconds: 120 });
    assert.equal(r.valid, true);
});
test("rejects malformed signature header", () => {
    const r = verifyWebhook({ payload: "x", signature: "not-a-header", secret: "x" });
    assert.equal(r.valid, false);
});
test("rejects missing timestamp", () => {
    const r = verifyWebhook({ payload: "x", signature: "v1=abc", secret: "x" });
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes("timestamp"));
});
test("rejects missing signature", () => {
    const r = verifyWebhook({ payload: "x", signature: "t=1234567890", secret: "x" });
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes("signature"));
});
test("rejects future timestamp (clock skew attack)", () => {
    const secret = "x";
    const payload = "{}";
    const futureTs = Math.floor(Date.now() / 1000) + 600;
    const sig = signWebhook(secret, payload, futureTs);
    const r = verifyWebhook({ payload, signature: sig, secret });
    assert.equal(r.valid, false);
});
test("computeSignature is deterministic", () => {
    const a = computeSignature("secret", 123, "payload");
    const b = computeSignature("secret", 123, "payload");
    assert.equal(a, b);
    const c = computeSignature("secret", 124, "payload");
    assert.notEqual(a, c);
});
test("sign + verify round-trip works for many payloads", () => {
    for (let i = 0; i < 20; i++) {
        const payload = JSON.stringify({ index: i, data: "x".repeat(i * 10) });
        const sig = signWebhook("my-secret-" + i, payload);
        const r = verifyWebhook({ payload, signature: sig, secret: "my-secret-" + i });
        assert.equal(r.valid, true);
    }
});
test("WebhookSignatureError class is exported", () => {
    const e = new WebhookSignatureError("test");
    assert.equal(e.name, "WebhookSignatureError");
    assert.equal(e.message, "test");
    assert.ok(e instanceof Error);
});
//# sourceMappingURL=webhook-verify.test.js.map