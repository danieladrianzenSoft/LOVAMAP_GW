# RDF Integration (Fuseki) - LOVAMAP

This document describes the current RDF integration in `LOVAMAP_GW`, how it is structured, and how to use it safely as the system grows.

## High-Level Architecture

Layering follows the existing pattern (API -> Services -> Repositories -> Infrastructure):

- `GatewayBackend/API`
  - Controllers expose HTTP endpoints.
  - `RDFTestController` is the current test surface (query, create, update, delete).
- `GatewayBackend/Services`
  - Orchestrates business logic and composes repositories.
  - `RdfScaffoldService` is the entry point for RDF scaffold operations.
- `GatewayBackend/Repositories`
  - Builds SPARQL and parses results.
  - `RdfScaffoldRepository` owns query construction and RDF insert/update/delete.
- `GatewayBackend/Infrastructure`
  - Low-level RDF client + DTOs + config.
  - `IFusekiClient` / `FusekiClient` handle HTTP calls to Fuseki.

This keeps controllers thin, business logic in services, and RDF/SPARQL in repositories.

## Configuration

Fuseki configuration is in appsettings files under `GatewayBackend/API`:

- `appsettings.Development.json`
- `appsettings.json`
- `appsettings.Production.json`

Config section:

```
"Fuseki": {
  "BaseUrl": "...",
  "Dataset": "...",
  "Username": "...",
  "Password": "..."
}
```

## Seed Data

Seed file:

- `GatewayBackend/Data/Rdf/scaffolds.ttl`

Seeding is exposed via:

- `POST /api/seed/rdf`

This loads the `.ttl` file into the configured dataset using the Graph Store protocol.
Seeding does not happen automatically on app startup.

## Current Endpoints (RDFTest)

Query (typed DTO):
- `GET /api/rdftest/scaffolds`
  - Optional query params:
    - `particleSizeUm`
    - `particleShape`
    - `voidVolumeFraction`
    - `bioMeasurementX`
    - `bioMeasurementY`

Query (raw SPARQL JSON):
- `GET /api/rdftest/scaffolds/raw`

All scaffolds (typed DTO, optional properties):
- `GET /api/rdftest/scaffolds/all`

All scaffolds (raw RDF as Turtle):
- `GET /api/rdftest/scaffolds/all/raw`

Create:
- `POST /api/rdftest/scaffolds`

Update (replace all properties):
- `PUT /api/rdftest/scaffolds/{scaffoldId}`

Delete (remove all triples for scaffold):
- `DELETE /api/rdftest/scaffolds/{scaffoldId}`

## DTOs

DTOs live in `GatewayBackend/Infrastructure/DTOs`:

- `RdfScaffoldCreateDto` for insert/update
- `RdfScaffoldMeasurementDto` for filtered queries
- `RdfScaffoldAllDto` for full optional queries

## SPARQL Ownership

- SPARQL queries and parsing live in `RdfScaffoldRepository`.
- Services call repositories.
- Controllers call services.

This keeps SPARQL changes contained to repositories and maintains a stable API contract through DTOs.

## Scaling Notes

Recommendations as the RDF layer grows:

1. Use a single dataset (like a database) and split domains with named graphs.
2. Keep raw endpoints for debugging only; prefer DTOs for public API stability.
3. Introduce SHACL shapes / ontology files as the data model stabilizes.
4. Organize by entity: one controller, service, and repository per RDF entity/domain.
5. Move RDF endpoints into their own controllers (non-test) once stable.
6. Consider caching or batching when integrating RDF + Postgres queries in services.

## Logging

The Fuseki HTTP client logs were reduced by adding:

```
"System.Net.Http.HttpClient.IFusekiClient": "Warning"
```

in all appsettings files. This removes frequent per-request info logs.
