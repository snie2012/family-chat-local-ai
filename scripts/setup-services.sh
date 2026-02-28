#!/bin/bash
# Sets up systemd user services for auto-starting Family Chat on boot.
# Run once after initial setup.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_DIR="$HOME/.config/systemd/user"
NODE_BIN="$(which node)"
NGROK_BIN="$(which ngrok)"

# Read ngrok domain from .env if present, otherwise prompt
NGROK_DOMAIN="${NGROK_DOMAIN:-}"
if [ -z "$NGROK_DOMAIN" ]; then
  read -rp "Enter your ngrok static domain (e.g. your-name.ngrok-free.dev): " NGROK_DOMAIN
fi

mkdir -p "$SERVICE_DIR"

# --- Family Chat Server ---
cat > "$SERVICE_DIR/family-chat.service" << EOF
[Unit]
Description=Family Chat Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR/server
ExecStart=$NODE_BIN dist/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

# --- ngrok Tunnel ---
cat > "$SERVICE_DIR/family-chat-ngrok.service" << EOF
[Unit]
Description=ngrok tunnel for Family Chat
After=network.target family-chat.service

[Service]
Type=simple
ExecStart=$NGROK_BIN http --domain=$NGROK_DOMAIN 3000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable family-chat.service family-chat-ngrok.service
systemctl --user start family-chat.service family-chat-ngrok.service

echo ""
echo "Services installed and started."
echo ""
echo "NOTE: Ollama (installed via snap) auto-starts on boot automatically."
echo ""
echo "To make services start on boot WITHOUT being logged in, run once:"
echo "  sudo loginctl enable-linger $USER"
echo ""
echo "Useful commands:"
echo "  systemctl --user status family-chat family-chat-ngrok"
echo "  systemctl --user restart family-chat"
echo "  journalctl --user -u family-chat -f"
