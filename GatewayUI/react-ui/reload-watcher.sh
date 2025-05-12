#!/bin/sh

WATCH_FILE="/var/www/certbot/reload.flag"

while true; do
  if [ -f "$WATCH_FILE" ]; then
    echo "[Watcher] Reloading nginx due to updated cert..."
    nginx -s reload
    rm -f "$WATCH_FILE"
  fi
  sleep 60
done