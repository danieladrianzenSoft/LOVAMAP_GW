# Knowledge Base — Admin Operations

## Overview

The KnowledgeBaseBackend serves RDF data from Apache Jena Fuseki with a Lucene full-text index. Data is loaded from embedded TTL files at startup via `DataSeeder`, which uses SHA256 hash-based change detection to avoid unnecessary reseeds.

## Data Seeding

### How It Works

1. On startup, `DataSeeder` computes a SHA256 hash of all `.ttl` files in `KnowledgeBaseBackend/Data/SeedData/`
2. Compares it to the hash stored in Fuseki (`urn:lovamap:seed`)
3. If different: runs `DROP ALL`, uploads each TTL file, stores the new hash, and invalidates the application cache
4. If same: skips (logs "up to date")

### Adding New TTL Files

Drop v2-schema TTL files (from `literature_ai`) into `KnowledgeBaseBackend/Data/SeedData/` and redeploy. The `.csproj` includes `<EmbeddedResource Include="Data/SeedData/*.ttl" />`, so new files are automatically embedded in the build. The hash will change, triggering a reseed.

### Force Reseed (No Code Change)

If you need to reseed without changing any TTL files (e.g., Fuseki data got corrupted):

```bash
curl -X POST http://localhost:5002/api/admin/reseed
```

This bypasses the hash check and does a full `DROP ALL` + re-upload.

## Fuseki Text Index

### Indexed Fields

The Lucene text index is configured in `fuseki/configuration/lovamap-rdf.ttl`. Currently indexed fields:

| Field | Predicate |
|-------|-----------|
| `label` | `rdfs:label` |
| `title` | `dc:title` |
| `name` | `foaf:name` |
| `familyName` | `foaf:familyName` |
| `givenName` | `foaf:givenName` |
| `measurementType` | `lova:measurementType` |
| `experimentType` | `lova:experimentType` |
| `chemistry` | `lova:chemistry` |
| `manufacturingMethod` | `lova:manufacturingMethod` |
| `cellType` | `lova:cellType` |
| `particleMaterial` | `lova:particleMaterial` |
| `focusMaterial` | `lova:focusMaterial` |
| `assayOrMethod` | `lova:assayOrMethod` |
| `reagentRole` | `lova:reagentRole` |
| `reagentFunction` | `lova:reagentFunction` |
| `direction` | `lova:direction` |

### When to Reindex

A full Lucene reindex is needed when:

- **You add or remove fields** in `lovamap-rdf.ttl`'s `text:map` — the existing Lucene index on disk won't pick up schema changes automatically
- **Search results seem stale or incomplete** — the index may have gotten out of sync
- **Fuseki was restored from a TDB2-only backup** without the Lucene directory

A reindex is **not** needed for:
- Adding new TTL data files (the normal reseed flow handles this)
- Changing SPARQL queries or DTOs in the backend code

### Reindex Script

```bash
./scripts/reindex-fuseki.sh                          # local (assumes kb-backend on localhost:5002)
./scripts/reindex-fuseki.sh https://kb.lovamap.com   # production
```

What it does:
1. Clears the Lucene index directory inside the `lovamap_fuseki` container
2. Restarts Fuseki (rebuilds an empty index with the current schema from `lovamap-rdf.ttl`)
3. Triggers `POST /api/admin/reseed` on the kb-backend to re-upload all TTL data and populate the new index

### Adding a New Indexed Field

1. Add the field to `fuseki/configuration/lovamap-rdf.ttl`:
   ```ttl
   [ text:field "myNewField" ; text:predicate lova:myNewField ]
   ```
2. Add the field to the `BuildSystemPrompt()` indexed fields section in `QueryService.cs` so the LLM knows about it
3. Redeploy and run `./scripts/reindex-fuseki.sh`

## API Endpoints (Admin)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/reseed` | Force full reseed (DROP ALL + re-upload TTL files) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/graph/summary` | Ontology summary (classes, properties, instance counts) |

## Docker

Fuseki runs as the `lovamap_fuseki` container (image: `stain/jena-fuseki`).

| Path (in container) | Purpose |
|---------------------|---------|
| `/fuseki/databases/lovamap-rdf` | TDB2 data store |
| `/fuseki/databases/lovamap-rdf-lucene` | Lucene text index |
| `/fuseki/configuration/lovamap-rdf.ttl` | Dataset + text index config (mounted read-only) |

The data is persisted in the `lovamap_gw_fuseki_data` Docker volume.
