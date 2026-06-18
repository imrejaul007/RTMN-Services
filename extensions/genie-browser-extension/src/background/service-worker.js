/**
 * Genie Browser Extension - Background Service Worker
 * Handles: Context menus, alarms, message routing, API calls
 */

// Service URLs
const GENIE_API = 'http://localhost:4701'; // Genie Gateway
const MEMORY_OS = 'http://localhost:4703'; // Memory OS
const VOICE_TWIN = 'http://localhost:4876'; // Voice Twin
const CALENDAR_SERVICE = 'http://localhost:4709'; // Calendar Service

// State
let isAssistantVisible = false;
let currentTabId = null;

// ==================== INITIALIZATION ====================

browser.runtime.onInstalled.addListener(async (details) => {
  console.log('[Genie] Extension installed:', details.reason);

  // Create context menus
  await browser.contextMenus.create({
    id: 'genie-ask',
    title: 'Ask Genie about this page',
    contexts: ['page']
  });

  await browser.contextMenus.create({
    id: 'genie-summarize',
    title: 'Summarize this page',
    contexts: ['page']
  });

  await browser.contextMenus.create({
    id: 'genie-save-to-memory',
    title: 'Save to Genie Memory',
    contexts: ['page', 'selection']
  });

  await browser.contextMenus.create({
    id: 'genie-extract-info',
    title: 'Extract information',
    contexts: ['selection']
  });

  // Set default settings
  await browser.storage.local.set({
    settings: {
      wakeWordEnabled: false,
      autoSummarize: false,
      darkMode: false,
      voiceInput: true,
      shortcutsEnabled: true
    },
    memory: {
      lastSync: null,
      pagesSaved: 0,
      contextHistory: []
    }
  });
});

// ==================== CONTEXT MENUS ====================

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[Genie] Context menu clicked:', info.menuItemId);

  switch (info.menuItemId) {
    case 'genie-ask':
      sendToContent(tab.id, { type: 'OPEN_ASK' });
      break;

    case 'genie-summarize':
      await summarizePage(tab.id);
      break;

    case 'genie-save-to-memory':
      await saveToMemory(tab, info.selectionText);
      break;

    case 'genie-extract-info':
      sendToContent(tab.id, { type: 'EXTRACT_INFO', text: info.selectionText });
      break;
  }
});

// ==================== MESSAGE HANDLING ====================

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('[Genie] Message received:', message.type);

  try {
    switch (message.type) {
      case 'GET_PAGE_CONTENT':
        const content = await getPageContent(sender.tab);
        sendResponse(content);
        break;

      case 'ASK_GENIE':
        const response = await askGenie(message.question, message.context);
        sendResponse(response);
        break;

      case 'SAVE_TO_MEMORY':
        await saveToMemory(sender.tab, message.content);
        sendResponse({ success: true });
        break;

      case 'GET_CONTEXT':
        const context = await getGenieContext(message.userId);
        sendResponse(context);
        break;

      case 'CHECK_WAKE_WORD':
        const wakeWordDetected = await checkWakeWord(message.audio);
        sendResponse({ detected: wakeWordDetected });
        break;

      case 'GET_CALENDAR':
        const calendar = await getCalendarEvents(message.userId, message.date);
        sendResponse(calendar);
        break;

      case 'ADD_CALENDAR_EVENT':
        const event = await addCalendarEvent(message.event);
        sendResponse(event);
        break;

      case 'TOGGLE_ASSISTANT':
        isAssistantVisible = !isAssistantVisible;
        sendToContent(sender.tab?.id, { type: 'TOGGLE_PANEL', visible: isAssistantVisible });
        sendResponse({ visible: isAssistantVisible });
        break;

      case 'VOICE_INPUT':
        const transcription = await transcribeAudio(message.audio);
        sendResponse({ transcript: transcription });
        break;

      case 'TEXT_TO_SPEECH':
        await speakText(message.text, message.voice);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('[Genie] Error handling message:', error);
    sendResponse({ error: error.message });
  }

  return true; // Keep message channel open for async response
});

// ==================== TAB EVENTS ====================

browser.tabs.onActivated.addListener(async (activeInfo) => {
  currentTabId = activeInfo.tabId;
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Track page visit
    trackPageVisit(tab);
  }
});

// ==================== COMMAND HANDLING ====================

browser.commands.onCommand.addListener(async (command, tab) => {
  console.log('[Genie] Command:', command);

  switch (command) {
    case 'toggle-genie':
      isAssistantVisible = !isAssistantVisible;
      sendToContent(tab.id, { type: 'TOGGLE_PANEL', visible: isAssistantVisible });
      break;

    case 'quick-ask':
      sendToContent(tab.id, { type: 'OPEN_QUICK_ASK' });
      break;

    case 'capture-page':
      await summarizePage(tab.id);
      break;
  }
});

// ==================== ALARM HANDLING ====================

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'reminder') {
    const { reminder } = await browser.storage.local.get('reminder');
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/shared/icons/icon128.png',
      title: 'Genie Reminder',
      message: reminder.message || 'You have a reminder!'
    });
  }
});

// ==================== API FUNCTIONS ====================

async function getPageContent(tab) {
  try {
    const result = await browser.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' });
    return result;
  } catch (error) {
    console.error('[Genie] Error getting page content:', error);
    return { error: error.message };
  }
}

async function askGenie(question, context) {
  try {
    const response = await fetch(`${GENIE_API}/api/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      },
      body: JSON.stringify({
        question,
        context: context || {},
        source: 'browser_extension'
      })
    });

    if (!response.ok) {
      throw new Error(`Genie API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Genie] Error asking Genie:', error);
    // Return mock response for demo
    return {
      answer: `You asked: "${question}". This is a demo response. Configure GENIE_API to enable full functionality.`,
      sources: [],
      confidence: 0.5
    };
  }
}

async function summarizePage(tabId) {
  try {
    // Get page content
    const content = await getPageContent({ id: tabId });

    if (content.error) {
      throw new Error(content.error);
    }

    // Send to Genie for summarization
    const summary = await askGenie(`Summarize this page: ${content.title}\n\n${content.text?.slice(0, 5000)}`, {
      type: 'page_summary',
      url: content.url,
      title: content.title
    });

    // Show notification
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/shared/icons/icon128.png',
      title: 'Page Summarized',
      message: summary.answer?.slice(0, 100) + '...'
    });

    // Send to panel
    sendToContent(tabId, {
      type: 'SHOW_SUMMARY',
      summary: summary.answer,
      title: content.title
    });

    return summary;
  } catch (error) {
    console.error('[Genie] Error summarizing page:', error);
    return { error: error.message };
  }
}

async function saveToMemory(tab, selection) {
  try {
    const content = selection || await getPageContent(tab);

    const memory = {
      id: `mem-${Date.now()}`,
      type: 'web_page',
      title: tab.title || content.title,
      url: tab.url || content.url,
      content: selection || content.text?.slice(0, 10000),
      screenshot: content.screenshot,
      tags: await extractTags(content),
      createdAt: new Date().toISOString(),
      source: 'browser_extension'
    };

    // Save to MemoryOS
    await fetch(`${MEMORY_OS}/api/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      },
      body: JSON.stringify(memory)
    });

    // Update stats
    const { memory: memStats } = await browser.storage.local.get('memory');
    memStats.pagesSaved = (memStats.pagesSaved || 0) + 1;
    memStats.lastSync = new Date().toISOString();
    await browser.storage.local.set({ memory: memStats });

    // Show notification
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'src/shared/icons/icon128.png',
      title: 'Saved to Genie',
      message: `"${tab.title?.slice(0, 50)}..." saved to memory`
    });

    return { success: true };
  } catch (error) {
    console.error('[Genie] Error saving to memory:', error);
    return { error: error.message };
  }
}

async function extractTags(content) {
  // Simple tag extraction - in production, use NLP
  const text = (content.title + ' ' + content.text).toLowerCase();
  const keywords = ['meeting', 'calendar', 'email', 'document', 'project', 'task', 'customer', 'sales', 'marketing', 'product'];

  return keywords.filter(k => text.includes(k));
}

async function getGenieContext(userId) {
  try {
    const response = await fetch(`${GENIE_API}/api/context/${userId}`, {
      headers: {
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      }
    });

    if (!response.ok) {
      throw new Error(`Genie API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Genie] Error getting context:', error);
    // Return mock context
    return {
      nextEvent: { title: 'Team Standup', startsIn: 30 },
      todayTasks: 5,
      lastActivity: new Date().toISOString()
    };
  }
}

async function checkWakeWord(audio) {
  // In production, send to wake word service
  // For demo, return false
  return false;
}

async function getCalendarEvents(userId, date) {
  try {
    const response = await fetch(`${CALENDAR_SERVICE}/api/events/today?userId=${userId || 'user-1'}`, {
      headers: {
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      }
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Genie] Error getting calendar:', error);
    return { events: [], error: error.message };
  }
}

async function addCalendarEvent(event) {
  try {
    const response = await fetch(`${CALENDAR_SERVICE}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Genie] Error adding calendar event:', error);
    return { error: error.message };
  }
}

async function transcribeAudio(audioData) {
  try {
    const response = await fetch(`${VOICE_TWIN}/api/stt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': process.env.INTERNAL_TOKEN || 'dev-internal-token'
      },
      body: JSON.stringify({ audio: audioData })
    });

    if (!response.ok) {
      throw new Error(`STT API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('[Genie] Error transcribing audio:', error);
    return '';
  }
}

async function speakText(text, voice) {
  // In production, use TTS service
  console.log('[Genie] TTS:', text);
}

// ==================== UTILITY FUNCTIONS ====================

async function sendToContent(tabId, message) {
  if (!tabId) return;

  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('[Genie] Error sending to content:', error);
  }
}

async function trackPageVisit(tab) {
  // Track page visit in memory
  const { memory } = await browser.storage.local.get('memory');
  memory.contextHistory = memory.contextHistory || [];

  memory.contextHistory.push({
    url: tab.url,
    title: tab.title,
    visitedAt: new Date().toISOString()
  });

  // Keep last 100 visits
  if (memory.contextHistory.length > 100) {
    memory.contextHistory = memory.contextHistory.slice(-100);
  }

  await browser.storage.local.set({ memory });
}

// ==================== PUSH NOTIFICATIONS ====================

async function handlePushNotification(notification) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'src/shared/icons/icon128.png',
    title: notification.title || 'Genie',
    message: notification.body || notification.message
  });
}

console.log('[Genie] Background service worker loaded');
