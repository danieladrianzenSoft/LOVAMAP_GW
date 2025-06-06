#!/bin/bash
echo "=== Cleanup started at $(date) ==="

echo "🧹 Cleaning up Docker system..."
docker system prune -af

echo "🧹 Cleaning up Docker build cache..."
docker builder prune -af

echo "Cleanup complete"