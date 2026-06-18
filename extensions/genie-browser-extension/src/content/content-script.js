/**
 * Genie Browser Extension - Content Script
 * Injected into all web pages
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.genieInjected) return;
  window.genieInjected = true;

  console.log('[Genie] Content script loaded on:', window.location.href);

  // ==================== PANEL MANAGEMENT ====================

  let isPanelOpen = false;
  let panel = null;

  function createPanel() {
    if (panel) return;

    panel = document.createElement('div');
    panel.id = 'genie-panel';
    panel.className = 'genie-panel';
    panel.innerHTML = `
      <div class="genie-header">
        <div class="genie-logo">
          <span class="genie-icon">🧞</span>
          <span class="genie-title">Genie</span>
        </div>
        <div class="genie-controls">
          <button class="genie-btn minimize" title="Minimize">−</button>
          <button class="genie-btn close" title="Close">×</button>
        </div>
      </div>

      <div class="genie-context">
        <div class="context-item">
          <span class="context-icon">📅</span>
          <span class="context-text" id="genie-next-event">Loading...</span>
        </div>
        <div class="context-item">
          <span class="context-icon">💡</span>
          <span class="context-text" id="genie-context-hint">Ready to help</span>
        </div>
      </div>

      <div class="genie-messages" id="genie-messages">
        <div class="genie-message genie-message-bot">
          <div class="message-content">
            <p>👋 Hi! I'm Genie, your AI assistant.</p>
            <p>Ask me anything about this page or use these shortcuts:</p>
            <ul>
              <li><strong>Ctrl+Shift+G</strong> - Toggle Genie</li>
              <li><strong>Ctrl+Shift+K</strong> - Quick ask</li>
              <li><strong>Ctrl+Shift+P</strong> - Summarize page</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="genie-input-container">
        <div class="genie-voice-btn" id="genie-voice-btn" title="Voice input">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path fill="currentColor" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
        <input type="text" id="genie-input" placeholder="Ask Genie anything..." autocomplete="off">
        <button class="genie-send-btn" id="genie-send-btn" title="Send">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      <div class="genie-actions">
        <button class="genie-action-btn" id="genie-summarize-btn" title="Summarize page">
          <span class="action-icon">📝</span>
          <span class="action-text">Summarize</span>
        </button>
        <button class="genie-action-btn" id="genie-save-btn" title="Save to memory">
          <span class="action-icon">💾</span>
          <span class="action-text">Save</span>
        </button>
        <button class="genie-action-btn" id="genie-calendar-btn" title="View calendar">
          <span class="action-icon">📅</span>
          <span class="action-text">Calendar</span>
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    // Initialize event listeners
    initPanelEvents();
  }

  function initPanelEvents() {
    const minimizeBtn = panel.querySelector('.minimize');
    const closeBtn = panel.querySelector('.close');
    const sendBtn = document.getElementById('genie-send-btn');
    const input = document.getElementById('genie-input');
    const voiceBtn = document.getElementById('genie-voice-btn');
    const summarizeBtn = document.getElementById('genie-summarize-btn');
    const saveBtn = document.getElementById('genie-save-btn');
    const calendarBtn = document.getElementById('genie-calendar-btn');

    minimizeBtn.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);

    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(input.value);
    });

    voiceBtn.addEventListener('click', toggleVoiceInput);

    summarizeBtn.addEventListener('click', summarizePage);
    saveBtn.addEventListener('click', saveToMemory);
    calendarBtn.addEventListener('click', showCalendar);

    // Load initial context
    loadGenieContext();
  }

  function togglePanel() {
    isPanelOpen = !isPanelOpen;
    if (panel) {
      panel.classList.toggle('open', isPanelOpen);
    }

    browser.runtime.sendMessage({ type: 'TOGGLE_ASSISTANT' });
  }

  function closePanel() {
    isPanelOpen = false;
    if (panel) {
      panel.classList.remove('open');
    }
  }

  // ==================== MESSAGE HANDLING ====================

  function addMessage(content, isUser = false) {
    const messagesContainer = document.getElementById('genie-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `genie-message ${isUser ? 'genie-message-user' : 'genie-message-bot'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (typeof content === 'string') {
      contentDiv.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;
    } else {
      contentDiv.innerHTML = content;
    }

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;

    const input = document.getElementById('genie-input');
    if (input) input.value = '';

    // Add user message
    addMessage(text, true);

    // Get page context
    const pageContext = await getPageContext();

    // Send to background
    try {
      const response = await browser.runtime.sendMessage({
        type: 'ASK_GENIE',
        question: text,
        context: pageContext
      });

      if (response.error) {
        addMessage(`Error: ${response.error}`);
      } else {
        addMessage(response.answer || response.response);
      }
    } catch (error) {
      addMessage('Sorry, I encountered an error. Please try again.');
    }
  }

  // ==================== PAGE CONTEXT ====================

  async function getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      text: getPageText(),
      h1: document.querySelector('h1')?.textContent || '',
      description: document.querySelector('meta[name="description"]')?.content || '',
      selectedText: window.getSelection()?.toString() || ''
    };
  }

  function getPageText() {
    const clone = document.body.cloneNode(true);

    // Remove unwanted elements
    const unwanted = clone.querySelectorAll('script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar');
    unwanted.forEach(el => el.remove());

    return clone.textContent?.slice(0, 10000) || '';
  }

  // ==================== FEATURES ====================

  async function summarizePage() {
    addMessage('🔄 Generating summary...');

    try {
      const response = await browser.runtime.sendMessage({
        type: 'ASK_GENIE',
        question: `Summarize this page in 3-5 bullet points:`,
        context: await getPageContext()
      });

      addMessage(response.answer || response.response);
    } catch (error) {
      addMessage('Error generating summary.');
    }
  }

  async function saveToMemory() {
    addMessage('💾 Saving to memory...');

    try {
      const context = await getPageContext();

      await browser.runtime.sendMessage({
        type: 'SAVE_TO_MEMORY',
        content: context
      });

      addMessage('✅ Saved to your Genie memory!');
    } catch (error) {
      addMessage('Error saving to memory.');
    }
  }

  async function showCalendar() {
    addMessage('📅 Loading your calendar...');

    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_CALENDAR',
        userId: 'user-1',
        date: new Date().toISOString()
      });

      if (response.events && response.events.length > 0) {
        const eventsList = response.events
          .slice(0, 5)
          .map(e => `• ${e.title} - ${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
          .join('\n');

        addMessage(`<strong>Today's Events:</strong>\n${eventsList}`);
      } else {
        addMessage('📅 No events scheduled for today.');
      }
    } catch (error) {
      addMessage('📅 Could not load calendar. Make sure Genie Calendar service is running on port 4709.');
    }
  }

  async function loadGenieContext() {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_CONTEXT',
        userId: 'user-1'
      });

      if (response.nextEvent) {
        const eventEl = document.getElementById('genie-next-event');
        if (eventEl) {
          eventEl.textContent = `${response.nextEvent.title} in ${response.nextEvent.startsIn} min`;
        }
      }
    } catch (error) {
      console.log('[Genie] Context load failed:', error);
    }
  }

  // ==================== VOICE INPUT ====================

  let isListening = false;
  let recognition = null;

  function toggleVoiceInput() {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }

  function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage('🎤 Voice input not supported in this browser. Try Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      const voiceBtn = document.getElementById('genie-voice-btn');
      if (voiceBtn) voiceBtn.classList.add('listening');
      addMessage('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      const input = document.getElementById('genie-input');
      if (input) input.value = transcript;

      if (event.results[0].isFinal) {
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('[Genie] Voice error:', event.error);
      addMessage(`Voice error: ${event.error}`);
      stopVoiceInput();
    };

    recognition.onend = () => {
      stopVoiceInput();
    };

    recognition.start();
  }

  function stopVoiceInput() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }

    isListening = false;
    const voiceBtn = document.getElementById('genie-voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  }

  // ==================== MESSAGE LISTENER ====================

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'TOGGLE_PANEL':
        isPanelOpen = message.visible;
        if (!panel) createPanel();
        panel.classList.toggle('open', isPanelOpen);
        break;

      case 'SHOW_SUMMARY':
        addMessage(`<strong>Summary of "${message.title}":</strong>\n\n${message.summary}`);
        break;

      case 'OPEN_ASK':
        if (!panel) createPanel();
        isPanelOpen = true;
        panel.classList.add('open');
        const input = document.getElementById('genie-input');
        if (input) {
          input.focus();
        }
        break;

      case 'EXTRACT_INFO':
        addMessage(`Extracting: "${message.text}"`);
        break;

      case 'GET_CONTENT':
        return Promise.resolve({
          url: window.location.href,
          title: document.title,
          text: getPageText()
        });
    }
  });

  // ==================== KEYBOARD SHORTCUTS ====================

  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + G = Toggle panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      if (!panel) createPanel();
      togglePanel();
    }

    // Ctrl/Cmd + Shift + K = Quick ask
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      if (!panel) createPanel();
      isPanelOpen = true;
      panel.classList.add('open');
      const input = document.getElementById('genie-input');
      if (input) {
        input.focus();
        input.value = '';
      }
    }

    // Escape = Close panel
    if (e.key === 'Escape' && isPanelOpen) {
      closePanel();
    }
  });

  // ==================== INITIALIZATION ====================

  // Create floating button
  function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'genie-fab';
    button.className = 'genie-fab';
    button.innerHTML = '🧞';
    button.title = 'Genie AI Assistant (Ctrl+Shift+G)';

    button.addEventListener('click', () => {
      if (!panel) createPanel();
      togglePanel();
    });

    document.body.appendChild(button);
  }

  // Initialize
  createFloatingButton();

  // Listen for commands from background
  console.log('[Genie] Ready');

})();
