# Admin Batch Mesh Replace

## Scope

This utility replaces **mesh files (.glb) and their accompanying metadata JSON only**. It does NOT modify descriptors, scaffold records, scaffold groups, jobs, or any other database entities. The only DB columns it writes to are `Domain.MeshFilePath`, `Domain.Metadata`, and `Domain.CreatedAt`.

## Endpoint

```
POST /api/admin/domains/batch-replace
```

Requires `administrator` role (JWT).

### Request Body

```json
{
  "sourcePath": "/path/to/staging/directory",
  "dryRun": true
}
```

- `sourcePath` (required): Absolute path to the directory containing new `.glb` files on the server
- `dryRun` (optional, default `true`): When `true`, previews matches without making changes

### Response

```json
{
  "statusCode": 200,
  "succeeded": true,
  "message": "Batch replace completed",
  "data": {
    "dryRun": true,
    "totalFilesScanned": 10,
    "matchedCount": 8,
    "unmatchedCount": 2,
    "succeededCount": 0,
    "failedCount": 0,
    "matched": [
      {
        "fileName": "beadInfo_spheres_normal_dist_100,04_08.glb",
        "domainId": 42,
        "scaffoldId": 15,
        "category": "Particles",
        "matchedOriginalFileName": "beadInfo_spheres_normal_dist_100,04_08.glb",
        "hasMetadataFile": true,
        "replaced": false
      }
    ],
    "unmatchedFiles": ["unknown_file.glb"],
    "errors": []
  }
}
```

## File Naming Conventions

### Mesh Files

- Particle meshes: `beadInfo_spheres_normal_dist_100,04_08.glb` (exact match on `OriginalFileName` in DB)
- Pore meshes: `labeledDomain_foo.glb` (matches DB `OriginalFileName` after stripping `@timestamp`, e.g. `labeledDomain_foo@20250524T124745.glb`)

### Metadata Files

For a mesh file named `foo.glb`, its companion metadata file should be named `foo_metadata.json` in the same directory.

## Matching Logic

1. All `.glb` files in `sourcePath` are scanned
2. All domains in the database with a non-null `MeshFilePath` and `OriginalFileName` are loaded
3. The `@timestamp` suffix (if any) is stripped from both incoming filenames and DB `OriginalFileName` values
4. Case-insensitive comparison determines matches
5. `OriginalFileName` in the DB is NOT updated during replacement (preserves matching identity for re-runs)

## Step-by-Step Workflow

### Step 1: Generate new mesh files locally

Generate the new `.glb` files (and optional `_metadata.json` files) on your local machine. Place them all in a single directory.

### Step 2: Transfer files to the server staging directory

From your local machine, rsync the files into a temporary `scratch_batch_replace` directory on the server's shared mounted drive:

```bash
rsync -av --progress ./path/to/local/meshes/ dra20@lovamap-01.oit.duke.edu:/srv/lovamap-shared-data/lovamap-gw/production/scratch_batch_replace/
```

This creates the directory if it doesn't exist and copies all files into it.

### Step 3: Dry run — preview matches

Call the endpoint with `dryRun: true` (the default) to see which files match existing domains without making any changes:

```bash
curl -X POST https://lovamap.com/api/admin/domains/batch-replace \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourcePath": "/srv/lovamap-shared-data/lovamap-gw/production/scratch_batch_replace", "dryRun": true}'
```

Review the response. Check that `matchedCount` is what you expect and `unmatchedFiles` only contains files you don't care about. No files or DB records are modified during a dry run.

### Step 4: Execute the replacement

Once satisfied with the dry run, run again with `dryRun: false`:

```bash
curl -X POST https://lovamap.com/api/admin/domains/batch-replace \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sourcePath": "/srv/lovamap-shared-data/lovamap-gw/production/scratch_batch_replace", "dryRun": false}'
```

Check that `succeededCount` matches `matchedCount` and `errors` is empty. Verify frontend visualization still works for the replaced domains.

### Step 5: Clean up the staging directory

Once everything is confirmed working, delete the staging directory from the server:

```bash
ssh dra20@lovamap-01.oit.duke.edu "rm -rf /srv/lovamap-shared-data/lovamap-gw/production/scratch_batch_replace"
```

## Server Path Reference

```
/srv/lovamap-shared-data/lovamap-gw/production/
├── Domains/          ← where the app stores domain mesh files ({scaffoldId}_{guid}.glb)
├── JobResults/
└── scratch_batch_replace/   ← temporary staging dir (you create & delete this)
```
