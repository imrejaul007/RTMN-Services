import { ChatWidget } from './chat';
import type { ChatConfig } from './types';

declare global {
  interface Window {
    RTMNChatWidget: {
      init: (config: ChatConfig) => ChatWidget;
      destroy: () => void;
    };
  }
}

let widgetInstance: ChatWidget | null = null;

function initChatWidget(config: ChatConfig): ChatWidget {
  if (widgetInstance) {
    widgetInstance.destroy();
  }

  injectStyles();
  widgetInstance = new ChatWidget(config);
  return widgetInstance;
}

function destroyChatWidget(): void {
  if (widgetInstance) {
    widgetInstance.destroy();
    widgetInstance = null;
  }
}

function injectStyles(): void {
  if (document.getElementById('rtmn-chat-widget-styles')) return;

  const link = document.createElement('link');
  link.id = 'rtmn-chat-widget-styles';
  link.rel = 'stylesheet';
  link.href = 'chat-widget.css';
  document.head.appendChild(link);
}

window.RTMNChatWidget = {
  init: initChatWidget,
  destroy: destroyChatWidget
};

export { initChatWidget, destroyChatWidget };
