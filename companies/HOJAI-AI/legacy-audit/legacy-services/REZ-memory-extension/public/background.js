/**
 * REZ Memory Extension - Background Service Worker
 * Handles API calls, offline queueing, and badge updates
 */

// Configuration
const CONFIG = {
    apiBaseUrl: 'http://localhost:4210/api',
    queueKey: 'rez_memory_queue',
    maxRetries: 3,
    retryDelay: 5000,
    batchInterval: 30000, // 30 seconds
};

// State
let isOnline = navigator.onLine;
let queue = [];
let syncTimer = null;

/**
 * Initialize extension
 */
async function initialize() {
    console.log('REZ Memory Extension initializing...');

    // Load queue from storage
    await loadQueue();

    // Set up online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start periodic sync
    startPeriodicSync();

    // Update badge based on queue
    updateBadge();

    console.log('REZ Memory Extension ready');
}

/**
 * Load queue from chrome.storage
 */
async function loadQueue() {
    const result = await chrome.storage.local.get(CONFIG.queueKey);
    queue = result[CONFIG.queueKey] || [];
    console.log(`Loaded ${queue.length} queued items`);
}

/**
 * Save queue to chrome.storage
 */
async function saveQueue() {
    await chrome.storage.local.set({ [CONFIG.queueKey]: queue });
}

/**
 * Handle coming online
 */
async function handleOnline() {
    console.log('Connection restored, syncing queue...');
    isOnline = true;
    await syncQueue();
}

/**
 * Handle going offline
 */
function handleOffline() {
    console.log('Connection lost, queuing items locally');
    isOnline = false;
    updateBadge();
}

/**
 * Start periodic sync
 */
function startPeriodicSync() {
    if (syncTimer) {
        clearInterval(syncTimer);
    }
    syncTimer = setInterval(syncQueue, CONFIG.batchInterval);
}

/**
 * Sync queue with server
 */
async function syncQueue() {
    if (!isOnline || queue.length === 0) return;

    console.log(`Syncing ${queue.length} queued items...`);

    const failedItems = [];

    for (const item of queue) {
        try {
            const result = await sendToServer(item);
            if (result.success) {
                console.log(`Synced item: ${item.type}`);
            } else {
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount < CONFIG.maxRetries) {
                    failedItems.push(item);
                } else {
                    console.warn(`Dropping item after ${CONFIG.maxRetries} retries:`, item);
                }
            }
        } catch (error) {
            console.error('Sync error:', error);
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount < CONFIG.maxRetries) {
                failedItems.push(item);
            }
        }
    }

    queue = failedItems;
    await saveQueue();
    updateBadge();
}

/**
 * Send item to server
 */
async function sendToServer(item) {
    const endpoints = {
        remember: '/memories',
        page: '/memories',
        highlight: '/memories',
        link: '/links',
    };

    const endpoint = endpoints[item.type] || '/memories';
    const url = `${CONFIG.apiBaseUrl}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${error}` };
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Add item to queue
 */
async function queueItem(type, data) {
    const item = {
        id: generateId(),
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
    };

    queue.push(item);
    await saveQueue();
    updateBadge();

    // Try to sync immediately if online
    if (isOnline) {
        syncQueue();
    }

    return item;
}

/**
 * Update extension badge
 */
function updateBadge() {
    if (queue.length > 0) {
        chrome.action.setBadgeText({ text: String(queue.length) });
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' }); // Amber
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

/**
 * Generate unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Save memory directly
 */
async function saveMemory(userId, memoryData) {
    if (isOnline) {
        const result = await sendToServer({ type: 'remember', data: { ...memoryData, userId } });
        if (result.success) {
            return { success: true, data: result.data };
        }
    }

    // Queue for later
    await queueItem('remember', { ...memoryData, userId });
    return { success: true, queued: true };
}

/**
 * Save page snapshot
 */
async function savePage(userId, pageData) {
    if (isOnline) {
        const result = await sendToServer({ type: 'page', data: { ...pageData, userId } });
        if (result.success) {
            return { success: true, data: result.data };
        }
    }

    await queueItem('page', { ...pageData, userId });
    return { success: true, queued: true };
}

/**
 * Save highlight
 */
async function saveHighlight(userId, highlightData) {
    if (isOnline) {
        const result = await sendToServer({ type: 'highlight', data: { ...highlightData, userId } });
        if (result.success) {
            return { success: true, data: result.data };
        }
    }

    await queueItem('highlight', { ...highlightData, userId });
    return { success: true, queued: true };
}

/**
 * Search memories
 */
async function searchMemories(userId, query) {
    if (!isOnline) {
        return { success: false, error: 'Offline', results: [] };
    }

    try {
        const response = await fetch(
            `${CONFIG.apiBaseUrl}/search?q=${encodeURIComponent(query)}&userId=${encodeURIComponent(userId)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const results = await response.json();
        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message, results: [] };
    }
}

/**
 * Get queue status
 */
async function getQueueStatus() {
    return {
        length: queue.length,
        isOnline,
        items: queue.map(item => ({
            type: item.type,
            timestamp: item.timestamp,
            retryCount: item.retryCount,
        })),
    };
}

/**
 * Clear queue
 */
async function clearQueue() {
    queue = [];
    await saveQueue();
    updateBadge();
    return { success: true };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleRequest = async () => {
        switch (request.action) {
            case 'saveMemory':
                return await saveMemory(request.userId, request.data);

            case 'savePage':
                return await savePage(request.userId, request.data);

            case 'saveHighlight':
                return await saveHighlight(request.userId, request.data);

            case 'searchMemories':
                return await searchMemories(request.userId, request.query);

            case 'getQueueStatus':
                return await getQueueStatus();

            case 'clearQueue':
                return await clearQueue();

            case 'extractPage':
                // Extract page content from active tab
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0) {
                    return new Promise((resolve) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractContent' }, (response) => {
                            resolve(response || { success: false, error: 'No response from content script' });
                        });
                    });
                }
                return { success: false, error: 'No active tab' };

            case 'getQueueStatus':
                return await getQueueStatus();

            default:
                return { success: false, error: 'Unknown action' };
        }
    };

    handleRequest().then(sendResponse);
    return true; // Keep channel open for async response
});

// Initialize on install/update
chrome.runtime.onInstalled.addListener(initialize);

// Initialize on startup
initialize();
