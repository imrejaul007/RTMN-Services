/**
 * HOJAI InternetOS Admin Dashboard
 *
 * Plain vanilla JS (no build step needed).
 * Connects to the InternetOS API at port 4595.
 */

const API_BASE = window.location.protocol + '//' + window.location.hostname + ':4595';

// === Navigation ===
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + view).classList.add('active');

    if (view === 'actors') loadActors();
    if (view === 'research') loadAgents();
    if (view === 'scheduler') loadSchedules();
    if (view === 'watchers') loadWatchers();
    if (view === 'overview') loadOverview();
  });
});

// === Health Check ===
async function checkHealth() {
  try {
    const response = await fetch(API_BASE + '/health');
    const data = await response.json();

    const indicator = document.getElementById('health-indicator');
    const text = document.getElementById('health-text');

    if (data.status === 'healthy') {
      indicator.className = 'health-indicator healthy';
      text.textContent = 'Healthy - ' + new Date().toLocaleTimeString();
    } else {
      indicator.className = 'health-indicator unhealthy';
      text.textContent = 'Unhealthy';
    }
  } catch (error) {
    document.getElementById('health-indicator').className = 'health-indicator unhealthy';
    document.getElementById('health-text').textContent = 'API Unreachable';
  }
}

// === Overview ===
async function loadOverview() {
  try {
    const stats = await fetch(API_BASE + '/api/stats').then(r => r.json());
    document.getElementById('stat-actors').textContent = await getActorCount();
    document.getElementById('stat-skills').textContent = '5';
    document.getElementById('stat-agents').textContent = await getAgentCount();
    document.getElementById('stat-schedules').textContent = await getScheduleCount();
    document.getElementById('stat-watchers').textContent = await getWatcherCount();
    document.getElementById('stat-runs').textContent = stats.actors?.totalRuns || 0;

    // Health list
    const healthItems = [
      { name: 'InternetOS API (this)', url: API_BASE + '/health' },
      { name: 'MemoryOS (4703)', url: 'http://localhost:4703/health' },
      { name: 'TwinOS Hub (4705)', url: 'http://localhost:4705/health' },
      { name: 'Knowledge Extraction (4784)', url: 'http://localhost:4784/health' },
      { name: 'Webhook Bus (4110)', url: 'http://localhost:4110/health' },
      { name: 'SkillOS (4743)', url: 'http://localhost:4743/health' },
    ];

    const healthList = document.getElementById('health-list');
    healthList.innerHTML = '';
    for (const svc of healthItems) {
      const div = document.createElement('div');
      div.className = 'health-item';
      try {
        const r = await fetch(svc.url, { mode: 'no-cors' });
        div.classList.add(r.ok ? 'online' : 'offline');
        div.innerHTML = `<span><span class="status-dot"></span>${svc.name}</span><span>${r.ok ? 'Online' : 'Unknown'}</span>`;
      } catch {
        div.classList.add('offline');
        div.innerHTML = `<span><span class="status-dot"></span>${svc.name}</span><span>Offline</span>`;
      }
      healthList.appendChild(div);
    }

    document.getElementById('last-refresh').textContent = 'Last refresh: ' + new Date().toLocaleTimeString();
  } catch (error) {
    console.error('Failed to load overview:', error);
  }
}

async function getActorCount() {
  try {
    const r = await fetch(API_BASE + '/api/actors').then(r => r.json());
    return r.count || 0;
  } catch { return '?'; }
}

async function getAgentCount() {
  try {
    const r = await fetch(API_BASE + '/api/research/agents').then(r => r.json());
    return r.count || 0;
  } catch { return '?'; }
}

async function getScheduleCount() {
  try {
    const r = await fetch(API_BASE + '/api/scheduler/').then(r => r.json());
    return r.count || 0;
  } catch { return '?'; }
}

async function getWatcherCount() {
  try {
    const r = await fetch(API_BASE + '/api/watchers').then(r => r.json());
    return r.count || 0;
  } catch { return '?'; }
}

// === Actors ===
async function loadActors() {
  const list = document.getElementById('actors-list');
  try {
    const data = await fetch(API_BASE + '/api/actors').then(r => r.json());
    list.innerHTML = '';
    const search = document.getElementById('actor-search')?.value.toLowerCase() || '';
    for (const actor of data.actors || []) {
      if (search && !actor.name.toLowerCase().includes(search) && !actor.id.includes(search)) continue;
      const card = document.createElement('div');
      card.className = 'actor-card';
      card.innerHTML = `
        <div class="actor-name">${actor.name}</div>
        <div class="actor-id">id: ${actor.id}</div>
        <div class="actor-capabilities">
          ${(actor.capabilities || []).map(c => `<span class="capability-tag">${c}</span>`).join('')}
        </div>
        <button class="btn-primary" onclick="runActor('${actor.id}')">Run Test</button>
      `;
      list.appendChild(card);
    }
  } catch (error) {
    list.innerHTML = '<p>Failed to load actors. Is the API running?</p>';
  }
}

async function runActor(actorId) {
  const result = await fetch(API_BASE + '/api/actors/' + actorId + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test', params: {} })
  }).then(r => r.json());
  alert(`Actor ${actorId} result:\n` + JSON.stringify(result, null, 2));
}

document.getElementById('refresh-actors')?.addEventListener('click', loadActors);
document.getElementById('actor-search')?.addEventListener('input', loadActors);

// === Research ===
async function loadAgents() {
  const data = await fetch(API_BASE + '/api/research/agents').then(r => r.json());
  // already displayed in overview
}

document.querySelectorAll('.research-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.research-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('run-research')?.addEventListener('click', async () => {
  const tab = document.querySelector('.research-tabs .tab-btn.active');
  const type = tab?.dataset.research || 'market';
  const input1 = document.getElementById('research-input-1').value;
  const input2 = document.getElementById('research-input-2').value;

  if (!input1) { alert('Please enter a topic'); return; }

  const body: any = type === 'market' ? { industry: input1, city: input2 } :
                  type === 'competitor' ? { competitor: input1, city: input2 } :
                  { category: input1, city: input2 };

  const result = document.getElementById('research-result');
  result.innerHTML = '<p>Running research agent...</p>';

  try {
    const data = await fetch(API_BASE + '/api/research/' + type, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
    result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  } catch (error) {
    result.innerHTML = '<p style="color:red;">Error: ' + error.message + '</p>';
  }
});

// === Scheduler ===
async function loadSchedules() {
  const list = document.getElementById('schedules-list');
  try {
    const data = await fetch(API_BASE + '/api/scheduler/').then(r => r.json());
    list.innerHTML = '';
    for (const schedule of data.schedules || []) {
      const card = document.createElement('div');
      card.className = 'schedule-card';
      card.innerHTML = `
        <strong>${schedule.id}</strong>
        <span class="schedule-cron">${schedule.cron}</span>
        <span>${schedule.agentType}</span>
        <span>${schedule.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
        <div>Runs: ${schedule.runCount || 0}</div>
        <button class="btn-secondary" onclick="runSchedule('${schedule.id}')">Run Now</button>
        <button class="btn-secondary" onclick="toggleSchedule('${schedule.id}', ${!schedule.enabled})">
          ${schedule.enabled ? 'Disable' : 'Enable'}
        </button>
      `;
      list.appendChild(card);
    }
  } catch (error) {
    list.innerHTML = '<p>Failed to load schedules.</p>';
  }
}

async function runSchedule(id) {
  const result = await fetch(API_BASE + '/api/scheduler/' + id + '/run', { method: 'POST' }).then(r => r.json());
  alert('Schedule run result:\n' + JSON.stringify(result, null, 2));
}

async function toggleSchedule(id, enable) {
  const action = enable ? 'enable' : 'disable';
  await fetch(API_BASE + '/api/scheduler/' + id + '/' + action, { method: 'POST' });
  loadSchedules();
}

document.getElementById('scheduler-start')?.addEventListener('click', async () => {
  await fetch(API_BASE + '/api/scheduler/start', { method: 'POST' });
  alert('Scheduler started');
});
document.getElementById('scheduler-stop')?.addEventListener('click', async () => {
  await fetch(API_BASE + '/api/scheduler/stop', { method: 'POST' });
  alert('Scheduler stopped');
});

// === Watchers ===
async function loadWatchers() {
  const list = document.getElementById('watchers-list');
  try {
    const data = await fetch(API_BASE + '/api/watchers').then(r => r.json());
    list.innerHTML = '';
    for (const watcher of data.watchers || []) {
      const card = document.createElement('div');
      card.className = 'watcher-card';
      card.innerHTML = `
        <strong>${watcher.id}</strong>
        <div class="watcher-info">${watcher.url}</div>
        <span>Type: ${watcher.type}</span>
        <span>Interval: ${watcher.interval}ms</span>
      `;
      list.appendChild(card);
    }
  } catch (error) {
    list.innerHTML = '<p>Failed to load watchers.</p>';
  }
}

document.getElementById('create-watcher')?.addEventListener('click', async () => {
  const id = 'watcher-' + Date.now();
  const url = document.getElementById('watcher-url').value;
  const type = document.getElementById('watcher-type').value;
  const selector = document.getElementById('watcher-selector').value;
  const interval = parseInt(document.getElementById('watcher-interval').value);

  if (!url) { alert('Please enter a URL'); return; }

  await fetch(API_BASE + '/api/watchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: id, url, type, interval, selector })
  });
  loadWatchers();
});

// === Init ===
checkHealth();
loadOverview();
setInterval(checkHealth, 30000);
setInterval(loadOverview, 60000);