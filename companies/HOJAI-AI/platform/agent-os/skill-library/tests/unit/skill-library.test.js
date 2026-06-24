'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const idx = require('../../src/index');
const {
  validateSkill, normalizeSkill,
  hasCircularDependency, topoSortDependencies, collectToolIds, mergeInputs,
  findSkill, byCategory, byTag, searchByName, listAll,
  validateVersionBump, nextVersion,
  loadSkills, saveSkills, loadSkillVersions, saveSkillVersions,
  app, SERVICE_NAME, PORT, VERSION,
  VALID_TYPES, SEMVER_RE,
} = idx;

// ---------- Validation: validateSkill ----------

test('validateSkill accepts a minimal valid skill', () => {
  const errs = validateSkill({ name: 'summarize' });
  assert.deepEqual(errs, []);
});

test('validateSkill rejects missing name', () => {
  const errs = validateSkill({ description: 'no name' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateSkill rejects empty name', () => {
  const errs = validateSkill({ name: '   ' });
  assert.ok(errs.some((e) => e.includes('name')));
});

test('validateSkill rejects invalid semver', () => {
  const errs = validateSkill({ name: 'x', version: '1.0' });
  assert.ok(errs.some((e) => e.includes('version')));
});

test('validateSkill accepts valid semver', () => {
  const errs = validateSkill({ name: 'x', version: '1.2.3' });
  assert.deepEqual(errs, []);
});

test('validateSkill rejects non-array tools', () => {
  const errs = validateSkill({ name: 'x', tools: 'tl_1' });
  assert.ok(errs.some((e) => e.includes('tools')));
});

test('validateSkill rejects non-string tool entries', () => {
  const errs = validateSkill({ name: 'x', tools: [123] });
  assert.ok(errs.some((e) => e.includes('tools')));
});

test('validateSkill rejects non-array skills', () => {
  const errs = validateSkill({ name: 'x', skills: 'skl_1' });
  assert.ok(errs.some((e) => e.includes('skills')));
});

test('validateSkill rejects non-string skill entries', () => {
  const errs = validateSkill({ name: 'x', skills: [42] });
  assert.ok(errs.some((e) => e.includes('skills')));
});

test('validateSkill rejects non-object inputs map', () => {
  const errs = validateSkill({ name: 'x', inputs: 'bad' });
  assert.ok(errs.some((e) => e.includes('inputs')));
});

test('validateSkill rejects invalid input type', () => {
  const errs = validateSkill({ name: 'x', inputs: { foo: { type: 'badtype' } } });
  assert.ok(errs.some((e) => e.includes('type')));
});

test('validateSkill rejects non-boolean required', () => {
  const errs = validateSkill({ name: 'x', inputs: { foo: { type: 'string', required: 'yes' } } });
  assert.ok(errs.some((e) => e.includes('required')));
});

test('validateSkill rejects non-string tags', () => {
  const errs = validateSkill({ name: 'x', tags: [1, 2] });
  assert.ok(errs.some((e) => e.includes('tags')));
});

test('validateSkill handles null', () => {
  const errs = validateSkill(null);
  assert.ok(errs.length > 0);
});

// ---------- normalizeSkill ----------

test('normalizeSkill assigns id with skl_ prefix', () => {
  const s = normalizeSkill({ name: 'foo' }, null);
  assert.ok(s.id && s.id.startsWith('skl_'));
  assert.equal(s.category, 'GENERAL');
  assert.equal(s.version, '1.0.0');
});

test('normalizeSkill preserves existing fields when body omits them', () => {
  const existing = { id: 'skl_1', name: 'foo', version: '1.0.0', category: 'CUSTOM' };
  const s = normalizeSkill({}, existing);
  assert.equal(s.id, 'skl_1');
  assert.equal(s.name, 'foo');
  assert.equal(s.category, 'CUSTOM');
});

// ---------- Graph: hasCircularDependency ----------

test('hasCircularDependency returns cycle when self-reference', () => {
  const result = hasCircularDependency([{ id: 'skl_1', skills: ['skl_1'] }], 'skl_1', 'skl_1');
  assert.equal(result.cycle, true);
});

test('hasCircularDependency returns cycle when reachable', () => {
  const skills = [
    { id: 'skl_1', skills: ['skl_2'] },
    { id: 'skl_2', skills: ['skl_1'] },
  ];
  const result = hasCircularDependency(skills, 'skl_1', 'skl_1');
  assert.equal(result.cycle, true);
});

test('hasCircularDependency returns no cycle for DAG', () => {
  const skills = [
    { id: 'skl_1', skills: ['skl_2', 'skl_3'] },
    { id: 'skl_2', skills: [] },
    { id: 'skl_3', skills: [] },
  ];
  const result = hasCircularDependency(skills, 'skl_1', 'skl_1');
  assert.equal(result.cycle, false);
});

test('hasCircularDependency handles null', () => {
  const result = hasCircularDependency(null, 'skl_1', 'skl_1');
  assert.equal(result.cycle, false);
});

// ---------- Graph: topoSortDependencies ----------

test('topoSortDependencies returns leaves-first order for DAG', () => {
  const skills = [
    { id: 'skl_1', skills: ['skl_2', 'skl_3'] },
    { id: 'skl_2', skills: ['skl_4'] },
    { id: 'skl_3', skills: [] },
    { id: 'skl_4', skills: [] },
  ];
  const { order, missing } = topoSortDependencies(skills, 'skl_1');
  assert.deepEqual(missing, []);
  assert.equal(order.length, 4);
  // Dependencies should come before dependents
  const pos = (id) => order.indexOf(id);
  assert.ok(pos('skl_4') < pos('skl_2'));
  assert.ok(pos('skl_2') < pos('skl_1'));
  assert.ok(pos('skl_3') < pos('skl_1'));
});

test('topoSortDependencies returns empty for unknown root', () => {
  const { order, missing } = topoSortDependencies([{ id: 'skl_1' }], 'skl_nope');
  assert.deepEqual(order, []);
});

test('topoSortDependencies reports missing skill ids', () => {
  const skills = [{ id: 'skl_1', skills: ['skl_ghost'] }];
  const { order, missing } = topoSortDependencies(skills, 'skl_1');
  assert.ok(missing.includes('skl_ghost'));
});

// ---------- Graph: collectToolIds ----------

test('collectToolIds returns own tool ids', () => {
  const skill = { id: 'skl_1', tools: ['tl_a', 'tl_b'], skills: [] };
  const tools = collectToolIds(skill, []);
  assert.deepEqual(tools.sort(), ['tl_a', 'tl_b']);
});

test('collectToolIds aggregates from sub-skills', () => {
  const skill = { id: 'skl_1', tools: ['tl_a'], skills: ['skl_2', 'skl_3'] };
  const skills = [
    { id: 'skl_2', tools: ['tl_b', 'tl_c'], skills: [] },
    { id: 'skl_3', tools: ['tl_d'], skills: [] },
  ];
  const tools = collectToolIds(skill, skills);
  assert.deepEqual(tools.sort(), ['tl_a', 'tl_b', 'tl_c', 'tl_d']);
});

test('collectToolIds dedupes across nested skills', () => {
  const skill = { id: 'skl_1', tools: ['tl_a'], skills: ['skl_2', 'skl_3'] };
  const skills = [
    { id: 'skl_2', tools: ['tl_a', 'tl_b'], skills: ['skl_3'] },
    { id: 'skl_3', tools: ['tl_b'], skills: [] },
  ];
  const tools = collectToolIds(skill, skills);
  assert.deepEqual(tools.sort(), ['tl_a', 'tl_b']);
});

test('collectToolIds handles null skill', () => {
  const tools = collectToolIds(null, []);
  assert.deepEqual(tools, []);
});

// ---------- Graph: mergeInputs ----------

test('mergeInputs binds declared inputs', () => {
  const skill = { inputs: { url: { type: 'string', required: true } } };
  const result = mergeInputs(skill, { url: 'https://x' });
  assert.deepEqual(result.bound, { url: 'https://x' });
  assert.deepEqual(result.missing, []);
});

test('mergeInputs reports missing required inputs', () => {
  const skill = { inputs: { url: { type: 'string', required: true } } };
  const result = mergeInputs(skill, {});
  assert.deepEqual(result.missing, ['url']);
});

test('mergeInputs reports extra inputs', () => {
  const skill = { inputs: { url: { type: 'string' } } };
  const result = mergeInputs(skill, { url: 'x', extra: 'y' });
  assert.deepEqual(result.extra, ['extra']);
});

test('mergeInputs handles null skill', () => {
  const result = mergeInputs(null, {});
  assert.deepEqual(result, { bound: {}, missing: [], extra: [] });
});

// ---------- Filters ----------

test('byCategory filters by category', () => {
  const arr = [{ category: 'A' }, { category: 'B' }];
  assert.equal(byCategory(arr, 'A').length, 1);
});

test('byCategory returns all when category missing', () => {
  const arr = [{ category: 'A' }, { category: 'B' }];
  assert.equal(byCategory(arr, undefined).length, 2);
});

test('byTag filters by tag', () => {
  const arr = [{ tags: ['x'] }, { tags: ['y'] }];
  assert.equal(byTag(arr, 'x').length, 1);
});

test('byTag returns all when tag missing', () => {
  const arr = [{ tags: ['x'] }];
  assert.equal(byTag(arr, undefined).length, 1);
});

test('searchByName matches substring case-insensitive', () => {
  const arr = [{ name: 'SummarizeDoc' }, { name: 'Translate' }];
  assert.equal(searchByName(arr, 'sum').length, 1);
  assert.equal(searchByName(arr, 'TRAN').length, 1);
});

test('searchByName returns all when q missing', () => {
  const arr = [{ name: 'a' }];
  assert.equal(searchByName(arr, undefined).length, 1);
});

test('listAll returns same array', () => {
  const arr = [{ a: 1 }];
  assert.equal(listAll(arr), arr);
});

test('findSkill returns matching skill or null', () => {
  const arr = [{ id: 'skl_1' }];
  assert.equal(findSkill(arr, 'skl_1').id, 'skl_1');
  assert.equal(findSkill(arr, 'nope'), null);
});

// ---------- Versioning ----------

test('validateVersionBump accepts patch bump', () => {
  assert.equal(validateVersionBump('1.0.0', '1.0.1'), null);
});

test('validateVersionBump accepts minor bump', () => {
  assert.equal(validateVersionBump('1.0.0', '1.1.0'), null);
});

test('validateVersionBump accepts major bump', () => {
  assert.equal(validateVersionBump('1.0.0', '2.0.0'), null);
});

test('validateVersionBump rejects downgrade patch', () => {
  assert.ok(validateVersionBump('1.0.5', '1.0.3') !== null);
});

test('validateVersionBump rejects equal version', () => {
  assert.ok(validateVersionBump('1.0.5', '1.0.5') !== null);
});

test('validateVersionBump rejects invalid semver', () => {
  assert.ok(validateVersionBump('abc', '1.0.1') !== null);
  assert.ok(validateVersionBump('1.0.0', 'xyz') !== null);
});

test('nextVersion increments patch', () => {
  assert.equal(nextVersion('1.2.3'), '1.2.4');
});

test('nextVersion handles invalid input', () => {
  assert.equal(nextVersion('bad'), '1.0.0');
});

// ---------- Storage ----------

test('loadSkills returns [] when no file', () => {
  const arr = loadSkills();
  assert.ok(Array.isArray(arr));
});

test('saveSkills then loadSkills roundtrips', () => {
  const skills = [{ id: 'skl_test', name: 'test', version: '1.0.0' }];
  saveSkills(skills);
  const back = loadSkills();
  assert.equal(back.length, 1);
  assert.equal(back[0].id, 'skl_test');
});

test('loadSkillVersions + saveSkillVersions roundtrip', () => {
  const versions = [{ id: 'ver_test', skillId: 'skl_test', version: '1.0.0' }];
  saveSkillVersions(versions);
  const back = loadSkillVersions();
  assert.equal(back.length, 1);
  assert.equal(back[0].skillId, 'skl_test');
});

// ---------- HTTP integration ----------

function startTestServer() {
  return new Promise((resolve) => {
    const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-library-test-'));
    process.env.SKILL_LIBRARY_DATA_DIR = testDataDir;
    delete require.cache[require.resolve('../../src/index')];
    const idx2 = require('../../src/index');
    const srv = idx2.app.listen(0, () => resolve({ srv, port: srv.address().port, dataDir: testDataDir, idx: idx2 }));
  });
}

test('HTTP: GET /health works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.service, 'skill-library');
  assert.equal(body.port, 4806);
  srv.close();
});

test('HTTP: GET /ready works', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/ready`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ready, true);
  srv.close();
});

test('HTTP: POST /api/skills creates skill with id and defaults', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'summarize', tools: ['tl_a'], category: 'TEXT' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id && body.id.startsWith('skl_'));
  assert.equal(body.name, 'summarize');
  assert.equal(body.category, 'TEXT');
  assert.equal(body.version, '1.0.0');
  srv.close();
});

test('HTTP: POST /api/skills validates body and returns 400', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'no name' }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: POST /api/skills rejects unknown sub-skill reference', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'composite', skills: ['skl_ghost'] }),
  });
  assert.equal(res.status, 400);
  srv.close();
});

test('HTTP: GET /api/skills lists skills', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a' }),
  });
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', category: 'X' }),
  });
  const res = await fetch(`http://localhost:${port}/api/skills`);
  const body = await res.json();
  assert.equal(body.count, 2);
  srv.close();
});

test('HTTP: GET /api/skills?category=X filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', category: 'X' }),
  });
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b' }),
  });
  const res = await fetch(`http://localhost:${port}/api/skills?category=X`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.skills[0].name, 'a');
  srv.close();
});

test('HTTP: GET /api/skills?tag=foo filters by tag', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a', tags: ['foo', 'bar'] }),
  });
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', tags: ['baz'] }),
  });
  const res = await fetch(`http://localhost:${port}/api/skills?tag=foo`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.skills[0].name, 'a');
  srv.close();
});

test('HTTP: GET /api/skills/search filters by name substring', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'summarize-doc' }),
  });
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'translate-text' }),
  });
  const res = await fetch(`http://localhost:${port}/api/skills/search?q=sum`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.skills[0].name, 'summarize-doc');
  srv.close();
});

test('HTTP: GET /api/skills/search works with combined filters', async () => {
  const { srv, port } = await startTestServer();
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'summarize-doc', category: 'TEXT' }),
  });
  await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'summarize-img', category: 'IMAGE' }),
  });
  const res = await fetch(`http://localhost:${port}/api/skills/search?category=TEXT&q=sum`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.skills[0].name, 'summarize-doc');
  srv.close();
});

test('HTTP: GET /api/skills/:id returns the skill', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo' }),
  });
  const created = await create.json();
  const get = await fetch(`http://localhost:${port}/api/skills/${created.id}`);
  assert.equal(get.status, 200);
  const body = await get.json();
  assert.equal(body.id, created.id);
  srv.close();
});

test('HTTP: GET /api/skills/:id 404 when missing', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/api/skills/skl_nope`);
  assert.equal(res.status, 404);
  srv.close();
});

test('HTTP: PATCH /api/skills/:id updates skill', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo', category: 'A' }),
  });
  const created = await create.json();
  const patch = await fetch(`http://localhost:${port}/api/skills/${created.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'B' }),
  });
  assert.equal(patch.status, 200);
  const body = await patch.json();
  assert.equal(body.category, 'B');
  assert.equal(body.name, 'foo');
  srv.close();
});

test('HTTP: PATCH /api/skills/:id rejects circular dependency', async () => {
  const { srv, port } = await startTestServer();
  const a = await (await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'a' }),
  })).json();
  const b = await (await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'b', skills: [a.id] }),
  })).json();
  // Now patching 'a' to include 'b' would create cycle a -> b -> a
  const patch = await fetch(`http://localhost:${port}/api/skills/${a.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skills: [b.id] }),
  });
  assert.equal(patch.status, 400);
  const body = await patch.json();
  assert.equal(body.error, 'circular_dependency');
  srv.close();
});

test('HTTP: DELETE /api/skills/:id deletes skill', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo' }),
  });
  const created = await create.json();
  const del = await fetch(`http://localhost:${port}/api/skills/${created.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const get = await fetch(`http://localhost:${port}/api/skills/${created.id}`);
  assert.equal(get.status, 404);
  srv.close();
});

test('HTTP: POST /api/skills/:id/versions creates version snapshot', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo' }),
  });
  const created = await create.json();
  const ver = await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: '1.0.1' }),
  });
  assert.equal(ver.status, 201);
  const body = await ver.json();
  assert.equal(body.version, '1.0.1');
  assert.equal(body.skill.version, '1.0.1');
  srv.close();
});

test('HTTP: POST /api/skills/:id/versions auto-bumps patch if no version specified', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo', version: '1.2.3' }),
  });
  const created = await create.json();
  const ver = await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(ver.status, 201);
  const body = await ver.json();
  assert.equal(body.version, '1.2.4');
  srv.close();
});

test('HTTP: POST /api/skills/:id/versions rejects invalid bump', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo', version: '1.0.5' }),
  });
  const created = await create.json();
  const ver = await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: '1.0.3' }),
  });
  assert.equal(ver.status, 400);
  srv.close();
});

test('HTTP: GET /api/skills/:id/versions lists versions', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'foo' }),
  });
  const created = await create.json();
  await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: '1.0.1' }),
  });
  await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: '1.0.2' }),
  });
  const list = await fetch(`http://localhost:${port}/api/skills/${created.id}/versions`);
  const body = await list.json();
  assert.equal(body.count, 3);
  assert.deepEqual(body.versions.map((v) => v.version).sort(), ['1.0.0', '1.0.1', '1.0.2']);
  srv.close();
});

test('HTTP: GET /api/skills/:id/plan returns execution plan', async () => {
  const { srv, port } = await startTestServer();
  // Create leaf skill first
  const leaf = await (await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'leaf', tools: ['tl_a', 'tl_b'] }),
  })).json();
  // Create composite
  const comp = await (await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'comp', tools: ['tl_c'], skills: [leaf.id] }),
  })).json();
  const plan = await fetch(`http://localhost:${port}/api/skills/${comp.id}/plan`);
  const body = await plan.json();
  assert.equal(body.totalTools, 3);
  assert.deepEqual(body.tools.sort(), ['tl_a', 'tl_b', 'tl_c']);
  assert.ok(body.skills.includes(leaf.id));
  assert.ok(body.skills.includes(comp.id));
  srv.close();
});

test('HTTP: POST /api/skills/:id/resolve binds inputs', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'fetch',
      inputs: {
        url: { type: 'string', required: true },
        timeout: { type: 'number', required: false },
      },
    }),
  });
  const created = await create.json();
  const res = await fetch(`http://localhost:${port}/api/skills/${created.id}/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: { url: 'https://x', extra: 'y' } }),
  });
  const body = await res.json();
  assert.deepEqual(body.bound, { url: 'https://x' });
  assert.deepEqual(body.missing, []);
  assert.deepEqual(body.extra, ['extra']);
  srv.close();
});

test('HTTP: POST /api/skills/:id/resolve reports missing required', async () => {
  const { srv, port } = await startTestServer();
  const create = await fetch(`http://localhost:${port}/api/skills`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'fetch',
      inputs: { url: { type: 'string', required: true } },
    }),
  });
  const created = await create.json();
  const res = await fetch(`http://localhost:${port}/api/skills/${created.id}/resolve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: {} }),
  });
  const body = await res.json();
  assert.deepEqual(body.missing, ['url']);
  srv.close();
});

test('HTTP: unknown route returns 404', async () => {
  const { srv, port } = await startTestServer();
  const res = await fetch(`http://localhost:${port}/no-such-route`);
  assert.equal(res.status, 404);
  srv.close();
});