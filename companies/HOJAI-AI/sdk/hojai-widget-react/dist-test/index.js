import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { HojaiWidget } from '@hojai/widget-core';
export { HojaiWidget };
export const HojaiChat = forwardRef(function HojaiChat(props, ref) {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (!containerRef.current)
            return;
        const widget = new HojaiWidget(props);
        widgetRef.current = widget;
        const offs = [];
        if (props.onMessage)
            offs.push(widget.on('message', props.onMessage));
        if (props.onResponse)
            offs.push(widget.on('response', props.onResponse));
        if (props.onError)
            offs.push(widget.on('error', props.onError));
        if (props.onOpen)
            offs.push(widget.on('open', props.onOpen));
        if (props.onClose)
            offs.push(widget.on('close', props.onClose));
        widget.render();
        setReady(true);
        return () => {
            offs.forEach((off) => off());
            widget.destroy();
            widgetRef.current = null;
        };
    }, []);
    useImperativeHandle(ref, () => ({
        send: (text) => {
            if (!widgetRef.current)
                return Promise.reject(new Error('Widget not ready'));
            return widgetRef.current.send(text);
        },
        open: () => widgetRef.current?.open(),
        close: () => widgetRef.current?.close(),
        getHistory: () => widgetRef.current?.getHistory() || [],
        identify: (user) => widgetRef.current?.identify(user)
    }), [ready]);
    return (_jsx("div", { ref: containerRef, className: props.className, style: { minHeight: 0, ...props.style }, "data-hojai-chat": "" }));
});
export function useHojaiWidget(config) {
    const widgetRef = useRef(null);
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
        send: (text) => {
            if (!widgetRef.current)
                return Promise.reject(new Error('Widget not ready'));
            return widgetRef.current.send(text);
        },
        open: () => widgetRef.current?.open(),
        close: () => widgetRef.current?.close(),
        getHistory: () => widgetRef.current?.getHistory() || []
    };
}
