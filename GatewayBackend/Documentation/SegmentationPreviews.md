# Segmentation Preview Images

## Problem

Segmentation jobs process large TIFF microscopy images that can take minutes to hours. Users had no visual feedback to verify their input was correct or troubleshoot issues until the job completed or failed.

## Architecture

### Core API (upstream, already implemented)

Lovamap-core generates 3 Z-slice preview PNGs (at 25%, 50%, 75% depth) plus a metadata JSON (`preview_info.json`) **before** running full segmentation. These are available once the job enters `Running` state.

- `GET /jobs/{jobId}/previews` → `{ jobId, files: ["input_slice_25.png", "input_slice_50.png", "input_slice_75.png", "preview_info.json"] }`
- `GET /jobs/{jobId}/previews/{filename}` → binary file (PNG or JSON)

### Gateway proxy

The Gateway proxies these two endpoints through to the frontend with standard auth/ownership checks.

```
Frontend  →  Gateway API  →  Core API
GET /api/jobs/{id}/previews          → GET /jobs/{id}/previews
GET /api/jobs/{id}/previews/{file}   → GET /jobs/{id}/previews/{file}
```

### Frontend display

The job detail page automatically fetches previews when a segmentation job is in `Running`, `Completed`, or `Failed` state. It displays:

- 3 Z-slice thumbnail images side by side with their Z-index labels
- Resolved voxel dimensions and their sources from `preview_info.json`
- Graceful handling when previews aren't available (old jobs, non-segmentation jobs)

## Files Modified

| Layer | File | Change |
|-------|------|--------|
| Backend | `Infrastructure/IHelpers/ICoreApiClient.cs` | +2 interface methods |
| Backend | `Infrastructure/Helpers/CoreApiClient.cs` | +2 HTTP client methods |
| Backend | `Services/IServices/ILovamapCoreJobService.cs` | +2 service interface methods |
| Backend | `Services/Services/LovamapCoreJobService.cs` | +2 service implementations |
| Backend | `API/Controllers/JobsController.cs` | +2 controller endpoints |
| Frontend | `app/api/agent.ts` | +2 API calls (`getPreviewList`, `getPreviewFile`) |
| Frontend | `app/models/job.ts` | +1 `PreviewInfo` interface |
| Frontend | `app/stores/jobStore.ts` | +2 store methods |
| Frontend | `features/jobs/job-detail.tsx` | +preview section UI |

## Preview Info Schema

```json
{
  "filename": "input.tif",
  "dimensions": { "x": 512, "y": 512, "z": 200 },
  "voxel_size": { "dx": 0.5, "dy": 0.5, "dz": 1.0 },
  "voxel_size_sources": { "dx": "user", "dy": "user", "dz": "tif_metadata" },
  "slices": [
    { "name": "input_slice_25.png", "z_index": 50 },
    { "name": "input_slice_50.png", "z_index": 100 },
    { "name": "input_slice_75.png", "z_index": 150 }
  ]
}
```

## Security

- Both Gateway endpoints require authentication and verify job ownership (creator or admin)
- The filename endpoint validates against path traversal (`/`, `\`, `..` are rejected)

## Edge Cases

- **Old jobs without previews:** Core returns 404 → Gateway returns 404 → frontend shows nothing (no error)
- **Non-segmentation jobs:** Preview section is not rendered at all
- **Previews fetched once:** A ref guard prevents re-fetching on re-renders
- **Object URL cleanup:** Preview blob URLs are revoked on component unmount
