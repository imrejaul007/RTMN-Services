/**
 * Frontend app — talks to the backend via /api/* (proxied by server.js).
 */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let allProducts = [];

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

function fmtPrice(p) {
  if (p.priceInr == null) return '—';
  return `₹${p.priceInr.toLocaleString('en-IN')} <small>/ ${p.unit || 'unit'}</small>`;
}

function productCard(p) {
  return `
    <div class="card" data-id="${p.id}">
      <h3>${p.title}</h3>
      <div class="meta">${p.category} · stock ${p.stock}</div>
      <div class="price">${fmtPrice(p)}</div>
    </div>`;
}

function agentCard(a) {
  return `
    <div class="card agent-card" data-agent="${a.name}">
      <span class="badge">SUTAR</span>
      <h3>${a.name} Agent</h3>
      <div class="meta">${a.description}</div>
      <button class="agent-btn">Invoke</button>
    </div>`;
}

async function loadProducts() {
  const q = $('#q').value;
  const cat = $('#category').value;
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (cat) qs.set('category', cat);
  const r = await api(`/api/buyer/products?${qs.toString()}`);
  allProducts = r.items;
  $('#products').innerHTML = r.items.map(productCard).join('') || '<p class="muted">No products.</p>';
  $('#rfqProduct').innerHTML = r.items.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
}

async function loadAgents() {
  const r = await api('/api/agents');
  $('#agentList').innerHTML = r.agents.map(agentCard).join('');
  $$('.agent-card').forEach(el => {
    el.addEventListener('click', async () => {
      const name = el.dataset.agent;
      $('#agentResult').className = 'result';
      $('#agentResult').textContent = `Invoking ${name}…`;
      try {
        const r = await api(`/api/agents/${name}`, { method: 'POST', body: JSON.stringify({ goal: 'demo', rfqId: 'demo', productId: allProducts[0]?.id, quantity: 10, orderId: 'demo', amountInr: 5000, ticket: 'demo' }) });
        $('#agentResult').className = 'result ok';
        $('#agentResult').textContent = JSON.stringify(r, null, 2);
      } catch (e) {
        $('#agentResult').className = 'result error';
        $('#agentResult').textContent = e.message;
      }
    });
  });
}

async function loadNexha() {
  try {
    const r = await api('/api/nexha/profile');
    const c = r.capability || {};
    const m = r.manifest || {};
    $('#nexhaProfile').innerHTML = `
      <div class="nexha-card">
        <h3>${m.name || '{{PROJECT_TITLE}}'}</h3>
        <dl>
          <dt>projectId</dt><dd><code>${m.projectId || ''}</code></dd>
          <dt>region</dt><dd>${m.region || ''}</dd>
          <dt>languages</dt><dd>${(m.languages || []).join(', ')}</dd>
          <dt>agents</dt><dd>${(c.capabilities || []).map(x => x.name).join(', ') || '—'}</dd>
          <dt>layer</dt><dd>${c.layer ?? '—'}</dd>
          <dt>sla</dt><dd>${c.slaTargets ? c.slaTargets.uptimePercent + '% / ' + c.slaTargets.responseMs + 'ms' : '—'}</dd>
        </dl>
      </div>`;
  } catch (e) {
    $('#nexhaProfile').innerHTML = `<div class="result error">${e.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $$('.tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    $$('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`#${btn.dataset.tab}`).classList.add('active');
  }));

  $('#q').addEventListener('input', debounce(loadProducts, 200));
  $('#category').addEventListener('change', loadProducts);

  $('#rfqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = $('#rfqResult');
    result.className = 'result';
    result.textContent = 'Submitting…';
    try {
      const r = await api('/api/buyer/rfqs', {
        method: 'POST',
        body: JSON.stringify({ buyerId: 'demo-buyer', productId: $('#rfqProduct').value, quantity: Number($('#rfQty').value), message: $('#rfMsg').value })
      });
      result.className = 'result ok';
      result.textContent = 'RFQ submitted!\n\n' + JSON.stringify(r, null, 2);
    } catch (err) {
      result.className = 'result error';
      result.textContent = err.message;
    }
  });

  await loadProducts();
  await loadAgents();
  await loadNexha();
});

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
