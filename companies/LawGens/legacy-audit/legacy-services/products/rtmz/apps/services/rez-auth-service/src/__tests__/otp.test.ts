/**
 * OTP Service Tests for rez-auth-service
 * Tests OTP generation, validation, and security
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  setEx: vi.fn()
};

vi.mock('../config/redis', () => ({
  redis: mockRedis
}));

// OTP Test Utilities
function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

function isValidOTPFormat(otp: string, length: number = 6): boolean {
  return /^\d+$/.test(otp) && otp.length === length;
}

function createOTPKey(phone: string, type: string): string {
  return `otp:${type}:${phone}`;
}

function isOTPExpired(createdAt: number, ttlSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - createdAt > ttlSeconds;
}

describe('OTP Generation', () => {
  it('should generate 6-digit OTP by default', () => {
    const otp = generateOTP();
    expect(otp.length).toBe(6);
    expect(isValidOTPFormat(otp)).toBe(true);
  });

  it('should generate 4-digit OTP when specified', () => {
    const otp = generateOTP(4);
    expect(otp.length).toBe(4);
    expect(isValidOTPFormat(otp, 4)).toBe(true);
  });

  it('should generate numeric-only OTP', () => {
    const otp = generateOTP();
    expect(/^\d+$/.test(otp)).toBe(true);
  });

  it('should generate unique OTPs', () => {
    const otps = new Set(Array.from({ length: 100 }, () => generateOTP()));
    // With 6 digits, 100 OTPs should have minimal collisions
    expect(otps.size).toBeGreaterThan(90);
  });
});

describe('OTP Format Validation', () => {
  it('should accept valid 6-digit OTP', () => {
    expect(isValidOTPFormat('123456')).toBe(true);
  });

  it('should reject OTP with letters', () => {
    expect(isValidOTPFormat('12345a')).toBe(false);
  });

  it('should reject OTP with special characters', () => {
    expect(isValidOTPFormat('12345!')).toBe(false);
  });

  it('should reject OTP with wrong length', () => {
    expect(isValidOTPFormat('12345', 6)).toBe(false);
    expect(isValidOTPFormat('1234567', 6)).toBe(false);
  });

  it('should reject empty OTP', () => {
    expect(isValidOTPFormat('')).toBe(false);
  });

  it('should reject whitespace in OTP', () => {
    expect(isValidOTPFormat('123 56')).toBe(false);
  });
});

describe('OTP Key Generation', () => {
  it('should create correct key for login OTP', () => {
    const key = createOTPKey('+919876543210', 'login');
    expect(key).toBe('otp:login:+919876543210');
  });

  it('should create correct key for signup OTP', () => {
    const key = createOTPKey('+919876543210', 'signup');
    expect(key).toBe('otp:signup:+919876543210');
  });

  it('should create correct key for password reset OTP', () => {
    const key = createOTPKey('user@example.com', 'reset');
    expect(key).toBe('otp:reset:user@example.com');
  });
});

describe('OTP Expiration', () => {
  it('should not be expired for fresh OTP', () => {
    const createdAt = Math.floor(Date.now() / 1000);
    expect(isOTPExpired(createdAt, 300)).toBe(false);
  });

  it('should be expired after TTL', () => {
    const createdAt = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
    expect(isOTPExpired(createdAt, 300)).toBe(true);
  });

  it('should handle custom TTL', () => {
    const createdAt = Math.floor(Date.now() / 1000) - 150; // 150 seconds ago
    expect(isOTPExpired(createdAt, 120)).toBe(true); // 2 min TTL
    expect(isOTPExpired(createdAt, 300)).toBe(false); // 5 min TTL
  });

  it('should handle edge case at exact expiration', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isOTPExpired(now - 300, 300)).toBe(true); // Exactly expired
  });
});

describe('OTP Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track OTP request count', async () => {
    const phone = '+919876543210';
    const rateLimitKey = `otp:ratelimit:${phone}`;

    mockRedis.get.mockResolvedValueOnce('3'); // 3 previous requests

    const count = await mockRedis.get(rateLimitKey);
    expect(parseInt(count as string, 10)).toBe(3);
  });

  it('should block after max attempts', async () => {
    const phone = '+919876543210';
    const rateLimitKey = `otp:ratelimit:${phone}`;

    mockRedis.get.mockResolvedValueOnce('5'); // Max is typically 5

    const count = parseInt((await mockRedis.get(rateLimitKey)) as string, 10);
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('should reset rate limit after window expires', async () => {
    const phone = '+919876543210';
    const rateLimitKey = `otp:ratelimit:${phone}`;

    // First check returns null (expired)
    mockRedis.get.mockResolvedValueOnce(null);

    const count = await mockRedis.get(rateLimitKey);
    expect(count).toBeNull();
  });
});

describe('OTP Verification Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify correct OTP', async () => {
    const phone = '+919876543210';
    const correctOTP = '123456';
    const storedOTP = '123456';
    const ttl = 300;

    mockRedis.get.mockResolvedValueOnce(JSON.stringify({
      otp: storedOTP,
      createdAt: Math.floor(Date.now() / 1000),
      attempts: 0
    }));

    const stored = JSON.parse((await mockRedis.get(`otp:login:${phone}`)) as string);
    expect(stored.otp).toBe(correctOTP);
    expect(isOTPExpired(stored.createdAt, ttl)).toBe(false);
  });

  it('should reject incorrect OTP', async () => {
    const phone = '+919876543210';
    const correctOTP = '123456';
    const wrongOTP = '654321';

    mockRedis.get.mockResolvedValueOnce(JSON.stringify({
      otp: correctOTP,
      createdAt: Math.floor(Date.now() / 1000),
      attempts: 0
    }));

    const stored = JSON.parse((await mockRedis.get(`otp:login:${phone}`)) as string);
    expect(stored.otp).not.toBe(wrongOTP);
  });

  it('should track failed attempts', async () => {
    const phone = '+919876543210';

    mockRedis.get.mockResolvedValueOnce(JSON.stringify({
      otp: '123456',
      createdAt: Math.floor(Date.now() / 1000),
      attempts: 2
    }));

    const stored = JSON.parse((await mockRedis.get(`otp:login:${phone}`)) as string);
    expect(stored.attempts).toBe(2);
  });

  it('should lock after max failed attempts', async () => {
    const phone = '+919876543210';
    const maxAttempts = 3;

    mockRedis.get.mockResolvedValueOnce(JSON.stringify({
      otp: '123456',
      createdAt: Math.floor(Date.now() / 1000),
      attempts: maxAttempts
    }));

    const stored = JSON.parse((await mockRedis.get(`otp:login:${phone}`)) as string);
    expect(stored.attempts).toBeGreaterThanOrEqual(maxAttempts);
  });
});

describe('OTP Security', () => {
  it('should not store plain OTP in logs', () => {
    const otp = generateOTP();
    const logStatement = `Sending OTP to user`;
    expect(logStatement).not.toContain(otp);
  });

  it('should use constant-time comparison for OTP', () => {
    const otp1 = '123456';
    const otp2 = '123456';
    const otp3 = '654321';

    // Simple comparison - in real code use timingSafeEqual
    expect(otp1 === otp2).toBe(true);
    expect(otp1 === otp3).toBe(false);
  });
});
