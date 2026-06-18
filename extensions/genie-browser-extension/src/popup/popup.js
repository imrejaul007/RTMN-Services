/**
 * Genie Browser Extension - Popup Script
 */

// Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const pagesSaved = document.getElementById('pages-saved');
const contextsCount = document.getElementById('contexts');
const btnAsk = document.getElementById('btn-ask');
const btnSummarize = document.getElementById('btn-summarize');
const btnSave = document.getElementById('btn-save');
const btnCalendar = document.getElementById('btn-calendar');
const btnSettings = document.getElementById('btn-settings');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkServices();
  await loadStats();
  setupEventListeners();
});

// Check if Genie services are running
async function checkServices() {
  const services = [
    { url: 'http://localhost:4701/health', name: 'Genie' },
    { url: 'http://localhost:4709/health', name: 'Calendar' },
    { url: 'http://localhost:4876/health', name: 'Voice' }
  ];

  let onlineCount = 0;

  for (const service of services) {
    try {
      const response = await fetch(service.url, { timeout: 2000 });
      if (response.ok) {
        onlineCount++;
      }
    } catch (error) {
      // Service not available
    }
  }

  if (onlineCount === services.length) {
    statusDot.classList.remove('offline');
    statusText.textContent = `All services online (${onlineCount}/${services.length})`;
  } else if (onlineCount > 0) {
    statusDot.classList.remove('offline');
    statusText.textContent = `${onlineCount}/${services.length} services online`;
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Services offline - Demo mode';
  }
}

// Load stats from storage
async function loadStats() {
  const { memory } = await browser.storage.local.get('memory');

  if (memory) {
    pagesSaved.textContent = memory.pagesSaved || 0;
    contextsCount.textContent = (memory.contextHistory || []).length;
  }
}

// Setup event listeners
function setupEventListeners() {
  btnAsk.addEventListener('click', () => {
    openPanel();
  });

  btnSummarize.addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    browser.runtime.sendMessage({ type: 'SUMMARIZE_PAGE', tabId: tab.id });
    window.close();
  });

  btnSave.addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    browser.runtime.sendMessage({ type: 'SAVE_TO_MEMORY', tab });
    window.close();
  });

  btnCalendar.addEventListener('click', () => {
    openPanel();
  });

  btnSettings.addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
}

async function openPanel() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  browser.runtime.sendMessage({ type: 'TOGGLE_PANEL', tabId: tab.id, visible: true });
  window.close();
}
