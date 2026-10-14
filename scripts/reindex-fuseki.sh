#!/usr/bin/env bash
set -euo pipefail

# Rebuilds the Fuseki Lucene text index and reseeds RDF data.
# Use after changing the text index schema in lovamap-rdf.ttl
# or when the Lucene index gets out of sync.
#
# Usage:
#   ./scripts/reindex-fuseki.sh              # default: uses localhost:5002 for kb-backend
#   ./scripts/reindex-fuseki.sh https://kb.lovamap.com   # use a custom KB backend URL

CONTAINER="lovamap_fuseki"
LUCENE_DIR="/fuseki/databases/lovamap-rdf-lucene"
KB_URL="${1:-http://localhost:5002}"

echo "==> Clearing Lucene index in ${CONTAINER}..."
docker exec "$CONTAINER" sh -c "rm -rf ${LUCENE_DIR}/*"

echo "==> Restarting Fuseki to rebuild empty index..."
docker restart "$CONTAINER"

echo "==> Waiting for Fuseki to be healthy..."
until docker exec "$CONTAINER" wget -qO- http://localhost:3030/\$\$/ping >/dev/null 2>&1; do
  sleep 2
done
echo "    Fuseki is up."

echo "==> Triggering reseed on kb-backend (${KB_URL})..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${KB_URL}/api/admin/reseed")

if [ "$HTTP_CODE" = "200" ]; then
  echo "==> Reseed complete. Lucene index rebuilt with current schema."
else
  echo "!!! Reseed returned HTTP ${HTTP_CODE}. Check kb-backend logs."
  exit 1
fi
