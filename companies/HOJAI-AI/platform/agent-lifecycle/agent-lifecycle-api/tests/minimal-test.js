// Test: does Express find the route at all?
process.env.SERVICE_NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';

const { app, agents } = require('../src/index.js');
agents.clear();

// Manually match the route
const match = app._router.match({ method: 'GET', path: '/api/agents/deprecated' });
console.log('Match result:', match && match.route ? match.route.path : 'null', 'params:', match && match.params);

const server = app.listen(49997, '127.0.0.1', function() {
  const http = require('http');
  const req = http.request({ hostname: '127.0.0.1', port: 49997, path: '/api/agents/deprecated', method: 'GET' }, function(res) {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', function() {
      console.log('HTTP Status:', res.statusCode, 'Body:', d.substring(0, 200));
      server.close();
    });
  });
  req.end();
});
