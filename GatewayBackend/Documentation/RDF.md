# RDF Database

## Overview

LOVAMAP uses two databases:

- **Relational database** (SQL): Stores structured data — void space geometry descriptors, scaffold base characteristics (particle shape, particle size, stiffness, etc.), scaffold groups, images, and user data.
- **RDF database** (Apache Jena Fuseki): Stores data that is harder to structure in a relational schema, such as outputs of biological experiments in granular material scaffolds.

The RDF store is queried via SPARQL through the `FusekiClient` (`Infrastructure/Helpers/FusekiClient.cs`).

## Ontology

All domain terms use the namespace `https://lovamap.com/ontology#` (prefixed as `ex:`).

### Classes

| Class | URI | Description |
|-------|-----|-------------|
| Scaffold | `ex:Scaffold` | A granular material scaffold instance |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `ex:particleShape` | string | Shape of the particles (e.g. "Sphere") |
| `ex:particleSizeUm` | integer | Particle size in micrometers |
| `ex:voidVolumeFraction` | decimal | Void volume fraction of the scaffold |
| `ex:bioMeasurementX` | decimal | Primary biological measurement |
| `ex:bioMeasurementY` | decimal | Secondary biological measurement (optional) |

### Example Triples

```turtle
@prefix ex: <https://lovamap.com/ontology#> .

<https://lovamap.com/scaffold/1> a ex:Scaffold ;
    ex:particleShape "Sphere" ;
    ex:particleSizeUm 500 ;
    ex:voidVolumeFraction 0.35 ;
    ex:bioMeasurementX 1.2 ;
    ex:bioMeasurementY 0.8 .
```

## Architecture

### Backend Layers

```
RDFTestController / RDFVisualizationController
    -> IRdfScaffoldService / RdfScaffoldService
        -> IRdfScaffoldRepository / RdfScaffoldRepository
            -> IFusekiClient / FusekiClient (HTTP to Fuseki)
```

- **Controllers**: `API/Controllers/RDFTestController.cs` (CRUD, test/exploration), `API/Controllers/RDFVisualizationController.cs` (graph visualization endpoints).
- **Service**: `Services/Services/RdfScaffoldService.cs` — pass-through to the repository.
- **Repository**: `Repositories/Repositories/RdfScaffoldRepository.cs` — builds SPARQL queries, parses JSON results.
- **Client**: `Infrastructure/Helpers/FusekiClient.cs` — sends SPARQL queries/updates to Fuseki over HTTP with Basic auth.

### DTOs

| DTO | Purpose |
|-----|---------|
| `RdfScaffoldCreateDto` | Create/update a scaffold in the RDF store |
| `RdfScaffoldAllDto` | Return all scaffold data (flat) |
| `RdfScaffoldMeasurementDto` | Return filtered scaffold measurements |
| `RdfGraphDto` | Knowledge graph (nodes + edges) for visualization |
| `RdfOntologySummaryDto` | Schema-level summary (classes, properties, counts) |

## API Endpoints

### RDFTest (exploration/CRUD)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/RDFTest/scaffolds` | Query scaffolds with optional filters |
| GET | `/api/RDFTest/scaffolds/raw` | Same as above, raw SPARQL JSON response |
| POST | `/api/RDFTest/scaffolds` | Add a scaffold |
| PUT | `/api/RDFTest/scaffolds/{id}` | Update a scaffold (delete + re-insert) |
| DELETE | `/api/RDFTest/scaffolds/{id}` | Delete a scaffold |
| GET | `/api/RDFTest/scaffolds/all` | Get all scaffolds (parsed) |
| GET | `/api/RDFTest/scaffolds/all/raw` | Get all scaffolds as Turtle |

### RDFVisualization (graph endpoints)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/RDFVisualization/graph?limit=N` | Knowledge graph (nodes + edges) |
| GET | `/api/RDFVisualization/graph/summary` | Ontology summary (classes, properties, counts) |

## Knowledge Graph Visualization

The `/graph` endpoint returns a node-link structure designed for force-directed graph rendering (used by `react-force-graph-2d` on the frontend).

### How Triples Map to Graph Elements

The repository queries all triples (`SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`) and classifies each one:

| Triple Pattern | Subject | Object | Edge |
|----------------|---------|--------|------|
| `scaffold/1 rdf:type ex:Scaffold` | Instance node | Class node | "rdf:type" |
| `scaffold/1 ex:particleShape "Sphere"` | (existing) | Shared literal node | "particleShape" |
| `scaffold/1 ex:particleSizeUm 500` | (existing) | *(embedded as node property)* | *(none)* |
| `scaffold/1 ex:someUri <other/uri>` | (existing) | Instance node | predicate label |

### Node Types

- **Class** (`type: "class"`): Created from the object of `rdf:type` triples. Currently just `ex:Scaffold`. Rendered larger with a border.
- **Instance** (`type: "instance"`): Every unique subject URI. Each scaffold becomes an instance node. Numeric properties are embedded as metadata on the node (visible in the details panel on click).
- **Literal** (`type: "literal"`): Non-numeric string values that appear as triple objects. These are **shared** — all scaffolds with `particleShape = "Sphere"` connect to the same "Sphere" literal node, which creates visual clustering in the graph.

### Why Numeric Values Are Not Separate Nodes

Numeric properties (`particleSizeUm`, `voidVolumeFraction`, `bioMeasurementX`, `bioMeasurementY`) are stored as metadata on instance nodes rather than as separate graph nodes. Each numeric value is typically unique to a scaffold, so creating individual nodes would add clutter without creating meaningful connections. String values like `particleShape` are shared across scaffolds, so they create useful clustering.

### Ontology Summary

The `/graph/summary` endpoint runs aggregate SPARQL queries to return:

- **Classes**: Each class URI with its instance count.
- **Properties**: Each property URI with usage count, datatype, and distinct values (for non-numeric properties, up to 50 values).
- **Totals**: Total triple count and total instance count across the store.

## Frontend

The visualization lives in the admin Dashboard (`/dashboard`, admin-only):

- **`src/app/common/ontology-graph/OntologyGraph.tsx`**: Reusable force-directed graph component. Accepts nodes, edges, and a dark mode flag. Uses `react-force-graph-2d` with built-in node rendering for hit detection and custom canvas drawing for labels and class borders.
- **`src/features/rdf-visualization/RdfVisualization.tsx`**: Fetches graph + summary data from the API. Renders the graph with summary stat cards, a legend, a node details panel, and class/property tables.
- **`src/features/dashboard/Dashboard.tsx`**: Admin page that hosts `RdfVisualization`.
- **`src/app/models/rdfGraph.ts`**: TypeScript interfaces for graph and summary data.
- **`src/app/api/agent.ts`**: API calls under `agent.RdfVisualization.getGraph()` and `.getGraphSummary()`.

The graph supports light and dark mode (toggled in Settings), with the canvas background and node/edge colors adapting to the active theme.
