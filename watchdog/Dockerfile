# STANDALONE WATCHDOG CONTAINER
# Build: docker build -t watchdog -f watchdog/Dockerfile .
# Run: docker run -d --name watchdog \
#   -e WATCHDOG_TARGET_URL=http://host.docker.internal:3000 \
#   -e WATCHDOG_ALERT_WEBHOOK=https://alerts.example.com/webhook \
#   -e WATCHDOG_HMAC_SECRET=your-secret \
#   -v /var/log/watchdog:/var/log/watchdog \
#   watchdog

FROM node:18-alpine AS base

RUN apk add --no-cache curl bash

WORKDIR /watchdog

COPY watchdog/package.json ./
COPY watchdog/index.js ./

RUN chmod +x index.js

ENV NODE_ENV=production \
    WATCHDOG_LOG_LEVEL=info \
    WATCHDOG_LOG_FILE=/var/log/watchdog.log \
    WATCHDOG_SYSLOG=false \
    WATCHDOG_TLS_REJECT_UNAUTHORIZED=true

RUN mkdir -p /var/log && touch /var/log/watchdog.log && chmod 644 /var/log/watchdog.log

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('./index.js').main().catch(() => process.exit(1))" || exit 1

USER node

ENTRYPOINT ["node", "index.js"]