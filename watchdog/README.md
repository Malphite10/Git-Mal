# STANDALONE SECURITY WATCHDOG

**This is a COMPLETELY INDEPENDENT process** - zero shared code, zero shared memory, zero direct communication with the main application.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN APP (Next.js)                       │
│  Port 3000  |  No watchdog imports  |  No shared state      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP ONLY (health checks)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  WATCHDOG (Separate Process)                 │
│  Own PID  |  Own Config  |  Own Secrets  |  Own Logs        │
│  Monitors: /api/health, /api/health/db, main app             │
│  Actions: Alert webhook, Restart command, Syslog             │
└──────────────────────────────────────────────────────────────┘
```

## Key Isolation Properties

| Property | Implementation |
|----------|----------------|
| **Process Isolation** | Separate PID, separate Node.js runtime |
| **No Shared Memory** | Zero imports from main app |
| **No Shared Config** | Own environment variables |
| **No Shared Secrets** | Own HMAC secret, own webhook URLs |
| **No Shared Logs** | Own log file, own syslog tag |
| **Network Only** | Communicates via HTTP health endpoints |
| **HMAC Verification** | Validates responses haven't been tampered |
| **IP Allowlist** | Only accepts checks from configured IPs |

## Deployment Options

### 1. Docker (Recommended)
```bash
# Build
docker build -t watchdog -f watchdog/Dockerfile .

# Run
docker run -d --name watchdog \
  --network host \
  -e WATCHDOG_TARGET_URL=http://localhost:3000 \
  -e WATCHDOG_API_URL=http://localhost:3000/api/health \
  -e WATCHDOG_HMAC_SECRET=your-super-secret-hmac-key \
  -e WATCHDOG_ALERT_WEBHOOK=https://alerts.example.com/webhook \
  -e WATCHDOG_RESTART_CMD="docker restart mal-media-app" \
  -v /var/log/watchdog:/var/log/watchdog \
  --restart unless-stopped \
  watchdog
```

### 2. Systemd Service (Linux)
```bash
# Create user
sudo useradd -r -s /bin/false watchdog

# Install
sudo mkdir -p /opt/watchdog
sudo cp watchdog/index.js /opt/watchdog/
sudo chown -R watchdog:watchdog /opt/watchdog
sudo cp watchdog/watchdog.service /etc/systemd/system/

# Configure (edit secrets!)
sudo systemctl edit watchdog
# Add your environment variables

# Enable & start
sudo systemctl daemon-reload
sudo systemctl enable watchdog
sudo systemctl start watchdog

# Logs
journalctl -u watchdog -f
```

### 3. Process Manager (PM2)
```bash
pm2 start watchdog/index.js --name watchdog \
  --env production \
  --watch false \
  --max-memory-restart 100M \
  --log /var/log/watchdog-pm2.log \
  --env WATCHDOG_TARGET_URL=http://localhost:3000 \
  --env WATCHDOG_HMAC_SECRET=your-secret
```

### 4. Kubernetes Sidecar (Separate Pod)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mal-media-with-watchdog
spec:
  containers:
  - name: app
    image: mal-media-app:latest
    ports:
    - containerPort: 3000
  - name: watchdog
    image: watchdog:latest
    env:
    - name: WATCHDOG_TARGET_URL
      value: "http://localhost:3000"
    - name: WATCHDOG_HMAC_SECRET
      valueFrom:
        secretKeyRef:
          name: watchdog-secrets
          key: hmac-secret
    - name: WATCHDOG_ALERT_WEBHOOK
      valueFrom:
        secretKeyRef:
          name: watchdog-secrets
          key: alert-webhook
```

## Required Health Endpoints (Add to Main App)

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: process.env.npm_package_version 
  });
}

// app/api/health/db/route.ts
import { prisma } from '@/lib/prisma';
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'connected' });
  } catch {
    return Response.json({ status: 'error', db: 'disconnected' }, { status: 503 });
  }
}
```

## HMAC Response Signing (Main App)

```typescript
// middleware.ts or API route wrapper
import crypto from 'crypto';

function signResponse(data: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// In health endpoints:
const body = JSON.stringify(responseData);
const signature = signResponse(body, process.env.WATCHDOG_HMAC_SECRET!);
return new Response(body, {
  headers: { 
    'Content-Type': 'application/json',
    'X-Watchdog-Signature': signature 
  }
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WATCHDOG_TARGET_URL` | Yes | Main app URL |
| `WATCHDOG_API_URL` | Yes | API health endpoint |
| `WATCHDOG_DB_URL` | No | DB health endpoint |
| `WATCHDOG_HMAC_SECRET` | Yes* | HMAC secret for response verification |
| `WATCHDOG_ALERT_WEBHOOK` | No | Webhook for alerts (Slack, PagerDuty, etc.) |
| `WATCHDOG_RESTART_CMD` | No | Command to restart main app |
| `WATCHDOG_MAX_RESTARTS` | No | Max auto-restarts (default: 3) |
| `WATCHDOG_RESTART_COOLDOWN` | No | Cooldown between restarts (ms, default: 300000) |
| `WATCHDOG_ALLOWED_IPS` | No | Comma-separated CIDR allowlist |
| `WATCHDOG_LOG_LEVEL` | No | debug/info/warn/error (default: info) |
| `WATCHDOG_LOG_FILE` | No | Log file path (default: /var/log/watchdog.log) |
| `WATCHDOG_SYSLOG` | No | Enable syslog (default: false) |

*Required if main app signs responses

## Alert Payload Format

```json
{
  "type": "health_degraded|restart_triggered|max_restarts_exceeded",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "watchdog": {
    "version": "1.0.0",
    "pid": 12345,
    "uptime": 3600000
  },
  "health": {
    "healthy": false,
    "failed": 1,
    "slow": 0,
    "errorRate": 0.33,
    "results": [...]
  }
}
```

## Monitoring the Watchdog

The watchdog monitors itself:
- Logs status every 5 minutes (uptime, memory, restart count)
- Health checks logged at configured intervals
- Self-restart on uncaught exceptions
- Graceful shutdown on SIGTERM/SIGINT

## Security Checklist

- [ ] Generate strong HMAC secret: `openssl rand -hex 32`
- [ ] Use HTTPS for all health endpoints
- [ ] Configure IP allowlist for watchdog network
- [ ] Set up alert webhook with authentication
- [ ] Run watchdog on separate host/container
- [ ] Monitor watchdog logs separately
- [ ] Test restart command manually first
- [ ] Set up log rotation for `/var/log/watchdog.log`

## Verification

```bash
# Test watchdog can reach app
curl -H "X-Watchdog-Check: true" http://localhost:3000/api/health

# Verify HMAC signing
curl -v http://localhost:3000/api/health | grep X-Watchdog-Signature

# Check watchdog logs
tail -f /var/log/watchdog.log

# Manual restart test
WATCHDOG_RESTART_CMD="echo 'would restart'" node watchdog/index.js
```

---

**Remember**: The watchdog is only as secure as its deployment. Run it on infrastructure the main app cannot access.