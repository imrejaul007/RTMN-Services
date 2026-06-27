#!/bin/bash
# Start Widget Command - AI Business Advisor (Port 5412)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIDGET_COMMAND_DIR="$(dirname "$SCRIPT_DIR")/products/widget-command"

start_widget_command() {
    echo "[Widget Command] Starting AI Business Advisor on port 5412..."
    cd "$WIDGET_COMMAND_DIR"
    npm start &
    echo "[Widget Command] Started with PID $!"
}

stop_widget_command() {
    echo "[Widget Command] Stopping..."
    pkill -f "widget-command" 2>/dev/null || true
    echo "[Widget Command] Stopped"
}

case "$1" in
    start)
        start_widget_command
        ;;
    stop)
        stop_widget_command
        ;;
    restart)
        stop_widget_command
        sleep 1
        start_widget_command
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
