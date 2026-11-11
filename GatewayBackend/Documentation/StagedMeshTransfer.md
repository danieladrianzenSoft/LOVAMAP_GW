# Staged Mesh Transfer

## Problem

GLB mesh files are written directly to a Docker-mounted NFS shared volume (`/srv/lovamap-shared-data/...` → `/app/Data/Domains` inside the container). This NFS mount is unreliable — files sometimes end up as null bytes on disk despite valid data in memory, or writes fail entirely with `Input/output error`. The previous fix (WriteThrough + verify + retry) fights the mount on every request, adding latency and occasional failures.

## Architecture

### Two-phase write

1. **Hot path (during request):** `SaveGLBToStaging()` writes to a Docker named volume (`/app/staging/meshes/`). Fast and reliable — it's local Docker storage, not the NFS mount. `Domain.MeshFilePath` is set to the **final mount path** immediately, but `Domain.MeshPendingTransfer = true` tracks that the file hasn't been moved yet.

2. **Background worker:** `MeshTransferWorker` (a `BackgroundService`) polls the staging directory and transfers files to the NFS mount at its own pace. See [Worker Behavior](#worker-behavior) for details.

3. **Serving:** `GetDomain()` checks `MeshPendingTransfer` — if true, reads from staging path instead of mount path. Meshes are available for visualization immediately after upload, with zero delay.

### Flow diagram

```
Upload Request
    │
    ▼
SaveGLBToStaging()  →  /app/staging/meshes/{scaffoldId}_{guid}.glb  (Docker volume, fast)
    │
    ▼
DB: MeshFilePath = /app/Data/Domains/{scaffoldId}_{guid}.glb
    MeshPendingTransfer = true
    │
    ▼
Response returned immediately
    │
    ... (background) ...
    │
    ▼
MeshTransferWorker picks up staged file
    │
    ▼
TransferFromStaging()  →  copies to NFS mount with WriteThrough + verify
    │
    ├── Success: DB MeshPendingTransfer = false, delete staging copy
    └── Failure: silent, retry next cycle
```

## Worker Behavior

`MeshTransferWorker` (`API/BackgroundServices/MeshTransferWorker.cs`) follows these rules:

### Polling & timing

- **Normal interval:** 10 seconds between cycles
- **Backoff interval:** 60 seconds — kicks in after 3 consecutive full-fail cycles (every file in a cycle failed). Resets to 10s as soon as any transfer succeeds.
- **Per-file delay (success):** 200ms — keeps throughput high when mount is healthy
- **Per-file delay (failure):** 1 second — eases off the NFS mount when it's struggling

### Per-file transfer process

For each `.glb` file in the staging directory:
1. Look up the domain in DB by matching filename in `MeshFilePath` where `MeshPendingTransfer = true`
2. If no matching domain found, skip silently (counted as "skipped" in summary)
3. Call `TransferFromStaging()`: read staging file → write to NFS with `FileOptions.WriteThrough` → verify magic bytes + file length → up to 3 attempts
4. On success: set `MeshPendingTransfer = false`, delete staging copy
5. On failure: leave staging file in place for next cycle

### Logging

The worker uses **summary-based logging** to avoid log spam when the NFS mount is down:

- **Per-file successes** are logged individually: `MeshTransferWorker: transferred Domain {Id} ({FileName})`
- **Per-file failures** are silent — no per-file error/warning
- **Cycle summary** is always logged: `MeshTransferWorker: cycle complete — {Transferred} transferred, {Failed} failed, {Skipped} skipped, {Remaining} remaining`
- **Backoff** is logged as a warning: `MeshTransferWorker: {Count} consecutive full-fail cycles — backing off to 60s`
- **NFS I/O errors** (`IOException`) in `DomainFileService.TransferFromStaging` are caught silently — the worker summary covers them
- **Unexpected errors** (non-IOException) are still logged with full stack trace

Example output when mount is intermittently failing:
```
MeshTransferWorker: starting cycle with 150 staged files
MeshTransferWorker: transferred Domain 509 (58_xxx.glb)
MeshTransferWorker: transferred Domain 510 (59_xxx.glb)
MeshTransferWorker: cycle complete — 2 transferred, 148 failed, 0 skipped, 148 remaining
```

Example output when mount is completely down (after 3 cycles):
```
MeshTransferWorker: starting cycle with 150 staged files
MeshTransferWorker: cycle complete — 0 transferred, 150 failed, 0 skipped, 150 remaining
MeshTransferWorker: 3 consecutive full-fail cycles — backing off to 60s
```

### Startup behavior

On startup, the worker scans the staging directory and logs any files from a previous run:
```
MeshTransferWorker found {Count} staged files from previous run
```
It then begins normal polling cycles to transfer them.

## Configuration

### appsettings.json (development)

```json
"OutputPaths": {
    "Domains": "Data/Domains",
    "DomainStaging": "Data/Staging/Meshes",
    "JobResults": "Data/JobResults"
}
```

### appsettings.Production.json

```json
"OutputPaths": {
    "Domains": "/app/Data/Domains",
    "DomainStaging": "/app/staging/meshes",
    "JobResults": "/app/Data/JobResults"
}
```

### docker-compose.yml

The staging directory is a **named Docker volume** so it survives container restarts:

```yaml
backend:
  volumes:
    - /srv/lovamap-shared-data/lovamap-gw/production/Domains:/app/Data/Domains  # NFS mount
    - /srv/lovamap-shared-data/lovamap-gw/production/JobResults:/app/Data/JobResults  # NFS mount
    - lovamap_gw_mesh_staging:/app/staging/meshes  # Docker named volume (local, fast)

volumes:
  lovamap_gw_mesh_staging:
```

**Important:** The staging volume must NOT be on the NFS mount. The whole point is that staging writes go to fast, reliable local Docker storage.

## Monitoring

### Admin endpoint

`GET /api/admin/domains/pending-transfers` — returns count of staged files and their filenames.

Expected response when healthy (no backlog):
```json
{
  "statusCode": 200,
  "message": "Pending transfers",
  "data": {
    "stagedFileCount": 0,
    "stagedFiles": []
  }
}
```

If `stagedFileCount` stays >0 for more than a few minutes, the NFS mount may be having issues.

### Checking logs

```bash
# Follow worker logs in real time
docker logs -f lovamap-gw-backend-1 2>&1 | grep MeshTransferWorker

# Check cycle summaries only
docker logs lovamap-gw-backend-1 2>&1 | grep "cycle complete"
```

## Local Testing

Both `DomainStaging` and `OutputPaths:Domains` point to local directories in development. The full pipeline (stage → copy → verify → cleanup) runs, just without the flaky NFS mount.

To simulate mount failures: point `OutputPaths:Domains` to a read-only directory.

## Failure Modes

| Scenario | Behavior |
|---|---|
| NFS mount completely down | Files accumulate in staging. Worker backs off to 60s after 3 failed cycles. Meshes served from staging. |
| NFS mount intermittently failing | Worker succeeds on some files, retries others. Backoff resets on any success. No data loss. |
| App crashes mid-upload | File is in staging volume. On restart, worker picks it up. |
| Container redeployed mid-transfer | Staging files survive (Docker named volume). Worker picks them up on restart. |
| Staging volume full | `SaveGLBToStaging` throws — upload fails cleanly with error. |
| DB has MeshPendingTransfer=true but no staging file | Worker skips (counted in summary). File was likely already transferred or manually moved. |

## Recovery

If the worker appears stuck:

1. Check `GET /api/admin/domains/pending-transfers` for the backlog
2. Check logs: `docker logs lovamap-gw-backend-1 2>&1 | grep "cycle complete"`
3. Verify NFS mount is writable from the host: `touch /srv/lovamap-shared-data/lovamap-gw/production/Domains/test && rm /srv/lovamap-shared-data/lovamap-gw/production/Domains/test`
4. If the mount recovers, the worker will automatically transfer the backlog — no intervention needed
5. If staging files were lost (e.g. `docker volume rm`), clear the orphaned flags and re-upload:
   ```sql
   -- Check how many are stuck
   SELECT COUNT(*) FROM "Domains" WHERE "MeshPendingTransfer" = true;

   -- Clear flags for domains whose staging files are gone
   UPDATE "Domains" SET "MeshPendingTransfer" = false WHERE "MeshPendingTransfer" = true;
   ```

## Database

Column `MeshPendingTransfer` (bool, default false) on the `Domains` table. Added via EF migration `AddMeshPendingTransfer`.
