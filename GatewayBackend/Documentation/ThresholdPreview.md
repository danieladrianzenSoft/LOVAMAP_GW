# Threshold Preview — Frontend Integration Guide

> **Status: DEACTIVATED.** The interactive threshold preview flow described in this
> document is fully implemented but currently disabled. Segmentation jobs use
> **Otsu auto-threshold** instead — when `--th` is omitted, the container
> automatically computes the optimal threshold via Otsu's method on the normalized
> volume. No user interaction is required.
>
> To re-enable the threshold preview flow, see the "Re-enabling" section at the
> bottom of this document.

## Current Behavior (Otsu Auto-Threshold)

When a segmentation job is submitted **without** `Th`, the container automatically
computes the intensity threshold using Otsu's method after loading and normalizing
the image. The job runs straight through without pausing:

```
+--------+     +----------+     +----------+     +-----------+
| Pending| --> | Running  | --> | Running  | --> | Completed |
+--------+     +----------+     +----------+     +-----------+
                 (preview)       (full seg
                                  w/ Otsu th)
```

The user can still override by passing `Th` in the submission form — in that case
the explicit value is used instead of Otsu.

### Submit Segmentation Job

```
POST /api/jobs/submit-segmentation-job
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `TifFile` | file | Yes | The microscopy image (.tif/.tiff) |
| `FluorescentLabel` | string | Yes | `"0"` or `"1"` |
| `RadiusUm` | string | Yes | Expected bead radius in um |
| `Dx` | string | No | Pixel width (um). Auto-detected from TIF metadata if omitted. |
| `Dy` | string | No | Pixel height (um). Auto-detected if omitted. |
| `Dz` | string | No | Z-spacing (um). Often missing from metadata — provide when possible. |
| `Resolution` | string | No | `"normal"` (default) or `"high"` |
| `Th` | string | No | Intensity threshold override. If omitted, auto-computed via Otsu's method. |

### Timing Expectations

| Phase | Duration | Notes |
|-------|----------|-------|
| Upload + preview generation | 3-10 seconds | Reads only 3 raw TIF pages, no full stack load |
| Full segmentation (Otsu auto) | 15s - 30min+ | Depends on image size and resolution preset |

### Progress Reporting (Heartbeat)

Segmentation jobs report pipeline progress via the same heartbeat mechanism used by lovamap-cpp jobs. During the full segmentation phase, the container sends stage messages to the WrapperApi's `/heartbeat` endpoint.

#### Segmentation Stage Messages

The container reports these stages in order:

| Stage | Message |
|-------|---------|
| 1 | `Thresholding...` |
| 2 | `Distance transform...` |
| 3 | `Finding seeds...` |
| 4 | `Initial watershed...` |
| 5 | `Refining seeds...` |
| 6 | `Second watershed...` |
| 7 | `Watershed refinement...` |
| 8 | `Smoothing...` |
| 9 | `Converting to JSON...` |

#### Where Heartbeat Data Lives

```
Segmentation container
    |
    |  POST /heartbeat (form: jobId=123&desc=Thresholding...)
    v
WrapperApi HeartbeatCache (in-memory)
    |
    |  HeartbeatFlusherService (periodic flush)
    v
WrapperApi DB: Job.HeartbeatMessage, Job.HeartbeatPostedAt
    |
    |  GET /jobs/by-jobid/{id} (returns full Job entity)
    v
GW CoreJobDto  <-- does NOT currently include HeartbeatMessage
```

#### Current Limitation

The heartbeat messages are stored in WrapperApi's database on the `Job` record (`HeartbeatMessage` and `HeartbeatPostedAt` fields), but are **not currently surfaced to the Gateway or frontend**. The GW's `CoreJobDto` does not deserialize these fields, and `JobToReturnDto` does not include them.

#### To Surface Progress to the Frontend

To display real-time progress during segmentation, the following changes are needed:

1. **`CoreJobDto`** — add fields:
   ```csharp
   public string? HeartbeatMessage { get; set; }
   public DateTime? HeartbeatPostedAt { get; set; }
   ```

2. **`JobToReturnDto`** — add fields:
   ```csharp
   public string? HeartbeatMessage { get; set; }
   public DateTime? HeartbeatPostedAt { get; set; }
   ```

3. **`ModelMapper.MapToJobToReturnDto()`** — map the fields:
   ```csharp
   HeartbeatMessage = job.FinalHeartbeatMessage,
   ```

4. **`SyncJobStatusAsync()`** — copy heartbeat data from Core during polling:
   ```csharp
   if (coreJob.HeartbeatMessage != null)
   {
       job.FinalHeartbeatMessage = coreJob.HeartbeatMessage;
   }
   ```

5. **SignalR** — the existing `JobStatusUpdated` event already sends the full `JobToReturnDto`, so once the fields are added, heartbeat messages will be pushed to the frontend on every 3-second poll cycle.

6. **Frontend** — display `heartbeatMessage` when the job is in `Running` status:
   ```javascript
   // In job detail component
   if (job.status === 'Running' && job.heartbeatMessage) {
     showProgress(job.heartbeatMessage); // e.g. "Distance transform..."
   }
   ```

This is the same pattern that would work for lovamap-cpp jobs too — neither job type currently surfaces heartbeat to the frontend.

---

## Threshold Preview Flow (deactivated)

The following describes the interactive threshold preview flow. It is fully
implemented in the backend but the pause trigger is commented out.

### Overview

Particle segmentation jobs support an interactive **threshold preview** step. When a user uploads a microscopy image without specifying an intensity threshold (`th`), the job pauses after generating preview images and waits for the user to pick a threshold before running the full segmentation pipeline.

This eliminates the trial-and-error loop of submitting jobs with different `--th` values.

## Flow Diagram

```
                        SUBMISSION
                            |
                            v
+-------------------------------------------------------+
|  POST /api/jobs/submit-segmentation-job                |
|  (TifFile, FluorescentLabel, RadiusUm, Dx, Dy, Dz)    |
|  Th is OPTIONAL                                        |
+-------------------------------------------------------+
                            |
              +-------------+-------------+
              |                           |
         Th provided                 Th omitted
              |                           |
              v                           v
+---------------------+   +---------------------------------+
| Job runs preview    |   | Job runs preview + threshold    |
| then segmentation   |   | preview, then PAUSES            |
| (existing flow)     |   |                                 |
+---------------------+   +---------------------------------+
                                          |
                                          v
                              +-----------------------+
                              | Status: AwaitingThreshold
                              | Previews available     |
                              +-----------------------+
                                          |
                                 Frontend fetches
                                 preview_info.json +
                                 threshold images
                                          |
                                          v
                              +-----------------------+
                              | User picks threshold  |
                              | from visual previews  |
                              +-----------------------+
                                          |
                                          v
                              +-----------------------+
                              | POST /api/jobs/{id}/  |
                              |   confirm-threshold   |
                              |   { "th": 150 }       |
                              +-----------------------+
                                          |
                                          v
                              +-----------------------+
                              | Status: Pending ->    |
                              |   Running -> Completed|
                              | (full segmentation)   |
                              +-----------------------+
```

## Detailed Job Lifecycle

```
+--------+     +----------+     +--------------------+     +---------+     +-----------+
| Pending| --> | Running  | --> | AwaitingThreshold  | --> | Pending | --> |  Running   |
+--------+     +----------+     +--------------------+     +---------+     +-----------+
                 (preview)        (paused, previews         (confirmed)     (full seg)
                                   available)                                   |
                                                                                v
                                                                          +-----------+
                                                                          | Completed |
                                                                          +-----------+

If Th was provided at submission, the AwaitingThreshold step is skipped:

+--------+     +----------+     +-----------+
| Pending| --> | Running  | --> | Completed |
+--------+     +----------+     +-----------+
                 (preview +
                  full seg)
```

## New Job Status: `AwaitingThreshold`

A new status string `"AwaitingThreshold"` is returned in the `status` field of `JobToReturnDto`. The frontend should handle this as a distinct, interactive state.

| Status | Meaning |
|--------|---------|
| `Pending` | Queued, not started |
| `Running` | Currently processing (preview or segmentation) |
| `AwaitingThreshold` | Preview complete, waiting for user to pick a threshold |
| `Completed` | Segmentation finished |
| `Failed` | Error (check `errorMessage`) |
| `Stopped` | Cancelled by user |

The `AwaitingThreshold` status is pushed via the existing **SignalR** `JobStatusUpdated` event, so the frontend receives it in real time.

## API Endpoints

### Submit Segmentation Job (updated)

```
POST /api/jobs/submit-segmentation-job
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `TifFile` | file | Yes | The microscopy image (.tif/.tiff) |
| `FluorescentLabel` | string | Yes | `"0"` or `"1"` |
| `RadiusUm` | string | Yes | Expected bead radius in um |
| `Dx` | string | No | Pixel width (um). Auto-detected from TIF metadata if omitted. |
| `Dy` | string | No | Pixel height (um). Auto-detected if omitted. |
| `Dz` | string | No | Z-spacing (um). Often missing from metadata — provide when possible. |
| `Resolution` | string | No | `"normal"` (default) or `"high"` |
| **`Th`** | string | **No (new)** | Intensity threshold. If omitted, the job pauses for threshold preview. |

**Behavior when `Th` is provided:** Job skips the threshold preview pause and runs full segmentation immediately (same as before).

**Behavior when `Th` is omitted:** Job generates threshold preview images, enters `AwaitingThreshold` status, and waits for `confirm-threshold`.

### Confirm Threshold (new)

```
POST /api/jobs/{jobId}/confirm-threshold
Content-Type: application/json
Authorization: Bearer <token>

{
  "th": 150
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "message": "Threshold confirmed",
  "data": {
    "jobId": "abc-123",
    "threshold": 150
  }
}
```

**Error responses:**
- `400` — Job is not in `AwaitingThreshold` status, or invalid `th` value
- `401` — Not authenticated or not the job owner
- `404` — Job not found

After confirmation, the job transitions back to `Pending` and starts full segmentation. The frontend will see `Pending -> Running -> Completed` via SignalR.

### Fetch Preview List (existing, unchanged)

```
GET /api/jobs/{jobId}/previews
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "jobId": "abc-123",
  "files": [
    "input_slice_25.png",
    "input_slice_50.png",
    "input_slice_75.png",
    "threshold_preview_25.png",
    "threshold_preview_50.png",
    "threshold_preview_75.png",
    "preview_info.json"
  ]
}
```

### Fetch Preview File (existing, unchanged)

```
GET /api/jobs/{jobId}/previews/{filename}
Authorization: Bearer <token>
```

Returns the binary file (PNG or JSON).

## Preview Files Reference

When a job enters `AwaitingThreshold`, the following files are available in the previews directory:

```
previews/
+-- input_slice_25.png           Raw input Z-slice at 25% depth
+-- input_slice_50.png           Raw input Z-slice at 50% depth
+-- input_slice_75.png           Raw input Z-slice at 75% depth
+-- threshold_preview_25.png     Threshold comparison composite at 25% depth
+-- threshold_preview_50.png     Threshold comparison composite at 50% depth
+-- threshold_preview_75.png     Threshold comparison composite at 75% depth
+-- preview_info.json            Metadata (dimensions, thresholds, foreground %)
```

### Input Slices (`input_slice_*.png`)

Raw grayscale Z-slices from the uploaded image at 25%, 50%, and 75% depth. These are the same as before — useful for showing the user what their image looks like.

### Threshold Previews (`threshold_preview_*.png`)

Each is a **wide composite image** with multiple panels side by side:

```
+----------+----------+----------+----------+----------+----------+
|          |  th=105  |  th=128  |  th=150  |  th=173  |  th=195  |
|  Raw     |  54.8%   |  25.1%   |  14.4%   |  5.0%    |  1.4%    |
| grayscale| (green   | (green   | (green   | (green   | (green   |
|          |  overlay)|  overlay)|  overlay)|  overlay)|  overlay) |
+----------+----------+----------+----------+----------+----------+
```

- **Left panel:** Raw grayscale slice
- **Remaining panels:** Each shows a green overlay of pixels above that threshold value
- **Labels:** Each panel shows the threshold value and the percentage of foreground pixels

The user picks the threshold where the green overlay best captures their particles — not too much background (high %), not too few particles (low %).

## `preview_info.json` Schema

```json
{
  "filename": "sample.tif",
  "dimensions": { "x": 512, "y": 512, "z": 200 },
  "voxel_size": { "dx": 0.155, "dy": 0.155, "dz": 1.0 },
  "voxel_size_sources": {
    "dx": "tif_metadata",
    "dy": "tif_metadata",
    "dz": "cli"
  },
  "resized_voxel_size": 0.3,
  "estimated_domain_voxels": 48620250,
  "slices": [
    { "name": "input_slice_25.png", "z_index": 50 },
    { "name": "input_slice_50.png", "z_index": 100 },
    { "name": "input_slice_75.png", "z_index": 150 }
  ],
  "threshold_preview": {
    "thresholds": [105, 128, 150, 173, 195],
    "threshold_source": "auto_from_percentiles",
    "slices": [
      {
        "name": "threshold_preview_25.png",
        "z_index": 50,
        "foreground_pcts": [54.8, 25.1, 14.4, 5.0, 1.4]
      },
      {
        "name": "threshold_preview_50.png",
        "z_index": 100,
        "foreground_pcts": [52.3, 23.8, 13.1, 4.5, 1.1]
      },
      {
        "name": "threshold_preview_75.png",
        "z_index": 60,
        "foreground_pcts": [49.1, 22.0, 12.0, 3.9, 0.9]
      }
    ]
  }
}
```

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `threshold_preview` | object or absent | Present only when threshold previews were generated |
| `threshold_preview.thresholds` | int[] | The candidate threshold values used (in ascending order) |
| `threshold_preview.threshold_source` | string | How thresholds were chosen (see below) |
| `threshold_preview.slices[].foreground_pcts` | float[] | % of pixels above each threshold (same order as `thresholds`) |

### `threshold_source` Values

| Value | Meaning |
|-------|---------|
| `"auto_from_th"` | 5 candidates spread around a user-supplied `--th` value |
| `"auto_from_percentiles"` | Derived from intensity percentiles (P70, P80, P88, P93, P97) |
| `"user_specified"` | Exact values from `--threshold-values` |

## Frontend Implementation Guide

### 1. Detecting When to Show the Threshold Picker

When a job's status changes to `"AwaitingThreshold"` (via SignalR or polling), the frontend should:

1. Fetch `GET /api/jobs/{jobId}/previews/preview_info.json`
2. Parse the `threshold_preview` section
3. Display the threshold selection UI

### 2. Displaying Threshold Options

**Recommended approach — show the composite images directly:**

The `threshold_preview_*.png` images are pre-rendered composites that visually compare all candidate thresholds. Display one or more of them (the 50% depth slice is usually the most representative) and let the user pick.

**Alternative — build a custom UI from the data:**

Use `threshold_preview.thresholds` and `threshold_preview.slices[].foreground_pcts` to build an interactive threshold picker:

```
Threshold Selection
-------------------
  105  [============================] 54.8%  Too much
  128  [==============              ] 25.1%
  150  [========                    ] 14.4%  <-- Recommended
  173  [===                         ]  5.0%
  195  [=                           ]  1.4%  Too little
```

The `foreground_pcts` values tell you how much of the image is considered "particle" at each threshold. A good threshold typically produces 10-30% foreground for packed particle images.

### 3. Binary Image Auto-Detection

If the image is already binarized, all threshold values will produce nearly identical foreground percentages. The frontend can detect this and auto-confirm:

```javascript
// Check if image is binary — all thresholds give similar results
const pcts = previewInfo.threshold_preview.slices[1].foreground_pcts; // 50% slice
const range = Math.max(...pcts) - Math.min(...pcts);

if (range < 5.0) {
  // Image is likely binary — auto-confirm with any threshold
  // (the segmentation pipeline handles binary images correctly regardless of th)
  await confirmThreshold(jobId, previewInfo.threshold_preview.thresholds[2]);
}
```

### 4. Submitting the Chosen Threshold

```javascript
const response = await fetch(`/api/jobs/${jobId}/confirm-threshold`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ th: selectedThreshold })
});
```

After confirmation, the job returns to `Pending` and processes through the normal `Running -> Completed` lifecycle.

### 5. Skipping Threshold Preview (Power Users / API)

If the user already knows their threshold (e.g., repeat runs on similar samples), include `Th` in the initial submission:

```javascript
const formData = new FormData();
formData.append('TifFile', file);
formData.append('FluorescentLabel', '1');
formData.append('RadiusUm', '45');
formData.append('Th', '150');  // Skip threshold preview

const response = await fetch('/api/jobs/submit-segmentation-job', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### 6. Cancel During Threshold Selection

Jobs in `AwaitingThreshold` status can be cancelled using the existing cancel endpoint:

```
POST /api/jobs/{jobId}/cancel
```

## Progress Reporting (Heartbeat)

Segmentation jobs now report pipeline progress via the same heartbeat mechanism used by lovamap-cpp jobs. During the full segmentation phase (after threshold confirmation), the container sends stage messages to the WrapperApi's `/heartbeat` endpoint.

### Segmentation Stage Messages

The container reports these stages in order:

| Stage | Message |
|-------|---------|
| 1 | `Thresholding...` |
| 2 | `Distance transform...` |
| 3 | `Finding seeds...` |
| 4 | `Initial watershed...` |
| 5 | `Refining seeds...` |
| 6 | `Second watershed...` |
| 7 | `Watershed refinement...` |
| 8 | `Smoothing...` |
| 9 | `Converting to JSON...` |

### Where Heartbeat Data Lives

```
Segmentation container
    |
    |  POST /heartbeat (form: jobId=123&desc=Thresholding...)
    v
WrapperApi HeartbeatCache (in-memory)
    |
    |  HeartbeatFlusherService (periodic flush)
    v
WrapperApi DB: Job.HeartbeatMessage, Job.HeartbeatPostedAt
    |
    |  GET /jobs/by-jobid/{id} (returns full Job entity)
    v
GW CoreJobDto  <-- does NOT currently include HeartbeatMessage
```

### Current Limitation

The heartbeat messages are stored in WrapperApi's database on the `Job` record (`HeartbeatMessage` and `HeartbeatPostedAt` fields), but are **not currently surfaced to the Gateway or frontend**. The GW's `CoreJobDto` does not deserialize these fields, and `JobToReturnDto` does not include them.

### To Surface Progress to the Frontend

To display real-time progress during segmentation, the following changes are needed:

1. **`CoreJobDto`** — add fields:
   ```csharp
   public string? HeartbeatMessage { get; set; }
   public DateTime? HeartbeatPostedAt { get; set; }
   ```

2. **`JobToReturnDto`** — add fields:
   ```csharp
   public string? HeartbeatMessage { get; set; }
   public DateTime? HeartbeatPostedAt { get; set; }
   ```

3. **`ModelMapper.MapToJobToReturnDto()`** — map the fields:
   ```csharp
   HeartbeatMessage = job.FinalHeartbeatMessage,
   ```

4. **`SyncJobStatusAsync()`** — copy heartbeat data from Core during polling:
   ```csharp
   if (coreJob.HeartbeatMessage != null)
   {
       job.FinalHeartbeatMessage = coreJob.HeartbeatMessage;
   }
   ```

5. **SignalR** — the existing `JobStatusUpdated` event already sends the full `JobToReturnDto`, so once the fields are added, heartbeat messages will be pushed to the frontend on every 3-second poll cycle.

6. **Frontend** — display `heartbeatMessage` when the job is in `Running` status:
   ```javascript
   // In job detail component
   if (job.status === 'Running' && job.heartbeatMessage) {
     showProgress(job.heartbeatMessage); // e.g. "Distance transform..."
   }
   ```

This is the same pattern that would work for lovamap-cpp jobs too — neither job type currently surfaces heartbeat to the frontend.

## Timing Expectations

| Phase | Duration | Notes |
|-------|----------|-------|
| Upload + preview generation | 3-10 seconds | Reads only 3 raw TIF pages, no full stack load |
| User picks threshold | Unlimited | Job waits in `AwaitingThreshold` |
| Full segmentation | 15s - 30min+ | Depends on image size and resolution preset |

The preview step is fast because it reads only 3 individual 2D pages from the TIF file — it never loads the full 3D volume or performs any resizing.

## Sequence Diagram

```
  Frontend                    Gateway API                  WrapperApi (Core)
     |                            |                              |
     |  POST submit-seg-job       |                              |
     |  (no Th)                   |                              |
     |--------------------------->|                              |
     |                            |  POST /jobs (form)           |
     |                            |----------------------------->|
     |                            |                              |
     |                            |  201 Created                 |
     |                            |<-----------------------------|
     |  201 { job }               |                              |
     |<---------------------------|                              |
     |                            |                              |
     |                            |      [WrapperApi runs        |
     |                            |       --preview-only         |
     |                            |       --threshold-preview    |
     |                            |       in Docker container    |
     |                            |       (~3-5 seconds)]        |
     |                            |                              |
     |  SignalR: status=Running   |                              |
     |<~~~~~~~~~~~~~~~~~~~~~~~~~~~|                              |
     |                            |                              |
     |  SignalR: status=          |  GET /jobs/by-jobid/{id}     |
     |    AwaitingThreshold       |----------------------------->|
     |<~~~~~~~~~~~~~~~~~~~~~~~~~~~|  { status: 5 }              |
     |                            |<-----------------------------|
     |                            |                              |
     |  GET previews/             |                              |
     |    preview_info.json       |  GET /jobs/{id}/previews/    |
     |--------------------------->|    preview_info.json          |
     |                            |----------------------------->|
     |  { threshold_preview: {..}}|                              |
     |<---------------------------|<-----------------------------|
     |                            |                              |
     |  GET previews/             |                              |
     |    threshold_preview_50.png|                              |
     |--------------------------->|----------------------------->|
     |  <binary PNG>              |                              |
     |<---------------------------|<-----------------------------|
     |                            |                              |
     |     [User picks th=150]    |                              |
     |                            |                              |
     |  POST confirm-threshold    |  POST /jobs/{id}/            |
     |  { "th": 150 }            |    confirm-threshold          |
     |--------------------------->|  { "th": 150 }               |
     |                            |----------------------------->|
     |  200 OK                    |  200 OK                      |
     |<---------------------------|<-----------------------------|
     |                            |                              |
     |                            |      [WrapperApi re-enqueues |
     |                            |       job, runs full         |
     |                            |       segmentation with      |
     |                            |       --th 150]              |
     |                            |                              |
     |  SignalR: status=Pending   |                              |
     |<~~~~~~~~~~~~~~~~~~~~~~~~~~~|                              |
     |  SignalR: status=Running   |                              |
     |<~~~~~~~~~~~~~~~~~~~~~~~~~~~|                              |
     |  SignalR: status=Completed |                              |
     |<~~~~~~~~~~~~~~~~~~~~~~~~~~~|                              |
     |                            |                              |
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User provides `Th` at submission | Job skips `AwaitingThreshold`, runs full segmentation immediately |
| Non-TIF file (LIF, MAT) | Threshold preview is still generated (falls back to full load for slice extraction) |
| Preview generation fails | Job status = `Failed` with error message (bad input, missing params, etc.) |
| Binary image (all foreground_pcts similar) | Job still enters `AwaitingThreshold` — frontend should auto-detect and auto-confirm |
| Job cancelled while `AwaitingThreshold` | Standard cancel flow, status = `Stopped` |
| Stale `AwaitingThreshold` job (>24h) | Auto-failed by the polling service's stale job timeout |
| `confirm-threshold` on non-AwaitingThreshold job | Returns 400 error |
| Multiple `confirm-threshold` calls | First succeeds, subsequent calls return 400 (job is no longer `AwaitingThreshold`) |

## Migration Notes

- **No database migration required.** The new `AwaitingThreshold` status (enum value 5) is stored as an integer — no schema change needed.
- **Backward compatibility:** Existing jobs (submitted with the old code) are unaffected. The new flow only activates when `Th` is omitted from the submission.
- **Container image:** The particle segmentation container (`ghcr.io/seguralab/3d-particle-segmentation`) must be updated to a version that supports `--threshold-preview`. The `--preview-only` flag already exists; `--threshold-preview` is new.

## Re-enabling the Threshold Preview Flow

To switch from Otsu auto-threshold back to interactive threshold selection:

1. **WrapperApi `JobService.cs` — `RunPreviewGenerationAsync`:** Add `"--threshold-preview"` back to the `entrypointArgs` list (marked with a comment).

2. **WrapperApi `JobService.cs` — `RunJobAsync`:** Uncomment the `AwaitingThreshold` pause block (marked with a comment).

3. **Frontend:** Implement the `AwaitingThreshold` status handling as described in the "Frontend Implementation Guide" section above.

All other infrastructure (the `AwaitingThreshold` enum value, the `POST /jobs/{jobId}/confirm-threshold` endpoints on both WrapperApi and GW, the `ConfirmThresholdAsync` service methods, the `ConfirmThresholdDto`) is already in place and functional.
