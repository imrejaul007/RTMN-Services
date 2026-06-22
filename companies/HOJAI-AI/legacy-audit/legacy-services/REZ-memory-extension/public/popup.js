// REZ Memory Extension - Popup Script

const API_BASE = 'http://localhost:4210';
let userId = '';

// Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const savePageBtn = document.getElementById('savePage');
const saveSelectionBtn = document.getElementById('saveSelection');
const openDashboardBtn = document.getElementById('openDashboard');
const userIdInput = document.getElementById('userId');
const recentSection = document.getElementById('recentSection');
const recentList = document.getElementById('recentList');
const toast = document.getElementById('toast');

// Initialize
async function init() {
  // Load saved user ID
  const result = await chrome.storage.local.get(['userId', 'recentSaves']);
  userId = result.userId || '';
  userIdInput.value = userId;

  // Check connection
  await checkConnection();

  // Display recent saves
  if (result.recentSaves?.length > 0) {
    displayRecentSaves(result.recentSaves);
  }
}

// Check API connection
async function checkConnection() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      mode: 'no-cors'
    });
    statusDot.classList.remove('offline');
    statusText.textContent = 'Connected to REZ Memory Cloud';
    return true;
  } catch (error) {
    statusDot.classList.add('offline');
    statusText.textContent = 'Offline - saves queued locally';
    return false;
  }
}

// Save page to memory
async function savePage() {
  if (!userIdInput.value) {
    showToast('Please enter your User ID', true);
    return;
  }

  savePageBtn.disabled = true;
  savePageBtn.textContent = '⏳ Saving...';

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to get page content
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });

    if (!response) {
      throw new Error('Could not extract page content');
    }

    // Save to API
    const result = await saveToMemory({
      userId: userIdInput.value,
      content: response.content,
      summary: response.title,
      category: 'article',
      source: 'extension',
      context: `Source: ${response.url}`,
      metadata: {
        url: response.url,
        title: response.title,
        description: response.description,
        author: response.author,
      },
    });

    if (result.success) {
      showToast('Page saved to memory!');
      await addToRecentSaves({ title: response.title, url: response.url, time: Date.now() });
    } else {
      throw new Error(result.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save page', true);
  } finally {
    savePageBtn.disabled = false;
    savePageBtn.textContent = '💾 Save This Page';
  }
}

// Save selection to memory
async function saveSelection() {
  if (!userIdInput.value) {
    showToast('Please enter your User ID', true);
    return;
  }

  saveSelectionBtn.disabled = true;
  saveSelectionBtn.textContent = '⏳ Saving...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Get selected text from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });

    if (!response || !response.selection) {
      showToast('No text selected', true);
      return;
    }

    const result = await saveToMemory({
      userId: userIdInput.value,
      content: response.selection,
      summary: response.selection.slice(0, 100) + (response.selection.length > 100 ? '...' : ''),
      category: 'fact',
      source: 'extension',
      context: `From: ${tab.title}`,
      metadata: {
        url: tab.url,
        tabTitle: tab.title,
      },
    });

    if (result.success) {
      showToast('Selection saved!');
    } else {
      throw new Error(result.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save selection', true);
  } finally {
    saveSelectionBtn.disabled = false;
    saveSelectionBtn.textContent = '✨ Save Selection';
  }
}

// Open dashboard
function openDashboard() {
  chrome.tabs.create({ url: 'https://app.rez.money/memory' });
}

// Save to REZ Memory Cloud API
async function saveToMemory(data) {
  try {
    const response = await fetch(`${API_BASE}/api/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Save user ID
    await chrome.storage.local.set({ userId: userIdInput.value });

    return { success: true };
  } catch (error) {
    // Queue for later if offline
    const queued = await chrome.storage.local.get(['queuedSaves']);
    const saves = queued.queuedSaves || [];
    saves.push({ ...data, queuedAt: Date.now() });
    await chrome.storage.local.set({ queuedSaves: saves });

    return { success: true, queued: true };
  }
}

// Recent saves
async function addToRecentSaves(item) {
  const result = await chrome.storage.local.get(['recentSaves']);
  let saves = result.recentSaves || [];
  saves.unshift(item);
  saves = saves.slice(0, 5); // Keep only 5 recent
  await chrome.storage.local.set({ recentSaves: saves });
  displayRecentSaves(saves);
}

function displayRecentSaves(saves) {
  recentSection.style.display = 'block';
  recentList.innerHTML = saves.map(save => `
    <div class="memory-item">
      <div class="title">${escapeHtml(save.title)}</div>
      <div class="meta">${formatTime(save.time)}</div>
    </div>
  `).join('');
}

// Utilities
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Event listeners
savePageBtn.addEventListener('click', savePage);
saveSelectionBtn.addEventListener('click', saveSelection);
openDashboardBtn.addEventListener('click', openDashboard);
userIdInput.addEventListener('change', async () => {
  await chrome.storage.local.set({ userId: userIdInput.value });
  userId = userIdInput.value;
});

// Initialize on load
init();
