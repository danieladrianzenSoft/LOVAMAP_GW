# Documentation

Developer and architecture docs for the LOVAMAP Gateway.

## Knowledge Base (RDF)

| Document | Description |
|----------|-------------|
| [RDF Ontology Strategy](RdfStrategy.md) | v1 ontology design — paper-centric data model, two-database architecture |
| [RDF Schema v2](RdfStrategy-v2.md) | v2 schema refactor — standard vocabularies (BIBO, QUDT, FOAF), reagent entities, FAIR enrichment |
| [RDF Database](RDF.md) | Fuseki integration for the GatewayBackend — scaffold RDF store, graph visualization, API endpoints |
| [Knowledge Base Admin](KnowledgeBaseAdmin.md) | KnowledgeBaseBackend operations — data seeding, Fuseki text index, reindexing, admin endpoints |

## Gateway Backend

| Document | Description |
|----------|-------------|
| [Batch Mesh Replace](BatchMeshReplace.md) | Admin utility to batch-replace scaffold mesh files (.glb) and metadata |
| [Persist Job Results](PersistJobResultsToDB.md) | Plan for persisting computed descriptors to the database on job upload |

## Reference Data

| File | Description |
|------|-------------|
| [seed-data.ttl](seed-data.ttl) | Example v1 seed data for the scaffold RDF store |
| [rdf/](rdf/) | v1 paper TTL files (3 papers, pre-migration reference) |
