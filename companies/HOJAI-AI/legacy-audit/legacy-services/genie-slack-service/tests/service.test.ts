/**
 * Tests for genie-slack-service
 * Generated: June 13, 2026
 */

describe('genie-slack-service', () => {
  describe('Health Endpoints', () => {
    it('should return healthy status on /health', async () => {
      // Test health endpoint
      const response = await fetch('http://localhost:3000/health');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    it('should return ok on /health/live', async () => {
      const response = await fetch('http://localhost:3000/health/live');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
    });

    it('should return ready on /health/ready', async () => {
      const response = await fetch('http://localhost:3000/health/ready');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ready');
    });
  });

  describe('API Routes', () => {
    it('should return 400 without tenant header', async () => {
      const response = await fetch('http://localhost:3000/api', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(response.status).toBe(400);
    });

    it('should accept requests with tenant header', async () => {
      const response = await fetch('http://localhost:3000/api', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'test-tenant',
          'X-User-Id': 'test-user'
        }
      });
      expect([200, 404]).toContain(response.status); // 404 is ok for no route
    });
  });

  describe('Response Format', () => {
    it('should return JSON responses', async () => {
      const response = await fetch('http://localhost:3000/health', {
        headers: { 'Accept': 'application/json' }
      });
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should include timestamp in responses', async () => {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      expect(data.timestamp).toBeDefined();
    });
  });
});
