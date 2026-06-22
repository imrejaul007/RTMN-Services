/**
 * Tests for agent-teaming: team formation, leader election, DAG validation,
 * failure recovery, and mission templates.
 *
 * Run from the service directory:
 *   node tests/teaming.test.cjs
 */

const path = require('path');
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '0';

const svc = require(path.resolve(__dirname, '..', 'src', 'index.js'));
const {
  app,
  formTeam,
  electLeader,
  createTaskDAG,
  readySteps,
  handleStepFailure,
  createMissionFromTemplate,
  MISSION_TEMPLATES,
  LEADER_ELECTION_ALGORITHMS,
} = svc;

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { console.log(`PASS: ${msg}`); pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

(async () => {
  // === Unit: leader election ===
  {
    const cands = [
      { id: 'a', reputation: 60 },
      { id: 'b', reputation: 90 },
      { id: 'c', reputation: 75 },
    ];
    const leader = electLeader(cands, LEADER_ELECTION_ALGORITHMS.BULLY);
    assert(leader.id === 'b', 'bully algo picks highest-reputation candidate');

    const raft = electLeader(cands, LEADER_ELECTION_ALGORITHMS.RAFT);
    assert(raft.id === 'c', 'raft algo picks highest-id candidate');
  }

  // === Unit: DAG validation ===
  {
    const dag = createTaskDAG('m1', [
      { id: 'a', label: 'A', agentRole: 'r' },
      { id: 'b', label: 'B', agentRole: 'r', dependsOn: ['a'] },
      { id: 'c', label: 'C', agentRole: 'r', dependsOn: ['b'] },
    ]);
    assert(dag.steps.length === 3, 'DAG with 3 steps created');
    assert(readySteps(dag).map((s) => s.id).join(',') === 'a', 'only step with no deps is ready');

    dag.steps[0].status = 'completed';
    assert(readySteps(dag).map((s) => s.id).join(',') === 'b', 'after completing a, b is ready');

    let threw = false;
    try {
      createTaskDAG('m2', [
        { id: 'x', label: 'X', agentRole: 'r', dependsOn: ['y'] },
        { id: 'y', label: 'Y', agentRole: 'r', dependsOn: ['x'] },
      ]);
    } catch (e) {
      threw = /cycle/i.test(e.message);
    }
    assert(threw, 'DAG cycle detection works');
  }

  // === Unit: failure recovery ===
  {
    const dag = createTaskDAG('m3', [{ id: 'a', label: 'A', agentRole: 'r' }]);
    const team = { id: 'T1', leader: 'agent-boss' };
    const step = dag.steps[0];
    const err = new Error('boom');

    const r1 = await handleStepFailure(dag, step, err, team);
    assert(r1.action === 'retry' && r1.recovered === true, 'first failure retries');

    step.retries = 3; // force past max
    const r2 = await handleStepFailure(dag, step, err, team);
    assert(r2.action === 'escalate' && r2.recovered === false, 'after max retries, escalates to leader');
    assert(r2.leader === 'agent-boss', 'escalation target is team leader');
  }

  // === Unit: mission templates ===
  {
    const templates = Object.keys(MISSION_TEMPLATES);
    assert(templates.length >= 5, `has 5+ mission templates (got ${templates.length})`);
    assert(templates.includes('price-compare'), 'price-compare template present');
    assert(templates.includes('dispute-mediation'), 'dispute-mediation template present');
    assert(templates.includes('contract-bundle'), 'contract-bundle template present');
    assert(templates.includes('market-research'), 'market-research template present');
    assert(templates.includes('multi-vendor-fulfilment'), 'multi-vendor-fulfilment template present');
    assert(templates.includes('reputation-rollup'), 'reputation-rollup template present (6 total)');
  }

  // === Unit: formTeam fallback when ACN is down ===
  {
    const team = await formTeam({ name: 'no-candidates', missionId: 'm4', minSize: 1, maxSize: 3 });
    assert(team.error, 'formTeam with no ACN candidates returns error (as expected offline)');
  }

  // === HTTP: GET /health ===
  {
    const http = require('http');
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    const port = server.address().port;
    const res = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/health`, (r) => {
        let body = '';
        r.on('data', (c) => body += c);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(body) }));
      }).on('error', reject);
    });
    assert(res.status === 200 && res.body.service === 'agent-teaming', 'GET /health returns 200');
    assert(typeof res.body.timestamp === 'string', 'GET /health includes timestamp');
    server.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});