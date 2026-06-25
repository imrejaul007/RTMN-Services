/**
 * Learning OS - Unit Tests
 */

const http = require('http');

const BASE_URL = 'http://localhost:4755';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Learning OS', () => {
  describe('Health Check', () => {
    test('GET /health returns healthy status', async () => {
      const res = await makeRequest('GET', '/health');
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.service).toBe('learning-os');
    });
  });

  describe('Courses API', () => {
    test('GET /api/courses returns course list', async () => {
      const res = await makeRequest('GET', '/api/courses');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.count).toBeGreaterThan(0);
    });

    test('GET /api/courses/:id returns course details', async () => {
      const res = await makeRequest('GET', '/api/courses/course-ai-fundamentals');
      expect(res.status).toBe(200);
      expect(res.data.data.title).toBe('AI Fundamentals for Business');
    });

    test('POST /api/courses creates new course', async () => {
      const course = {
        title: 'Test Course',
        description: 'A test course',
        category: 'Testing',
        level: 'beginner',
        duration: 60
      };
      const res = await makeRequest('POST', '/api/courses', course);
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.data.title).toBe('Test Course');
    });

    test('GET /api/courses filters by category', async () => {
      const res = await makeRequest('GET', '/api/courses?category=AI');
      expect(res.status).toBe(200);
      res.data.data.forEach(c => expect(c.category).toBe('AI'));
    });
  });

  describe('Learning Paths API', () => {
    test('GET /api/paths returns learning paths', async () => {
      const res = await makeRequest('GET', '/api/paths');
      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    test('GET /api/paths/:id returns path with course details', async () => {
      const res = await makeRequest('GET', '/api/paths/path-ai-entrepreneur');
      expect(res.status).toBe(200);
      expect(res.data.data.courseDetails).toBeDefined();
    });
  });

  describe('Enrollments API', () => {
    test('POST /api/enroll creates enrollment', async () => {
      const enrollment = {
        userId: 'user-test-123',
        courseId: 'course-ai-fundamentals'
      };
      const res = await makeRequest('POST', '/api/enroll', enrollment);
      expect(res.status).toBe(201);
      expect(res.data.data.status).toBe('active');
    });

    test('GET /api/enrollments/:userId returns user enrollments', async () => {
      const res = await makeRequest('GET', '/api/enrollments/user-test-123');
      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });
  });

  describe('Progress API', () => {
    test('POST /api/progress updates progress', async () => {
      const progress = {
        userId: 'user-test-123',
        courseId: 'course-ai-fundamentals',
        moduleId: 'module-1',
        completed: true
      };
      const res = await makeRequest('POST', '/api/progress', progress);
      expect(res.status).toBe(200);
      expect(res.data.data.completedModules).toContain('module-1');
    });
  });

  describe('Certifications API', () => {
    test('GET /api/certifications returns list', async () => {
      const res = await makeRequest('GET', '/api/certifications');
      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    test('POST /api/certifications/:userId/issue issues certificate', async () => {
      const cert = {
        certificationId: 'cert-ai-fundamentals'
      };
      const res = await makeRequest('POST', '/api/certifications/user-test-123/issue', cert);
      expect(res.status).toBe(201);
      expect(res.data.data.verificationCode).toBeDefined();
    });

    test('GET /api/certificates/:userId returns user certificates', async () => {
      const res = await makeRequest('GET', '/api/certificates/user-test-123');
      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });
  });

  describe('Skills API', () => {
    test('GET /api/skills returns skill list', async () => {
      const res = await makeRequest('GET', '/api/skills');
      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    test('GET /api/skills/:userId returns user skill profile', async () => {
      const res = await makeRequest('GET', '/api/skills/user-test-123');
      expect(res.status).toBe(200);
      expect(res.data.data.userId).toBe('user-test-123');
    });
  });

  describe('Analytics API', () => {
    test('GET /api/analytics/org/:orgId returns org analytics', async () => {
      const res = await makeRequest('GET', '/api/analytics/org/org-123');
      expect(res.status).toBe(200);
      expect(res.data.data).toHaveProperty('totalEnrollments');
    });

    test('GET /api/analytics/course/:courseId returns course analytics', async () => {
      const res = await makeRequest('GET', '/api/analytics/course/course-ai-fundamentals');
      expect(res.status).toBe(200);
      expect(res.data.data).toHaveProperty('totalEnrollments');
    });
  });
});
