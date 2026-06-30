/**
 * HOJAI Nexha SDK — Webhook Signature Verification
 * QW3: HMAC-SHA256 + timestamp anti-replay for Nexha webhooks.
 */
import crypto from "crypto";
export class WebhookSignatureError extends Error {
    constructor(message) {
        super(message);
        this.name = "WebhookSignatureError";
    }
}
/**
 * Verify a Nexha webhook signature.
 *
 * Format: "t=<timestamp>,v1=<hex_signature>"
 * Where signature is HMAC-SHA256(secret, "<timestamp>.<payload>")
 *
 * Returns { valid: true } if signature matches and timestamp is within tolerance.
 */
export function verifyWebhook(input) {
    const tolerance = input.toleranceSeconds ?? 300; // 5 min default
    const parts = input.signature.split(",");
    const header = {};
    for (const p of parts) {
        const [k, v] = p.split("=");
        if (k && v)
            header[k.trim()] = v.trim();
    }
    const ts = parseInt(header["t"] || "", 10);
    const sig = header["v1"];
    if (!ts || isNaN(ts)) {
        return { valid: false, reason: "missing or invalid timestamp" };
    }
    if (!sig) {
        return { valid: false, reason: "missing signature" };
    }
    // Anti-replay: timestamp within tolerance
    const now = Math.floor(Date.now() / 1000);
    const drift = Math.abs(now - ts);
    if (drift > tolerance) {
        return {
            valid: false,
            reason: "timestamp outside tolerance (drift=" + drift + "s)",
            timestamp: ts,
            replayed: true,
        };
    }
    // Verify signature
    const expected = computeSignature(input.secret, ts, input.payload);
    if (!secureEqual(sig, expected)) {
        return { valid: false, reason: "signature mismatch", timestamp: ts };
    }
    return { valid: true, timestamp: ts };
}
/**
 * Compute a Nexha webhook signature.
 * Format: "t=<timestamp>,v1=<hex>"
 */
export function signWebhook(secret, payload, ts) {
    const timestamp = ts ?? Math.floor(Date.now() / 1000);
    return "t=" + timestamp + ",v1=" + computeSignature(secret, timestamp, payload);
}
/**
 * Compute HMAC-SHA256(secret, "<ts>.<payload>") in hex.
 */
export function computeSignature(secret, ts, payload) {
    return crypto
        .createHmac("sha256", secret)
        .update(ts + "." + payload)
        .digest("hex");
}
/**
 * Constant-time comparison to prevent timing attacks.
 */
function secureEqual(a, b) {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length)
        return false;
    let r = 0;
    for (let i = 0; i < ab.length; i++)
        r |= ab[i] ^ bb[i];
    return r === 0;
}
//# sourceMappingURL=webhook-verify.js.map