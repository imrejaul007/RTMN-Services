// Test the deprecated route in the actual app context
process.env.SERVICE_NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';

const { agents } = require('../src/index.js');
const http = require('http');

agents.clear();
agents.set('test-id', { id: 'test-id', name: 'Test', status: 'deprecated', deprecatedAt: '2026-06-26', deprecation: {} });

// Make request through the actual Express app
const app = require('../src/index.js').app;
const server = app.listen(49999, '127.0.0.1', function() {
  const port = server.address().port;
  const req = http.request({ hostname: '127.0.0.1', port, path: '/api/agents/deprecated', method: 'GET' }, function(res) {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', function() {
      console.log('Response:', res.statusCode, d.substring(0, 200));
      server.close();
    });
  });
  req.end();
});
