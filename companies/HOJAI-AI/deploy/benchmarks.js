#!/usr/bin/env node
var http = require('http');

var SERVICES = [
  { name: 'agent-os', port: 4892 },
  { name: 'personalization', port: 4893 },
  { name: 'ai-economy', port: 4894 },
  { name: 'governance', port: 4895 },
  { name: 'planning-engine', port: 4896 },
  { name: 'multi-modal', port: 4897 },
  { name: 'aiops', port: 4898 },
  { name: 'memory-lifecycle', port: 4899 },
  { name: 'knowledge-registry', port: 4900 },
  { name: 'event-platform', port: 4901 },
  { name: 'workflow-registry', port: 4902 },
  { name: 'twin-registry', port: 4903 },
  { name: 'tenant-isolation', port: 4904 },
  { name: 'fine-tuning', port: 4610 },
  { name: 'eval-continuous', port: 4888 },
  { name: 'ai-studio', port: 4890 },
];

function benchmark(port, name, iterations, cb) {
  var latencies = [];

  function next(i) {
    if (i >= iterations) {
      var valid = latencies.filter(function(l) { return l >= 0; });
      if (valid.length === 0) return cb(null, { name: name, p50: -1, p95: -1, p99: -1, errors: iterations });
      valid.sort(function(a, b) { return a - b; });
      var p50 = valid[Math.floor(valid.length * 0.5)];
      var p95 = valid[Math.floor(valid.length * 0.95)];
      var p99 = valid[Math.floor(valid.length * 0.99)];
      return cb(null, { name: name, p50: p50, p95: p95, p99: p99, errors: iterations - valid.length });
    }

    var start = Date.now();
    var req = http.get('http://localhost:' + port + '/health', function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        latencies.push(Date.now() - start);
        next(i + 1);
      });
    });
    req.on('error', function() { latencies.push(-1); next(i + 1); });
    req.setTimeout(5000, function() { req.destroy(); latencies.push(-1); next(i + 1); });
  }

  next(0);
}

function main() {
  console.log('HOJAI AI Performance Benchmarks (100 iterations each)');
  console.log('==================================================');
  console.log('Service           | p50   | p95   | p99   | Errors');
  console.log('------------------|-------|-------|-------|-------');

  var done = 0;
  SERVICES.forEach(function(svc) {
    benchmark(svc.port, svc.name, 100, function(err, r) {
      done++;
      var p50 = r.p50 < 0 ? 'FAIL' : r.p50 + 'ms';
      var p95 = r.p95 < 0 ? 'FAIL' : r.p95 + 'ms';
      var p99 = r.p99 < 0 ? 'FAIL' : r.p99 + 'ms';
      console.log(r.name.padEnd(18) + '| ' + p50.padStart(6) + ' | ' + p95.padStart(6) + ' | ' + p99.padStart(6) + ' | ' + r.errors);
      if (done === SERVICES.length) {
        console.log('\nRun with: docker-compose up -d && node benchmarks.js');
      }
    });
  });
}

main();
