#!/bin/bash
# STANDALONE WATCHDOG DEPLOYMENT SCRIPT
# Run this on the WATCHDOG HOST (separate from main app)

set -euo pipefail

WATCHDOG_DIR="/opt/watchdog"
LOG_DIR="/var/log"
SERVICE_FILE="/etc/systemd/system/watchdog.service"

echo "🛡️ Deploying Standalone Watchdog"
echo "================================="

# Check root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (for systemd install)"
   exit 1
fi

# Create watchdog user
if ! id "watchdog" &>/dev/null; then
    useradd -r -s /bin/false watchdog
    echo "✅ Created watchdog user"
fi

# Create directories
mkdir -p "$WATCHDOG_DIR"
mkdir -p "$LOG_DIR"
touch "$LOG_DIR/watchdog.log"
chown watchdog:watchdog "$LOG_DIR/watchdog.log"
chmod 644 "$LOG_DIR/watchdog.log"

# Copy files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/index.js" "$WATCHDOG_DIR/"
cp "$SCRIPT_DIR/package.json" "$WATCHDOG_DIR/"
chmod +x "$WATCHDOG_DIR/index.js"
chown -R watchdog:watchdog "$WATCHDOG_DIR"

# Generate HMAC secret if not provided
if [[ -z "${WATCHDOG_HMAC_SECRET:-}" ]]; then
    HMAC_SECRET=$(openssl rand -hex 32)
    echo "🔐 Generated HMAC secret: $HMAC_SECRET"
    echo "   SAVE THIS - Add to main app and watchdog env!"
else
    HMAC_SECRET="$WATCHDOG_HMAC_SECRET"
fi

# Create environment file
cat > "$WATCHDOG_DIR/.env" <<EOF
# Watchdog Configuration - KEEP SECURE
NODE_ENV=production
WATCHDOG_TARGET_URL=${WATCHDOG_TARGET_URL:-http://localhost:3000}
WATCHDOG_API_URL=${WATCHDOG_API_URL:-http://localhost:3000/api/health}
WATCHDOG_DB_URL=${WATCHDOG_DB_URL:-http://localhost:3000/api/health/db}
WATCHDOG_HMAC_SECRET=$HMAC_SECRET
WATCHDOG_ALERT_WEBHOOK=${WATCHDOG_ALERT_WEBHOOK:-}
WATCHDOG_RESTART_CMD=${WATCHDOG_RESTART_CMD:-}
WATCHDOG_MAX_RESTARTS=${WATCHDOG_MAX_RESTARTS:-3}
WATCHDOG_RESTART_COOLDOWN=${WATCHDOG_RESTART_COOLDOWN:-300000}
WATCHDOG_ALLOWED_IPS=${WATCHDOG_ALLOWED_IPS:-127.0.0.1,::1}
WATCHDOG_LOG_LEVEL=${WATCHDOG_LOG_LEVEL:-info}
WATCHDOG_LOG_FILE=$LOG_DIR/watchdog.log
WATCHDOG_SYSLOG=${WATCHDOG_SYSLOG:-true}
EOF

chown watchdog:watchdog "$WATCHDOG_DIR/.env"
chmod 600 "$WATCHDOG_DIR/.env"

# Install systemd service
cp "$SCRIPT_DIR/watchdog.service" "$SERVICE_FILE"

# Update service with actual paths
sed -i "s|/opt/watchdog|$WATCHDOG_DIR|g" "$SERVICE_FILE"
sed -i "s|/var/log/watchdog.log|$LOG_DIR/watchdog.log|g" "$SERVICE_FILE"

systemctl daemon-reload
systemctl enable watchdog

echo ""
echo "✅ Watchdog deployed!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit $WATCHDOG_DIR/.env with your values:"
echo "   - WATCHDOG_TARGET_URL (your main app URL)"
echo "   - WATCHDOG_ALERT_WEBHOOK (Slack/PagerDuty/webhook)"
echo "   - WATCHDOG_RESTART_CMD (how to restart main app)"
echo ""
echo "2. Add HMAC secret to MAIN APP .env:"
echo "   WATCHDOG_HMAC_SECRET=$HMAC_SECRET"
echo ""
echo "3. Add health endpoints to main app (see README.md)"
echo ""
echo "4. Start watchdog:"
echo "   systemctl start watchdog"
echo "   journalctl -u watchdog -f"
echo ""
echo "🔐 HMAC Secret (save this!): $HMAC_SECRET"