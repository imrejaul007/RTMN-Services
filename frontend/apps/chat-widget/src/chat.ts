import type {
  ChatMessage,
  ChatSession,
  Agent,
  Attachment,
  ChatConfig,
  ChatWidgetEvents,
  TypingIndicator,
  EventCallback
} from './types';
import { ChatAPI } from './api';

export class ChatWidget {
  private config: ChatConfig;
  private api: ChatAPI;
  private container: HTMLElement;
  private widget: HTMLElement | null = null;
  private launcher: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputArea: HTMLElement | null = null;
  private session: ChatSession | null = null;
  private messages: ChatMessage[] = [];
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isTyping = false;
  private typingSender: 'bot' | 'agent' = 'bot';
  private typingSenderName: string = '';
  private fileInput: HTMLInputElement | null = null;
  private pendingFiles: File[] = [];
  private events: Map<string, Set<EventCallback>> = new Map();
  private isOpen = false;
  private unreadCount = 0;

  constructor(config: ChatConfig) {
    this.config = {
      position: 'bottom-right',
      theme: {},
      AgentTransfer: { enabled: true },
      AIResponses: { enabled: true },
      fileUpload: { enabled: true },
      ...config
    };

    this.api = new ChatAPI(this.config);
    this.container = document.createElement('div');
    this.container.id = `rtmn-chat-${Date.now()}`;
    this.container.className = 'rtmn-chat-widget';
    document.body.appendChild(this.container);

    this.applyTheme();
    this.render();
    this.bindEvents();
    this.connectWebSocket();
    this.initSession();
    this.emit('ready');
  }

  private applyTheme(): void {
    const theme = this.config.theme || {};
    if (theme.primaryColor) {
      this.container.style.setProperty('--cw-primary', theme.primaryColor);
    }
    if (theme.backgroundColor) {
      this.container.style.setProperty('--cw-bg', theme.backgroundColor);
    }
    if (theme.fontColor) {
      this.container.style.setProperty('--cw-text', theme.fontColor);
    }
    if (theme.launcherColor) {
      this.container.style.setProperty('--cw-launcher', theme.launcherColor);
    }
    if (theme.borderRadius !== undefined) {
      this.container.style.setProperty('--cw-radius', `${theme.borderRadius}px`);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      ${this.renderLauncher()}
      ${this.renderWindow()}
    `;

    this.launcher = this.container.querySelector('.rtmn-chat-launcher');
    this.widget = this.container.querySelector('.rtmn-chat-window');
    this.messagesContainer = this.container.querySelector('.rtmn-chat-messages');
    this.inputArea = this.container.querySelector('.rtmn-chat-input-area');
  }

  private renderLauncher(): string {
    const position = this.config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    return `
      <button class="rtmn-chat-launcher ${position}" aria-label="Open chat">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/>
        </svg>
        ${this.unreadCount > 0 ? `<span class="notification-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</span>` : ''}
      </button>
    `;
  }

  private renderWindow(): string {
    const position = this.config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
    const greeting = this.config.greeting || 'Hello! How can we help you today?';
    const placeholder = this.config.AIResponses?.placeholder || 'Type a message...';
    const showTransfer = this.config.AgentTransfer?.enabled;

    return `
      <div class="rtmn-chat-window ${position}">
        ${this.renderHeader()}
        <div class="rtmn-chat-messages">
          <div class="rtmn-chat-message system">
            <div class="rtmn-chat-message-content">
              <div class="rtmn-chat-message-bubble">${greeting}</div>
            </div>
          </div>
        </div>
        ${showTransfer ? `
          <div class="rtmn-chat-transfer-banner" style="display: none;">
            <div class="rtmn-chat-transfer-info">
              <span class="dot"></span>
              <span class="queue-text">Waiting for agent...</span>
            </div>
            <button class="rtmn-chat-transfer-btn">Connect Now</button>
          </div>
        ` : ''}
        <div class="rtmn-chat-input-area">
          <div class="rtmn-chat-input-actions">
            ${this.config.fileUpload?.enabled !== false ? `
              <button class="rtmn-chat-input-btn" aria-label="Attach file" data-action="attach">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                </svg>
              </button>
            ` : ''}
            <button class="rtmn-chat-input-btn" aria-label="Transfer to agent" data-action="transfer">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
          </div>
          <div class="rtmn-chat-input-wrapper">
            <textarea class="rtmn-chat-input" placeholder="${placeholder}" rows="1"></textarea>
          </div>
          <button class="rtmn-chat-send-btn" aria-label="Send message" disabled>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <input type="file" class="rtmn-chat-file-input" style="display: none;" accept="${this.getAllowedFileTypes()}" multiple>
      </div>
    `;
  }

  private renderHeader(): string {
    const status = this.session?.agent ? 'online' : 'online';
    const agentName = this.session?.agent?.name || this.config.AIResponses?.botName || 'RTMN Support';
    const agentAvatar = this.session?.agent?.avatar || this.config.AIResponses?.botAvatar || '';

    return `
      <div class="rtmn-chat-header">
        <div class="rtmn-chat-header-info">
          <h3 class="rtmn-chat-header-title">${agentName}</h3>
          <div class="rtmn-chat-header-status">
            <span class="dot ${status === 'online' ? '' : status}"></span>
            <span>${this.session?.agent ? 'Online with ' + this.session.agent.name : 'Online'}</span>
          </div>
        </div>
        <div class="rtmn-chat-header-avatar">
          ${agentAvatar ? `<img src="${agentAvatar}" alt="${agentName}">` : agentName.charAt(0)}
        </div>
        <div class="rtmn-chat-header-actions">
          <button class="rtmn-chat-header-btn" aria-label="End chat" data-action="end">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2m6.01-4.52l-1.41-1.41-1.42 1.41L18.68 13l-1.42 1.41 1.41 1.42 1.42-1.41L18.68 16l1.42-1.41-1.41-1.42z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private getAllowedFileTypes(): string {
    const types = this.config.fileUpload?.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'application/pdf'
    ];
    return types.join(',');
  }

  private bindEvents(): void {
    if (!this.launcher || !this.widget) return;

    this.launcher.addEventListener('click', () => this.toggle());

    this.widget.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');

      switch (action) {
        case 'send':
          this.sendMessage();
          break;
        case 'attach':
          this.triggerFileUpload();
          break;
        case 'transfer':
          this.requestAgentTransfer();
          break;
        case 'end':
          this.endChat();
          break;
      }
    });

    const input = this.widget.querySelector('.rtmn-chat-input') as HTMLTextAreaElement;
    const sendBtn = this.widget.querySelector('.rtmn-chat-send-btn') as HTMLButtonElement;

    input?.addEventListener('input', () => {
      this.autoResize(input);
      sendBtn.disabled = !input.value.trim() && this.pendingFiles.length === 0;
      this.sendTypingIndicator(input.value.length > 0);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendBtn?.addEventListener('click', () => this.sendMessage());

    const transferBtn = this.widget.querySelector('.rtmn-chat-transfer-btn');
    transferBtn?.addEventListener('click', () => this.requestAgentTransfer());

    this.fileInput = this.widget.querySelector('.rtmn-chat-file-input') as HTMLInputElement;
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
  }

  private autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.widget?.classList.add('open');
      this.launcher?.classList.add('open');
      this.unreadCount = 0;
      this.updateLauncherBadge();
      this.emit('open');
      this.scrollToBottom();
    } else {
      this.widget?.classList.remove('open');
      this.launcher?.classList.remove('open');
      this.emit('close');
    }
  }

  private open(): void {
    if (!this.isOpen) this.toggle();
  }

  private close(): void {
    if (this.isOpen) this.toggle();
  }

  private async initSession(): Promise<void> {
    try {
      this.session = await this.api.createSession();
      this.emit('session:started', this.session);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      this.emit('error', { code: 'SESSION_INIT', message: 'Failed to start chat session' });
    }
  }

  private async connectWebSocket(): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.apiUrl.replace('http', 'ws').replace('https', 'wss');

    try {
      this.ws = new WebSocket(`${wsUrl}/ws/sessions/${this.session?.id || 'pending'}`);

      this.ws.onopen = () => {
        this.wsReconnectAttempts = 0;
        if (this.session) {
          this.ws?.send(JSON.stringify({ type: 'session_joined', payload: { sessionId: this.session.id } }));
        }
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this.emit('error', { code: 'WS_ERROR', message: 'WebSocket connection error' });
      };
    } catch {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      setTimeout(() => this.connectWebSocket(), this.reconnectDelay * this.wsReconnectAttempts);
    }
  }

  private handleWebSocketMessage(message: { type: string; payload: unknown }): void {
    switch (message.type) {
      case 'message':
        this.handleIncomingMessage(message.payload as ChatMessage);
        break;
      case 'typing':
        this.handleTypingIndicator(message.payload as TypingIndicator);
        break;
      case 'agent_joined':
        this.handleAgentJoined(message.payload as Agent);
        break;
      case 'agent_left':
        this.handleAgentLeft(message.payload as Agent);
        break;
      case 'session_update':
        this.session = message.payload as ChatSession;
        this.updateHeader();
        break;
      case 'pong':
        break;
    }
  }

  private handleIncomingMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.renderMessage(message);
    this.emit('message:receive', message);

    if (!this.isOpen) {
      this.unreadCount++;
      this.updateLauncherBadge();
    }

    this.scrollToBottom();
    this.stopTypingIndicator();

    if (message.type === 'bot' || message.type === 'agent') {
      this.api.markAsRead(this.session!.id, message.id).catch(() => {});
    }
  }

  private handleTypingIndicator(indicator: TypingIndicator): void {
    if (indicator.isTyping) {
      this.startTypingIndicator(indicator.sender, indicator.senderName);
      this.emit('typing:start', indicator);
    } else {
      this.stopTypingIndicator();
      this.emit('typing:stop');
    }
  }

  private handleAgentJoined(agent: Agent): void {
    this.session = { ...this.session!, agent, status: 'active' };
    this.hideTransferBanner();
    this.updateHeader();
    this.emit('agent:joined', agent);

    this.addSystemMessage(`${agent.name} has joined the chat`);
  }

  private handleAgentLeft(agent: Agent): void {
    this.session = { ...this.session!, agent: undefined, status: 'active' };
    this.updateHeader();
    this.emit('agent:left', agent);

    this.addSystemMessage(`${agent.name} has left the chat`);
  }

  private renderMessage(message: ChatMessage): void {
    if (!this.messagesContainer) return;

    const avatar = this.getMessageAvatar(message);
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusIcon = this.getStatusIcon(message.status);

    const messageEl = document.createElement('div');
    messageEl.className = `rtmn-chat-message ${message.type}`;
    messageEl.dataset.id = message.id;

    let attachmentsHtml = '';
    if (message.attachments?.length) {
      attachmentsHtml = message.attachments.map(att => this.renderAttachment(att)).join('');
    }

    messageEl.innerHTML = `
      <div class="rtmn-chat-message-avatar">${avatar}</div>
      <div class="rtmn-chat-message-content">
        <div class="rtmn-chat-message-bubble">${this.escapeHtml(message.content)}${attachmentsHtml}</div>
        <div class="rtmn-chat-message-meta">
          <span>${time}</span>
          ${message.type === 'user' ? `<span class="rtmn-chat-message-status">${statusIcon}</span>` : ''}
        </div>
      </div>
    `;

    this.messagesContainer.appendChild(messageEl);
  }

  private getMessageAvatar(message: ChatMessage): string {
    if (message.type === 'user') {
      return 'U';
    }

    if (message.type === 'agent' && this.session?.agent) {
      return this.session.agent.avatar
        ? `<img src="${this.session.agent.avatar}" alt="${this.session.agent.name}">`
        : this.session.agent.name.charAt(0);
    }

    const botName = this.config.AIResponses?.botName || 'Bot';
    const botAvatar = this.config.AIResponses?.botAvatar;

    return botAvatar
      ? `<img src="${botAvatar}" alt="${botName}">`
      : botName.charAt(0);
  }

  private getStatusIcon(status?: string): string {
    switch (status) {
      case 'sending':
        return '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><circle cx="12" cy="12" r="10"/></svg>';
      case 'sent':
        return '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      case 'delivered':
        return '<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18 7l-8 8-4-4 8-8 4 4zm0 10l-8-8 1.41-1.41L18 15.17l10.59-10.58L30.17 6 18 18z"/></svg>';
      case 'read':
        return '<svg viewBox="0 0 24 24" fill="#0066ff" width="14" height="14"><path d="M18 7l-8 8-4-4 8-8 4 4zm0 10l-8-8 1.41-1.41L18 15.17l10.59-10.58L30.17 6 18 18z"/></svg>';
      default:
        return '';
    }
  }

  private renderAttachment(attachment: Attachment): string {
    const size = this.formatFileSize(attachment.size);

    if (attachment.type === 'image') {
      return `
        <div class="rtmn-chat-attachment">
          <div class="rtmn-chat-attachment-icon">
            <img src="${attachment.url}" alt="${attachment.name}">
          </div>
          <div class="rtmn-chat-attachment-info">
            <div class="rtmn-chat-attachment-name">${attachment.name}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="rtmn-chat-attachment">
        <div class="rtmn-chat-attachment-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </div>
        <div class="rtmn-chat-attachment-info">
          <div class="rtmn-chat-attachment-name">${attachment.name}</div>
          <div class="rtmn-chat-attachment-size">${size}</div>
        </div>
        <button class="rtmn-chat-attachment-download" data-url="${attachment.url}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </button>
      </div>
    `;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: `sys-${Date.now()}`,
      type: 'system',
      content,
      timestamp: Date.now()
    };
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  private startTypingIndicator(sender: 'bot' | 'agent' = 'bot', senderName?: string): void {
    if (this.isTyping) return;
    this.isTyping = true;
    this.typingSender = sender;
    this.typingSenderName = senderName || '';

    if (!this.messagesContainer) return;

    const indicator = document.createElement('div');
    indicator.className = 'rtmn-chat-typing';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <div class="rtmn-chat-message-avatar">${senderName?.charAt(0) || (sender === 'bot' ? 'B' : 'A')}</div>
      <div class="rtmn-chat-typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  private stopTypingIndicator(): void {
    this.isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    indicator?.remove();
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  private updateLauncherBadge(): void {
    if (!this.launcher) return;
    const badge = this.launcher.querySelector('.notification-badge');

    if (this.unreadCount > 0) {
      if (badge) {
        badge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
      } else {
        this.launcher.insertAdjacentHTML('beforeend',
          `<span class="notification-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</span>`
        );
      }
    } else if (badge) {
      badge.remove();
    }
  }

  private updateHeader(): void {
    const header = this.widget?.querySelector('.rtmn-chat-header');
    if (!header || !this.session) return;

    const statusEl = header.querySelector('.rtmn-chat-header-status span:last-child');
    const dotEl = header.querySelector('.rtmn-chat-header-status .dot');
    const avatarEl = header.querySelector('.rtmn-chat-header-avatar');
    const titleEl = header.querySelector('.rtmn-chat-header-title');

    if (this.session.agent) {
      if (statusEl) statusEl.textContent = `Online with ${this.session.agent.name}`;
      if (titleEl) titleEl.textContent = this.session.agent.name;
      if (dotEl) dotEl.className = 'dot';
      if (avatarEl) {
        avatarEl.innerHTML = this.session.agent.avatar
          ? `<img src="${this.session.agent.avatar}" alt="${this.session.agent.name}">`
          : this.session.agent.name.charAt(0);
      }
    } else {
      const botName = this.config.AIResponses?.botName || 'RTMN Support';
      if (statusEl) statusEl.textContent = 'Online';
      if (titleEl) titleEl.textContent = botName;
      if (dotEl) dotEl.className = 'dot';
      if (avatarEl) avatarEl.textContent = botName.charAt(0);
    }
  }

  private showTransferBanner(position?: number): void {
    const banner = this.widget?.querySelector('.rtmn-chat-transfer-banner');
    if (!banner) return;

    banner.removeAttribute('style');
    const queueText = banner.querySelector('.queue-text');
    if (queueText && position !== undefined) {
      queueText.textContent = `Queue position: ${position}`;
    }
  }

  private hideTransferBanner(): void {
    const banner = this.widget?.querySelector('.rtmn-chat-transfer-banner') as HTMLElement;
    if (banner) banner.style.display = 'none';
  }

  private triggerFileUpload(): void {
    this.fileInput?.click();
  }

  private handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    this.pendingFiles.push(...files);
    this.updateFilePreview();
    this.updateSendButton();

    input.value = '';
  }

  private updateFilePreview(): void {
    let previewArea = this.widget?.querySelector('.rtmn-chat-file-preview');

    if (this.pendingFiles.length === 0) {
      previewArea?.remove();
      return;
    }

    if (!previewArea) {
      previewArea = document.createElement('div');
      previewArea.className = 'rtmn-chat-file-preview';
      this.inputArea?.before(previewArea);
    }

    previewArea.innerHTML = this.pendingFiles.map((file, index) => `
      <div class="rtmn-chat-file-preview-item" data-index="${index}">
        ${file.type.startsWith('image/')
          ? `<img src="${URL.createObjectURL(file)}" class="rtmn-chat-file-preview-image" alt="${file.name}">`
          : ''}
        <span>${file.name}</span>
        <button class="rtmn-chat-file-preview-remove" data-index="${index}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    `).join('');

    previewArea.querySelectorAll('.rtmn-chat-file-preview-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
        this.removePendingFile(index);
      });
    });
  }

  private removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
    this.updateFilePreview();
    this.updateSendButton();
  }

  private updateSendButton(): void {
    const input = this.widget?.querySelector('.rtmn-chat-input') as HTMLTextAreaElement;
    const sendBtn = this.widget?.querySelector('.rtmn-chat-send-btn') as HTMLButtonElement;
    if (sendBtn && input) {
      sendBtn.disabled = !input.value.trim() && this.pendingFiles.length === 0;
    }
  }

  private async sendMessage(): Promise<void> {
    const input = this.widget?.querySelector('.rtmn-chat-input') as HTMLTextAreaElement;
    if (!input || !this.session) return;

    const content = input.value.trim();
    if (!content && this.pendingFiles.length === 0) return;

    const messageId = `msg-${Date.now()}`;
    const attachments: Attachment[] = [];

    for (const file of this.pendingFiles) {
      try {
        const attachment = await this.api.uploadFile(this.session.id, file);
        attachments.push(attachment);
        this.emit('file:upload', attachment);
      } catch (error) {
        this.emit('file:error', error as { code: string; message: string });
      }
    }

    const message: ChatMessage = {
      id: messageId,
      type: 'user',
      content,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'sending'
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.emit('message:send', message);

    input.value = '';
    this.autoResize(input);
    this.pendingFiles = [];
    this.updateFilePreview();
    this.updateSendButton();
    this.scrollToBottom();

    this.ws?.send(JSON.stringify({
      type: 'message',
      payload: { content, attachments }
    }));

    if (this.config.AIResponses?.enabled && !this.session.agent) {
      this.startTypingIndicator('bot', this.config.AIResponses.botName);

      setTimeout(async () => {
        try {
          const response = await this.api.getAIResponse(
            this.session!.id,
            content,
            this.messages.slice(-10)
          );
          this.handleIncomingMessage(response);
        } catch {
          this.stopTypingIndicator();
          this.handleIncomingMessage({
            id: `err-${Date.now()}`,
            type: 'bot',
            content: 'Sorry, I couldn\'t process your message. Please try again.',
            timestamp: Date.now()
          });
        }
      }, 1000);
    }

    this.markMessageStatus(messageId, 'sent');
  }

  private markMessageStatus(messageId: string, status: ChatMessage['status']): void {
    const messageEl = this.messagesContainer?.querySelector(`[data-id="${messageId}"]`);
    const statusEl = messageEl?.querySelector('.rtmn-chat-message-status');
    if (statusEl) {
      statusEl.innerHTML = this.getStatusIcon(status);
    }
    this.emit('message:status', { messageId, status });
  }

  private sendTypingIndicator(isTyping: boolean): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (isTyping) {
      this.ws?.send(JSON.stringify({ type: 'typing', payload: { isTyping: true } }));

      this.typingTimeout = setTimeout(() => {
        this.ws?.send(JSON.stringify({ type: 'typing', payload: { isTyping: false } }));
      }, 3000);
    }
  }

  private async requestAgentTransfer(department?: string): Promise<void> {
    if (!this.session) return;

    this.emit('transfer:request', department);

    if (this.config.AgentTransfer?.enabled && !this.session.agent) {
      this.showTransferBanner();

      try {
        const result = await this.api.requestAgentTransfer(this.session.id, department);
        if (result.success && result.agent) {
          this.emit('transfer:success', result.agent);
        }
      } catch {
        this.hideTransferBanner();
        this.addSystemMessage('No agents are currently available. Please try again later.');
      }
    }
  }

  private async endChat(): Promise<void> {
    if (!this.session) return;

    try {
      await this.api.endSession(this.session.id);
    } catch {}

    this.addSystemMessage('Chat ended');
    this.emit('session:ended', this.session);
    this.session = null;
  }

  public async sendQuickReply(reply: string): Promise<void> {
    const input = this.widget?.querySelector('.rtmn-chat-input') as HTMLTextAreaElement;
    if (input) {
      input.value = reply;
      await this.sendMessage();
    }
  }

  public on<K extends keyof ChatWidgetEvents>(event: K, callback: ChatWidgetEvents[K]): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    (this.events.get(event) as Set<EventCallback>).add(callback);
  }

  public off<K extends keyof ChatWidgetEvents>(event: K, callback: ChatWidgetEvents[K]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  private emit<K extends keyof ChatWidgetEvents>(event: K, data?: Parameters<ChatWidgetEvents[K]>[0]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => (callback as EventCallback)(data as unknown as never));
    }
  }

  public destroy(): void {
    this.ws?.close();
    this.container.remove();
  }

  public isWidgetOpen(): boolean {
    return this.isOpen;
  }

  public getSession(): ChatSession | null {
    return this.session;
  }
}
