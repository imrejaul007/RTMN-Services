// Debug script for deprecated/retired routes
import('./platform/agent-lifecycle/agent-lifecycle-api/src/index.js').then(m => {
  const { app, agents } = m;
  const http = require('http');

  function mkReq(port) {
    return function req(method, path, body) {
      return new Promise(function(resolve, reject) {
        const url = new URL(path, 'http://localhost:' + port);
        const opts = {
          method: method,
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          headers: { 'Content-Type': 'application/json' }
        };
        const r = http.request(opts, function(res) {
          let data = '';
          res.on('data', function(chunk) { data += chunk; });
          res.on('end', function() {
            let parsed;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            resolve({ status: res.statusCode, body: parsed });
          });
        });
        r.on('error', reject);
        if (body) r.write(JSON.stringify(body));
        r.end();
      });
    };
  }

  async function test() {
    agents.clear();
    const server = app.listen(49199, '127.0.0.1', async function() {
      const r = mkReq(49199);
      const created = await r('POST', '/api/agents', { name: 'TestAgent' });
      await r('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {});
      const list = await r('GET', '/api/agents/deprecated');
      console.log('GET /api/agents/deprecated:', list.status, JSON.stringify(list.body).substring(0, 200));
      server.close();
    });
  }
  test();
});
