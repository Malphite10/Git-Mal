#!/usr/bin/env node
/**
 * STANDALONE SECURITY WATCHDOG
 * 
 * This is a COMPLETELY INDEPENDENT process that:
 * - Runs as a separate PID (no shared memory with main app)
 * - Communicates ONLY via HTTP health checks
 * - Cannot be reached/tampered by main app
 * - Has its own isolated config & secrets
 * - Logs to separate output (stdout/file/syslog)
 * 
 * DEPLOYMENT: Run on separate container/VM/process manager
 * NEVER import from main app. NEVER share node_modules.
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const WATCHDOG_VERSION = '1.0.0';
const START_TIME = Date.now();

const CONFIG = {
  targets: [
    { name: 'main-app', url: process.env.WATCHDOG_TARGET_URL || 'http://localhost:3000', interval: 30000 },
    { name: 'api-health', url: process.env.WATCHDOG_API_URL || 'http://localhost:3000/api/health', interval: 15000 },
    { name: 'db-check', url: process.env.WATCHDOG_DB_URL || 'http://localhost:3000/api/health/db', interval: 60000 },
  ],
  thresholds: {
    maxResponseTime: 5000,
    maxErrorRate: 0.1,
    maxMemoryMB: 512,
    maxCpuPercent: 80,
  },
  actions: {
    alertWebhook: process.env.WATCHDOG_ALERT_WEBHOOK,
    restartCommand: process.env.WATCHDOG_RESTART_CMD,
    maxRestarts: 3,
    restartCooldown: 300000,
  },
  logging: {
    level: process.env.WATCHDOG_LOG_LEVEL || 'info',
    file: process.env.WATCHDOG_LOG_FILE || '/var/log/watchdog.log',
    syslog: process.env.WATCHDOG_SYSLOG === 'true',
  },
  security: {
    hmacSecret: process.env.WATCHDOG_HMAC_SECRET,
    allowedIps: (process.env.WATCHDOG_ALLOWED_IPS || '').split(',').filter(Boolean),
    tlsRejectUnauthorized: process.env.NODE_ENV === 'production',
  },
};

const STATE = {
  checks: new Map(),
  restarts: 0,
  lastRestart: 0,
  startTime: START_TIME,
};

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component: 'watchdog',
    version: WATCHDOG_VERSION,
    pid: process.pid,
    message,
    ...meta,
  };
  
  const output = JSON.stringify(entry);
  
  if (CONFIG.logging.file) {
    try { fs.appendFileSync(CONFIG.logging.file, output + '\n'); } catch {}
  }
  
  if (CONFIG.logging.syslog) {
    try { spawn('logger', ['-t', 'watchdog', output]); } catch {}
  }
  
  const consoleLevel = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[consoleLevel](`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, meta);
}

function verifyHmac(payload, signature) {
  if (!CONFIG.security.hmacSecret) return true;
  const expected = crypto.createHmac('sha256', CONFIG.security.hmacSecret)
    .update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function checkIpAllowed(ip) {
  if (CONFIG.security.allowedIps.length === 0) return true;
  return CONFIG.security.allowedIps.some(allowed => {
    if (allowed.includes('/')) {
      const [range, bits] = allowed.split('/');
      const mask = ~0 << (32 - parseInt(bits));
      const ipNum = ip.split('.').reduce((a, b) => (a << 8) + +b, 0) >>> 0;
      const rangeNum = range.split('.').reduce((a, b) => (a << 8) + +b, 0) >>> 0;
      return (ipNum & mask) === (rangeNum & mask);
    }
    return ip === allowed;
  });
}

async function httpCheck(target) {
  const start = Date.now();
  const url = new URL(target.url);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;
  
  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    timeout: CONFIG.thresholds.maxResponseTime,
    rejectUnauthorized: CONFIG.security.tlsRejectUnauthorized,
    headers: {
      'User-Agent': `Watchdog/${WATCHDOG_VERSION}`,
      'X-Watchdog-Check': 'true',
    },
  };
  
  return new Promise((resolve) => {
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        const success = res.statusCode >= 200 && res.statusCode < 400;
        
        if (CONFIG.security.hmacSecret) {
          const sig = res.headers['x-watchdog-signature'];
          if (!sig || !verifyHmac(data, sig)) {
            return resolve({ target: target.name, success: false, duration, error: 'HMAC verification failed', statusCode: res.statusCode });
          }
        }
        
        resolve({
          target: target.name,
          success,
          duration,
          statusCode: res.statusCode,
          error: success ? null : `HTTP ${res.statusCode}`,
        });
      });
    });
    
    req.on('error', (err) => resolve({ target: target.name, success: false, duration: Date.now() - start, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ target: target.name, success: false, duration: CONFIG.thresholds.maxResponseTime, error: 'Timeout' }); });
    req.end();
  });
}

function evaluateHealth(results) {
  const failed = results.filter(r => !r.success);
  const slow = results.filter(r => r.duration > CONFIG.thresholds.maxResponseTime);
  const errorRate = failed.length / results.length;
  
  return {
    healthy: failed.length === 0 && slow.length === 0 && errorRate <= CONFIG.thresholds.maxErrorRate,
    failed: failed.length,
    slow: slow.length,
    errorRate,
    results,
  };
}

async function triggerAlert(alert) {
  if (!CONFIG.actions.alertWebhook) return;
  
  try {
    const payload = JSON.stringify({ ...alert, watchdog: { version: WATCHDOG_VERSION, pid: process.pid, uptime: Date.now() - START_TIME } });
    const url = new URL(CONFIG.actions.alertWebhook);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    await new Promise((resolve, reject) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Watchdog-Signature': CONFIG.security.hmacSecret ? crypto.createHmac('sha256', CONFIG.security.hmacSecret).update(payload).digest('hex') : '',
        },
      }, res => { res.on('data', () => {}); res.on('end', resolve); });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  } catch (err) {
    log('error', 'Alert webhook failed', { error: err.message });
  }
}

async function maybeRestart(reason) {
  const now = Date.now();
  if (CONFIG.actions.maxRestarts > 0 && STATE.restarts >= CONFIG.actions.maxRestarts) {
    log('error', 'Max restarts reached, manual intervention required', { restarts: STATE.restarts });
    await triggerAlert({ type: 'max_restarts_exceeded', reason, restarts: STATE.restarts });
    return;
  }
  
  if (now - STATE.lastRestart < CONFIG.actions.restartCooldown) {
    log('warn', 'Restart cooldown active', { cooldownRemaining: CONFIG.actions.restartCooldown - (now - STATE.lastRestart) });
    return;
  }
  
  if (!CONFIG.actions.restartCommand) {
    log('warn', 'No restart command configured');
    return;
  }
  
  log('warn', 'Triggering restart', { reason, restartNumber: STATE.restarts + 1 });
  STATE.restarts++;
  STATE.lastRestart = now;
  
  try {
    const [cmd, ...args] = CONFIG.actions.restartCommand.split(' ');
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
    await triggerAlert({ type: 'restart_triggered', reason, restartNumber: STATE.restarts });
  } catch (err) {
    log('error', 'Restart failed', { error: err.message });
  }
}

async function runChecks() {
  const results = await Promise.all(CONFIG.targets.map(t => httpCheck(t)));
  const health = evaluateHealth(results);
  
  const checkRecord = { timestamp: Date.now(), health };
  STATE.checks.set(Date.now(), checkRecord);
  
  if (STATE.checks.size > 100) {
    const oldest = Math.min(...STATE.checks.keys());
    STATE.checks.delete(oldest);
  }
  
  log('info', 'Health check complete', { healthy: health.healthy, failed: health.failed, slow: health.slow, errorRate: health.errorRate });
  
  if (!health.healthy) {
    await triggerAlert({ type: 'health_degraded', health, timestamp: new Date().toISOString() });
    
    if (health.failed > 0) {
      await maybeRestart(`${health.failed} targets failed`);
    }
  }
  
  return health;
}

function printStatus() {
  const uptime = Date.now() - START_TIME;
  const recent = Array.from(STATE.checks.values()).slice(-10);
  const healthyCount = recent.filter(c => c.health.healthy).length;
  
  log('info', 'Status report', {
    uptime: Math.floor(uptime / 1000) + 's',
    restarts: STATE.restarts,
    recentChecks: recent.length,
    healthyRate: recent.length ? (healthyCount / recent.length * 100).toFixed(1) + '%' : 'N/A',
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
}

async function main() {
  log('info', 'Watchdog starting', { version: WATCHDOG_VERSION, pid: process.pid, config: { targets: CONFIG.targets.length, thresholds: CONFIG.thresholds } });
  
  if (CONFIG.actions.restartCommand) {
    log('info', 'Restart capability enabled', { command: CONFIG.actions.restartCommand, maxRestarts: CONFIG.actions.maxRestarts });
  }
  
  const checkIntervals = CONFIG.targets.map(target => {
    log('info', `Scheduling check for ${target.name}`, { url: target.url, interval: target.interval });
    return setInterval(runChecks, target.interval);
  });
  
  const statusInterval = setInterval(printStatus, 300000);
  
  await runChecks();
  
  process.on('SIGTERM', () => {
    log('info', 'Shutdown signal received');
    checkIntervals.forEach(clearInterval);
    clearInterval(statusInterval);
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    log('info', 'Interrupt signal received');
    checkIntervals.forEach(clearInterval);
    clearInterval(statusInterval);
    process.exit(0);
  });
  
  process.on('uncaughtException', (err) => {
    log('error', 'Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason) => {
    log('error', 'Unhandled rejection', { reason: String(reason) });
  });
}

main().catch(err => {
  log('error', 'Fatal startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});