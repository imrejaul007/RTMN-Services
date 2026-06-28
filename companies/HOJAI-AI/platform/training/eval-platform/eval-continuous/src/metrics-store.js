import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = fileURLToPath(import.meta.url);
const DATA_DIR = join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (name) => {
  const path = join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
};
const writeJson = (name, data) => {
  const path = join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
};

export function getRuns() { return readJson('runs'); }
export function getRun(id) { return readJson('runs').find(r => r.id === id); }
export function saveRun(run) {
  const runs = readJson('runs');
  const idx = runs.findIndex(r => r.id === run.id);
  if (idx >= 0) runs[idx] = run; else runs.push(run);
  writeJson('runs', runs);
  return run;
}

export function getBaselines() { return readJson('baselines'); }
export function getBaseline(service, suite) {
  return readJson('baselines').find(b => b.service === service && b.suite === suite);
}
export function saveBaseline(baseline) {
  const all = readJson('baselines');
  const idx = all.findIndex(b => b.service === baseline.service && b.suite === baseline.suite);
  if (idx >= 0) all[idx] = baseline; else all.push(baseline);
  writeJson('baselines', all);
  return baseline;
}

export function getMetricsTrend(service, suite, limit = 20) {
  const runs = readJson('runs')
    .filter(r => (!service || r.service === service) && (!suite || r.suite === suite) && r.metrics)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .slice(-limit);
  return runs.map(r => ({ id: r.id, service: r.service, suite: r.suite, verdict: r.verdict, metrics: r.metrics, timestamp: r.startedAt }));
}

export function getCurrentMetrics(service, suite) {
  const runs = readJson('runs')
    .filter(r => (!service || r.service === service) && (!suite || r.suite === suite) && r.status === 'completed')
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  if (!runs.length) return null;
  const latest = runs[0];
  const baseline = getBaseline(service, suite);
  if (!baseline) return { current: latest.metrics, baseline: null, compare: null };
  const delta = latest.metrics.quality - baseline.metrics.quality;
  return {
    current: latest.metrics,
    baseline: baseline.metrics,
    compare: { delta: parseFloat(delta.toFixed(4)), percentChange: parseFloat(((delta / baseline.metrics.quality) * 100).toFixed(2)) }
  };
}

export function isGated(service, suite) {
  const latest = readJson('runs')
    .filter(r => r.service === service && (!suite || r.suite === suite) && r.status === 'completed')
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
  if (!latest) return false;
  if (latest.verdict === 'fail') return true;
  const baseline = getBaseline(service, suite);
  if (baseline && latest.metrics) {
    const delta = latest.metrics.quality - baseline.metrics.quality;
    if (delta < -0.05) return true; // 5% regression gates
  }
  return false;
}
