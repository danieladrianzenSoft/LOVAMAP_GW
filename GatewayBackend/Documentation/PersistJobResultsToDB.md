# Plan: Persist Job Results (Descriptors) to Database on Upload

## Context

When `lovamap_core` finishes a job, it calls `PUT /api/jobs/{jobId}/upload` with a `resultPath` pointing to the JSON result file on the shared drive. Currently, `UploadJobResultAsync` stores only the file path in the `Job.ResultFilePath` column. This plan adds the step of reading the result file, deserializing its descriptor data, creating a new `Scaffold` inside the job's `ScaffoldGroup`, and persisting descriptors to the database.

## The Full Flow

```
User submits job (with ScaffoldGroupId)
  → Job created in DB (ScaffoldGroupId stored on Job)
  → File sent to lovamap_core
  → Core processes, saves result JSON to shared drive
  → Core calls PUT /api/jobs/{jobId}/upload with { resultPath, sha256 }
  → GW receives callback:
      1. Stores resultPath on Job, marks Completed
      2. Reads result JSON from resultPath
      3. Creates a new Scaffold in the existing ScaffoldGroup
      4. Maps descriptors from JSON → GlobalDescriptor, PoreDescriptor, OtherDescriptor
      5. Attaches descriptors to the new Scaffold and the Job
      6. Saves everything to DB
      7. Sets Job.ScaffoldId to the new Scaffold's ID
```

This mirrors the existing `CreateScaffoldGroups` flow in `ScaffoldGroupService`, except instead of creating a new group, it adds a scaffold to an existing one.

## Expected JSON Result Format

The result file written by `lovamap_core` is a JSON object containing three descriptor arrays corresponding to a single scaffold analysis:

```json
{
  "globalDescriptors": [
    { "name": "Porosity", "value": 0.65 },
    { "name": "Surface Area", "value": 123.4 },
    { "name": "Pore Volume", "value": 0.87 }
  ],
  "poreDescriptors": [
    {
      "name": "Pore Size Distribution",
      "values": [1.2, 3.4, 5.6, 7.8]
    },
    {
      "name": "Pore Volumes",
      "values": [
        { "id": "pore1", "value": 0.5 },
        { "id": "pore2", "value": 0.3 }
      ]
    }
  ],
  "otherDescriptors": [
    {
      "name": "Chord Length Distribution",
      "values": [0.1, 0.2, 0.3]
    }
  ]
}
```

> **IMPORTANT:** Verify this structure against actual `lovamap_core` output before implementing. The field names (`globalDescriptors`, `poreDescriptors`, `otherDescriptors`) and their shapes must match exactly. If core uses different top-level keys (e.g. `global_descriptors`), adjust the DTO accordingly. The `name` fields must match existing `DescriptorType.Name` values in the database.

## Existing Infrastructure to Reuse

These already exist and should be reused — do NOT recreate them:

| Component | Location | Purpose |
|---|---|---|
| `GlobalDescriptorToCreateDto` | `Infrastructure/DTOs/GlobalDescriptorToCreateDto.cs` | `{ Name: string, Value: double }` |
| `PoreDescriptorToCreateDto` | `Infrastructure/DTOs/PoreDescriptorToCreateDto.cs` | `{ Name: string, Values: JsonDocument }` |
| `OtherDescriptorToCreateDto` | `Infrastructure/DTOs/OtherDescriptorToCreateDto.cs` | `{ Name: string, Values: JsonDocument }` |
| `ScaffoldToCreateDto` | `Infrastructure/DTOs/ScaffoldToCreateDto.cs` | Contains collections of the three descriptor DTOs above |
| `ModelMapper.MapToScaffold()` | `Services/Services/ModelMapper.cs:97` | Creates `Scaffold` entity with descriptors from `ScaffoldToCreateDto` |
| `ModelMapper.MapToGlobalDescriptor()` | `Services/Services/ModelMapper.cs:254` | Looks up `DescriptorType` by name, assigns value by DataType |
| `ModelMapper.MapToPoreDescriptor()` | `Services/Services/ModelMapper.cs:292` | Looks up `DescriptorType` by name, assigns `JsonDocument` values |
| `ModelMapper.MapToOtherDescriptor()` | `Services/Services/ModelMapper.cs:316` | Same as Pore |
| `Job.GlobalDescriptors` | `Data/Models/Job.cs:26` | Navigation collection on Job entity |
| `Job.PoreDescriptors` | `Data/Models/Job.cs:27` | Navigation collection on Job entity |
| `Job.OtherDescriptors` | `Data/Models/Job.cs:28` | Navigation collection on Job entity |
| `Job.ScaffoldId` | `Data/Models/Job.cs:10` | FK to Scaffold (nullable, set during result persistence) |
| `JobSubmissionDto.ScaffoldGroupId` | `Infrastructure/DTOs/JobSubmissionDto.cs:17` | Already provided by the user at submission |

## Changes

### Step 1: Add `ScaffoldGroupId` to the Job model

**File:** `GatewayBackend/Data/Models/Job.cs`

The user already provides `ScaffoldGroupId` at submission time via `JobSubmissionDto`, but it's not stored on the `Job` entity. Add it so it's available when results arrive:

```csharp
public int? ScaffoldGroupId { get; set; }
public ScaffoldGroup? ScaffoldGroup { get; set; }
```

Then update `ModelMapper.MapToJob(JobSubmissionDto)` at `Services/Services/ModelMapper.cs:600`:

```csharp
public Job MapToJob(JobSubmissionDto dto)
{
    return new Job
    {
        Id = dto.JobId ?? Guid.NewGuid(),
        CreatorId = dto.CreatorId,
        ScaffoldGroupId = dto.ScaffoldGroupId,   // <-- ADD THIS
        SubmittedAt = DateTime.UtcNow
    };
}
```

**After adding the property**, create an EF migration:

```bash
cd GatewayBackend
dotnet ef migrations add AddScaffoldGroupIdToJob --project Data --startup-project API
```

### Step 2: Create a DTO for the result file structure

**Create:** `GatewayBackend/Infrastructure/DTOs/JobResultDto.cs`

```csharp
using System.Text.Json.Serialization;

namespace Infrastructure.DTOs
{
    public class JobResultDto
    {
        [JsonPropertyName("globalDescriptors")]
        public List<GlobalDescriptorToCreateDto> GlobalDescriptors { get; set; } = [];

        [JsonPropertyName("poreDescriptors")]
        public List<PoreDescriptorToCreateDto> PoreDescriptors { get; set; } = [];

        [JsonPropertyName("otherDescriptors")]
        public List<OtherDescriptorToCreateDto> OtherDescriptors { get; set; } = [];
    }
}
```

> Adjust `[JsonPropertyName]` attributes to match the actual keys in core's JSON output.

### Step 3: Add `PersistDescriptorsFromResultFileAsync` method

**File:** `GatewayBackend/Services/Services/LovamapCoreJobService.cs`

This method reads the result file, creates a new `Scaffold` in the job's `ScaffoldGroup`, maps all descriptors, and saves everything. It reuses the existing `ModelMapper.MapToScaffold()` flow.

```csharp
private async Task<(bool Succeeded, string? ErrorMessage)> PersistDescriptorsFromResultFileAsync(
    Job job,
    string resultFilePath)
{
    // ──────────────────────────────────────────────
    // 1. Validate: we need a ScaffoldGroupId to attach the new scaffold
    // ──────────────────────────────────────────────
    if (job.ScaffoldGroupId is null or 0)
    {
        _logger.LogWarning("Job {JobId} has no ScaffoldGroupId; cannot persist descriptors", job.Id);
        return (false, "Job has no associated ScaffoldGroup");
    }

    // ──────────────────────────────────────────────
    // 2. Read and deserialize the result JSON
    // ──────────────────────────────────────────────
    byte[] fileBytes;
    try
    {
        fileBytes = await File.ReadAllBytesAsync(resultFilePath);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Could not read result file at {Path} for job {JobId}", resultFilePath, job.Id);
        return (false, "Could not read result file from disk");
    }

    JobResultDto? result;
    try
    {
        result = JsonSerializer.Deserialize<JobResultDto>(fileBytes, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to deserialize result JSON for job {JobId}", job.Id);
        return (false, "Result file is not valid JSON");
    }

    if (result is null)
        return (false, "Result file deserialized to null");

    // ──────────────────────────────────────────────
    // 3. Build a ScaffoldToCreateDto from the result — this reuses the
    //    exact same DTO shape that CreateScaffoldGroups / batch upload uses
    // ──────────────────────────────────────────────
    var scaffoldDto = new ScaffoldToCreateDto
    {
        GlobalDescriptors = result.GlobalDescriptors,
        PoreDescriptors  = result.PoreDescriptors,
        OtherDescriptors = result.OtherDescriptors
    };

    // ──────────────────────────────────────────────
    // 4. Determine the replicate number for the new scaffold
    //    (next number in the group, or 1 if it's the first)
    // ──────────────────────────────────────────────
    var existingScaffoldCount = await _context.Scaffolds
        .CountAsync(s => s.ScaffoldGroupId == job.ScaffoldGroupId.Value);
    var replicateNumber = existingScaffoldCount + 1;

    // ──────────────────────────────────────────────
    // 5. Map to a Scaffold entity using the existing ModelMapper
    //    This internally calls MapToGlobalDescriptor, MapToPoreDescriptor,
    //    MapToOtherDescriptor — which look up DescriptorType by name.
    //    Wrap in try/catch so unknown descriptor names don't crash the upload.
    // ──────────────────────────────────────────────
    Scaffold scaffold;
    try
    {
        scaffold = await _modelMapper.MapToScaffold(scaffoldDto, replicateNumber);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to map descriptors for job {JobId}", job.Id);
        return (false, $"Descriptor mapping failed: {ex.Message}");
    }

    // ──────────────────────────────────────────────
    // 6. Attach the scaffold to the existing ScaffoldGroup
    // ──────────────────────────────────────────────
    scaffold.ScaffoldGroupId = job.ScaffoldGroupId.Value;

    // Set JobId on every descriptor so they're also linked to the job
    foreach (var gd in scaffold.GlobalDescriptors) gd.JobId = job.Id;
    foreach (var pd in scaffold.PoreDescriptors)   pd.JobId = job.Id;
    foreach (var od in scaffold.OtherDescriptors)  od.JobId = job.Id;

    _context.Scaffolds.Add(scaffold);

    // ──────────────────────────────────────────────
    // 7. Save so the scaffold gets an ID, then link it to the job
    // ──────────────────────────────────────────────
    await _context.SaveChangesAsync();

    job.ScaffoldId = scaffold.Id;
    job.Scaffold = scaffold;
    await _context.SaveChangesAsync();

    _logger.LogInformation(
        "Created Scaffold {ScaffoldId} (replicate #{Replicate}) in ScaffoldGroup {GroupId} "
        + "with {G} global, {P} pore, {O} other descriptors for job {JobId}",
        scaffold.Id,
        replicateNumber,
        job.ScaffoldGroupId,
        scaffoldDto.GlobalDescriptors.Count,
        scaffoldDto.PoreDescriptors.Count,
        scaffoldDto.OtherDescriptors.Count,
        job.Id);

    return (true, null);
}
```

### Step 4: Update `UploadJobResultAsync` to call it

**File:** `GatewayBackend/Services/Services/LovamapCoreJobService.cs`

Replace the current `UploadJobResultAsync` with:

```csharp
public async Task<(bool Succeeded, string? ErrorMessage)> UploadJobResultAsync(
    Guid jobId,
    string resultFilePath,
    string? sha256)
{
    try
    {
        // 1. Mark job completed and store the result file path
        var (markSucceeded, markError, job) =
            await MarkJobCompletedAsync(jobId, resultFilePath, sha256 ?? "");

        if (!markSucceeded || job is null)
            return (false, markError);

        // 2. Resolve path (may be absolute from shared drive, or relative)
        var fullPath = Path.IsPathRooted(resultFilePath)
            ? resultFilePath
            : Path.GetFullPath(Path.Combine(GetJobResultsDir(), resultFilePath));

        // 3. Persist descriptors: read file → create scaffold → save descriptors
        if (File.Exists(fullPath))
        {
            var (persistSucceeded, persistError) =
                await PersistDescriptorsFromResultFileAsync(job, fullPath);

            if (!persistSucceeded)
            {
                // Log but don't fail the upload. The resultPath is already stored,
                // so the raw JSON remains accessible. Descriptors can be
                // re-ingested later via the admin re-ingest endpoint.
                _logger.LogWarning(
                    "Job {JobId} completed but descriptor persistence failed: {Error}",
                    jobId, persistError);
            }
        }
        else
        {
            _logger.LogWarning(
                "Result file not found at {Path} for job {JobId}; skipping descriptor persistence. "
                + "Use the re-ingest endpoint once the file is accessible.",
                fullPath, jobId);
        }

        return (true, null);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error storing result for job {JobId}", jobId);
        return (false, "Internal error while storing job result");
    }
}
```

### Step 5: Handle DescriptorType lookup failures gracefully

The existing `ModelMapper.MapToGlobalDescriptor()` throws `ArgumentException` if the `DescriptorType` name isn't found in the DB. If you want partial results saved (skip unknown descriptors rather than failing the whole scaffold), you have two options:

**Option A (recommended for now):** Wrap the `MapToScaffold` call in a try/catch (already done in Step 3). If *any* descriptor name is unknown, the entire persistence fails and gets logged. The raw JSON is still accessible via `ResultFilePath`. This is the safest approach — you either get all descriptors or none.

**Option B (future improvement):** Modify `PersistDescriptorsFromResultFileAsync` to map descriptors individually with per-descriptor try/catch, skipping unknown ones. This requires not using `MapToScaffold()` directly, but instead building the scaffold manually:

```csharp
var scaffold = new Scaffold
{
    ScaffoldGroupId = job.ScaffoldGroupId.Value,
    ReplicateNumber = replicateNumber,
    GlobalDescriptors = new List<GlobalDescriptor>(),
    PoreDescriptors = new List<PoreDescriptor>(),
    OtherDescriptors = new List<OtherDescriptor>(),
};

foreach (var gd in result.GlobalDescriptors)
{
    try
    {
        var entity = await _modelMapper.MapToGlobalDescriptor(gd);
        entity.JobId = job.Id;
        scaffold.GlobalDescriptors.Add(entity);
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning("Skipping unknown global descriptor '{Name}' for job {JobId}: {Msg}",
            gd.Name, job.Id, ex.Message);
    }
}
// ... same for pore and other ...
```

### Step 6 (Optional): Add a re-ingest endpoint

For cases where descriptor persistence failed (file not on disk at upload time, DescriptorType was missing, etc.), add an admin endpoint to re-trigger persistence:

**File:** `GatewayBackend/API/Controllers/DebugController.cs`

```csharp
[HttpPost("jobs/{jobId}/reingest-descriptors")]
public async Task<IActionResult> ReingestDescriptors(string jobId)
{
    // Call a public version of PersistDescriptorsFromResultFileAsync
    // This allows manual recovery without re-running the job on core.
}
```

This requires extracting `PersistDescriptorsFromResultFileAsync` into a public method (or adding a `ReingestDescriptorsAsync` method to `ILovamapCoreJobService`).

## Files Changed (Summary)

| Action | File |
|---|---|
| **Modify** | `Data/Models/Job.cs` — add `ScaffoldGroupId` + `ScaffoldGroup` navigation property |
| **Create migration** | `dotnet ef migrations add AddScaffoldGroupIdToJob --project Data --startup-project API` |
| **Modify** | `Services/Services/ModelMapper.cs` — set `ScaffoldGroupId` in `MapToJob(JobSubmissionDto)` |
| **Create** | `Infrastructure/DTOs/JobResultDto.cs` |
| **Modify** | `Services/Services/LovamapCoreJobService.cs` — add `PersistDescriptorsFromResultFileAsync`, update `UploadJobResultAsync` |
| **Modify** | `Services/IServices/ILovamapCoreJobService.cs` — add `ReingestDescriptorsAsync` if Step 6 is included |
| **Modify** | `API/Controllers/DebugController.cs` — add re-ingest endpoint if Step 6 is included |

## Verification

1. `dotnet build` — no compilation errors
2. `dotnet ef migrations` applied cleanly (new `ScaffoldGroupId` column on `Jobs` table)
3. Submit a job with a `ScaffoldGroupId`, let core complete it, confirm:
   - `Job.ResultFilePath` is stored
   - A new `Scaffold` exists in the specified `ScaffoldGroup`
   - `Job.ScaffoldId` points to that new scaffold
   - `GlobalDescriptors`, `PoreDescriptors`, `OtherDescriptors` rows exist linked to both the scaffold and the job
4. Test with a missing descriptor type name — confirm it logs a warning and the upload still succeeds (path stored), even if descriptors fail
5. If Step 6 is implemented: call re-ingest on a completed job and confirm descriptors are created retroactively
