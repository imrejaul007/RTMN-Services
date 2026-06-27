/**
 * @hojai/widget-react — React wrapper around @hojai/widget-core.
 *
 * Usage:
 *   import { HojaiChat } from '@hojai/widget-react';
 *
 *   <HojaiChat
 *     apiKey="pk_live_..."
 *     companyId="maya-collective"
 *     config={{ name: 'Maya Assistant', color: '#3B82F6' }}
 *   />
 *
 * Or for full programmatic control:
 *   const ref = useRef<HojaiChatHandle>(null);
 *   <HojaiChat ref={ref} apiKey="..." companyId="..." />
 *   ref.current?.send('Hello');
 */

import * as React from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { HojaiWidget, HojaiWidgetConfig, WidgetMessage } from '@hojai/widget-core';

export type {
  HojaiWidgetConfig,
  WidgetEvent,
  WidgetMessage,
  WidgetTheme,
  WidgetUser
} from '@hojai/widget-core';
export { HojaiWidget };

export interface HojaiChatProps extends HojaiWidgetConfig {
  className?: string;
  style?: React.CSSProperties;
  onMessage?: (message: WidgetMessage) => void;
  onResponse?: (message: WidgetMessage) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface HojaiChatHandle {
  send: (text: string) => Promise<WidgetMessage>;
  open: () => void;
  close: () => void;
  getHistory: () => WidgetMessage[];
  identify: (user: any) => void;
}

export const HojaiChat = forwardRef<HojaiChatHandle, HojaiChatProps>(
  function HojaiChat(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<HojaiWidget | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      if (!containerRef.current) return;
      const widget = new HojaiWidget(props);
      widgetRef.current = widget;

      const offs: Array<() => void> = [];
      if (props.onMessage) offs.push(widget.on('message', props.onMessage));
      if (props.onResponse) offs.push(widget.on('response', props.onResponse));
      if (props.onError) offs.push(widget.on('error', props.onError));
      if (props.onOpen) offs.push(widget.on('open', props.onOpen));
      if (props.onClose) offs.push(widget.on('close', props.onClose));

      widget.render();
      setReady(true);

      return () => {
        offs.forEach((off) => off());
        widget.destroy();
        widgetRef.current = null;
      };
    }, []);

    const send = useCallback((text: string) => {
      if (!widgetRef.current) return Promise.reject(new Error('Widget not ready'));
      return widgetRef.current.send(text);
    }, []);

    const open = useCallback(() => widgetRef.current?.open(), []);

    const close = useCallback(() => widgetRef.current?.close(), []);

    const getHistory = useCallback(() => widgetRef.current?.getHistory() || [], []);

    const identify = useCallback((user: any) => widgetRef.current?.identify(user), []);

    useImperativeHandle(
      ref,
      () => ({ send, open, close, getHistory, identify }),
      [send, open, close, getHistory, identify]
    );

    return (
      <div
        ref={containerRef}
        className={props.className}
        style={{ minHeight: 0, ...props.style }}
        data-hojai-chat=""
      />
    );
  }
);

export function useHojaiWidget(config: HojaiWidgetConfig): {
  widget: HojaiWidget | null;
  send: (text: string) => Promise<WidgetMessage>;
  open: () => void;
  close: () => void;
  getHistory: () => WidgetMessage[];
} {
  const widgetRef = useRef<HojaiWidget | null>(null);

  useEffect(() => {
    const w = new HojaiWidget(config);
    widgetRef.current = w;
    w.render();
    return () => {
      w.destroy();
      widgetRef.current = null;
    };
  }, []);

  return {
    widget: widgetRef.current,
    send: (text: string) => {
      if (!widgetRef.current) return Promise.reject(new Error('Widget not ready'));
      return widgetRef.current.send(text);
    },
    open: () => widgetRef.current?.open(),
    close: () => widgetRef.current?.close(),
    getHistory: () => widgetRef.current?.getHistory() || []
  };
}
