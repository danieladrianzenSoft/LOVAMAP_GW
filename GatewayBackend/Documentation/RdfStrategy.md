# RDF Ontology Strategy

## Purpose

This document defines the ontology design and data strategy for LOVAMAP's RDF knowledge base. The goal is to build a structured repository of granular-material research — capturing what the literature reports about how scaffold geometry, fabrication, and composition relate to biological and mechanical outcomes. This repository enables data mining and predictive studies that link geometrical properties to functional outputs.

The RDF store is **paper-centric**: the unit of knowledge is a published study, not an individual scaffold instance. Individual scaffold-level data (3D geometry descriptors, mesh files, per-pore metrics) remains in the relational database. The RDF store captures the higher-level claims, measurements, and experimental conditions reported in papers, and links them — where possible — to computed descriptors in the relational DB.

## Two-Database Architecture

```
RDF Knowledge Base (Fuseki)                Relational DB (Postgres / EF Core)
───────────────────────────                ────────────────────────────────────
Paper-level knowledge                      Scaffold-instance-level data

• What the literature reports              • Exact 3D geometry descriptors
• Material descriptions as published       • Per-pore, per-scaffold metrics
• Experimental protocols                   • Mesh files, domains, images
• Biological & mechanical outcomes         • Job provenance & versioning
• Cross-study comparisons                  • Publication dataset snapshots
• Fuzzy/aggregate links to descriptors     • User & download tracking

Queried via SPARQL                         Queried via EF Core / SQL
```

**Why two databases?** Paper-reported data is heterogeneous, loosely structured, and relationship-rich — a natural fit for RDF/graph. Scaffold descriptors are uniform, numeric, and instance-specific — a natural fit for relational tables. Forcing either into the other's model would be awkward.

## Namespaces

| Prefix | URI | Use |
|--------|-----|-----|
| `lova:` | `https://lovamap.com/ontology#` | All LOVAMAP-specific classes and properties |
| `dc:` | `http://purl.org/dc/terms/` | Paper metadata (title, creator, date, identifier) |
| `foaf:` | `http://xmlns.com/foaf/0.1/` | People (author names, affiliations) |
| `schema:` | `https://schema.org/` | Journal, Organization |
| `bibo:` | `http://purl.org/ontology/bibo/` | Bibliographic terms (Article, Journal, volume, issue) |
| `qudt:` | `http://qudt.org/schema/qudt/` | Units of measurement |
| `rdfs:` | `http://www.w3.org/2000/01/rdf-schema#` | Labels, comments, subclass |
| `owl:` | `http://www.w3.org/2002/07/owl#` | Ontology declarations, equivalences |
| `xsd:` | `http://www.w3.org/2001/XMLSchema#` | Datatypes |

Reuse established vocabularies wherever a standard term exists. Mint `lova:` URIs only for domain-specific concepts that have no standard equivalent.

## URI Design

URIs are globally unique identifiers. They follow these conventions:

| Entity | URI pattern | Example |
|--------|-------------|---------|
| Paper | `lova:paper/{doi-slug}` | `lova:paper/10.1016-j.biomaterials.2024.122456` |
| Author | `lova:author/{last}-{firstInitial}` | `lova:author/smith-j` |
| Journal | `lova:journal/{slug}` | `lova:journal/biomaterials` |
| Material | `lova:material/{doi-slug}/{id}` | `lova:material/10.1016-j.biomaterials.2024.122456/mat1` |
| Experiment | `lova:experiment/{doi-slug}/{id}` | `lova:experiment/10.1016-j.biomaterials.2024.122456/exp1` |
| Outcome | `lova:outcome/{doi-slug}/{id}` | `lova:outcome/10.1016-j.biomaterials.2024.122456/out1` |
| FabricationMethod | `lova:fabrication-method/{doi-slug}/{id}` | `lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii` |
| GeometryProfile | `lova:geometry-profile/{slug}` | `lova:geometry-profile/sphere-300-500um-rigid` |

DOI slugs replace `/` with `-` and drop the `https://doi.org/` prefix.

## Ontology Classes

### 1. `lova:Paper`

A published study from which data is extracted. This is the provenance root — every material, experiment, and outcome traces back to a paper.

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `dc:title` | `xsd:string` | Dublin Core | Paper title |
| `dc:identifier` | `xsd:string` | Dublin Core | DOI |
| `dc:date` | `xsd:gYear` | Dublin Core | Publication year |
| `schema:isPartOf` | URI → `lova:Journal` | Schema.org | Journal |
| `dc:creator` | URI → `lova:Author` | Dublin Core | Author(s), multi-valued |
| `lova:paperType` | `xsd:string` | LOVAMAP | e.g. "Research Article", "Review" |
| `lova:focusMaterial` | `xsd:string` | LOVAMAP | Brief summary of what material system the paper studies |
| `lova:hasLabData` | `xsd:boolean` | LOVAMAP | Whether LOVAMAP descriptors exist for scaffolds in this paper |

### 2. `lova:Author`

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `foaf:familyName` | `xsd:string` | FOAF | Last name |
| `foaf:givenName` | `xsd:string` | FOAF | First name |
| `foaf:name` | `xsd:string` | FOAF | Full name |
| `schema:affiliation` | `xsd:string` | Schema.org | Institution |

### 3. `lova:Journal`

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `dc:title` | `xsd:string` | Dublin Core | Journal name |
| `bibo:issn` | `xsd:string` | BIBO | ISSN |

### 4. `lova:Material`

A granular material system as described in a paper. Not a specific scaffold instance — a description of the type of material used.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `lova:describedIn` | URI → `lova:Paper` | Source paper |
| `rdfs:label` | `xsd:string` | Human-readable label, e.g. "Rigid PLGA spheres 300-500μm" |

**Particle Properties**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:particleShape` | `xsd:string` | Particle geometry | "Sphere", "Cylinder", "Cube", "Irregular", "Star" |
| `lova:particleMaterial` | `xsd:string` | Polymer or material | "PLGA", "GelMA", "Alginate", "PEGDA", "Chitosan" |
| `lova:particleSizeMin` | `xsd:double` | Lower bound of size range (μm) | 300 |
| `lova:particleSizeMax` | `xsd:double` | Upper bound of size range (μm) | 500 |
| `lova:particleSizeUnit` | `xsd:string` | Unit of size | "μm", "mm" |
| `lova:sizeDistribution` | `xsd:string` | Mono/polydisperse, sieve fractions | "Monodisperse", "Polydisperse 100-500μm" |
| `lova:stiffness` | `xsd:string` | Qualitative or quantitative | "Rigid", "Soft", "~5 kPa" |
| `lova:crosslinker` | `xsd:string` | Crosslinking agent if applicable | "Irgacure 2959", "CaCl2" |
| `lova:crosslinkerConcentration` | `xsd:string` | Amount/concentration | "0.5% w/v" |
| `lova:surfaceModification` | `xsd:string` | Coatings, functionalization | "RGD-coated", "Fibronectin-adsorbed" |

**Scaffold / Assembly Properties**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:hasFabricationMethod` | URI → `lova:FabricationMethod` | Link to fabrication method node (see class 5) |
| `lova:packingConfiguration` | `xsd:string` | Packing arrangement | "Random", "Hexagonal", "Jammed" |
| `lova:reportedPorosity` | `xsd:double` | Void fraction as reported in the paper | 0.35 |
| `lova:reportedPoreSize` | `xsd:string` | Pore size as reported | "50-100 μm" |
| `lova:scaffoldDimensions` | `xsd:string` | Physical dimensions | "8mm diameter × 2mm height" |

**Relational DB Link** (layered — see [Linking Strategy](#linking-strategy-rdf--relational-db))

Every Material gets a `hasGeometryProfile` as a baseline link. When an exact match is known, `scaffoldGroupId` is added on top. Both can coexist — exact IDs take priority in downstream queries.

| Property | Type | Description |
|----------|------|-------------|
| `lova:hasGeometryProfile` | URI → `lova:GeometryProfile` | **Always present** when any relational DB link exists. Baseline fuzzy link via match criteria. |
| `lova:scaffoldGroupId` | `xsd:integer` | Direct link to a ScaffoldGroup in the relational DB. Added when exact match is known (our lab's data). Multi-valued if the material spans multiple groups. Supersedes the GeometryProfile for query purposes. |
| `lova:scaffoldId` | `xsd:integer` | Direct link to specific Scaffold instances. Optional, only when individual scaffolds are known. Multi-valued. |

### 5. `lova:FabricationMethod`

Describes how a granular material was fabricated — the chemistry, manufacturing technique, and key reagents. Promoted to a first-class entity (rather than flat strings on Material) to enable cross-paper queries like "which papers use microfluidic fabrication?" or "which studies use Factor XIII annealing?"

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `lova:describedIn` | URI → `lova:Paper` | Source paper |
| `rdfs:label` | `xsd:string` | Human-readable label, e.g. "Microfluidic PEG-VS with Factor XIII annealing" |

**Manufacturing**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:chemistry` | `xsd:string` | Primary polymerization / crosslinking chemistry | "Michael-type addition (thiol-ene)", "Radical photopolymerization", "Ionic gelation" |
| `lova:manufacturingMethod` | `xsd:string` | Physical technique for making the particles | "Microfluidic water-in-oil emulsion", "Batch emulsion", "Electrospray", "3D printing (DLP)", "Mechanical fragmentation" |
| `lova:annealingChemistry` | `xsd:string` | How particles are bonded into a scaffold | "Enzymatic (Factor XIII transglutamination)", "Photoinitiated thiol-ene", "Thermal sintering", "None (packed only)" |
| `lova:annealingConditions` | `xsd:string` | Parameters of the annealing step | "37°C, 90 min", "UV 365nm 10 min", "80°C for 2h" |

**Reagents**

Key molecules involved in the fabrication. Each role-specific property can be multi-valued if multiple reagents serve the same role.

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:monomer` | `xsd:string` | Primary monomer / polymer backbone | "4-arm PEG-VS (20 kDa)", "GelMA (60% DoF)" |
| `lova:monomerCAS` | `xsd:string` | CAS registry number for the monomer | "25322-68-3" (PEG base) |
| `lova:crosslinker` | `xsd:string` | Crosslinking agent | "MMP-degradable peptide (GCRDVPMS↓MRGGDRCG)", "DTT" |
| `lova:crosslinkerCAS` | `xsd:string` | CAS number for the crosslinker | "3483-12-3" (DTT) |
| `lova:initiator` | `xsd:string` | Photoinitiator or radical initiator | "LAP (lithium phenyl-2,4,6-trimethylbenzoylphosphinate)", "Irgacure 2959" |
| `lova:initiatorCAS` | `xsd:string` | CAS number for the initiator | "85073-19-4" (LAP) |
| `lova:surfactant` | `xsd:string` | Surfactant used in emulsion | "Span 80" |
| `lova:surfactantCAS` | `xsd:string` | CAS number for the surfactant | "1338-43-8" (Span 80) |
| `lova:additionalReagent` | `xsd:string` | Any other key reagent not covered above | "Mineral oil (continuous phase)" |
| `lova:additionalReagentCAS` | `xsd:string` | CAS number for additional reagent | "8042-47-5" |

**Enzymes**

When an enzyme is used in fabrication or annealing, capture its identity with standard codes.

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:enzyme` | `xsd:string` | Enzyme name | "Factor XIII (FXIIIa)", "Transglutaminase (mTG)" |
| `lova:enzymeEC` | `xsd:string` | Enzyme Commission number | "EC 2.3.2.13" |
| `lova:enzymeRole` | `xsd:string` | What the enzyme does in the process | "Annealing (inter-particle crosslinking)", "Degradation-triggered release" |

**Peptides / Bioactive Moieties**

Functional peptides tethered to or incorporated into the particles.

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:peptide` | `xsd:string` | Peptide name or sequence | "RGD (GCGYGRGDSPG)", "K-peptide (FKGG-GPQGIWGQ-ERCG)", "Q-peptide (NQEQVSPL-ERCG)" |
| `lova:peptideRole` | `xsd:string` | Function of the peptide | "Cell adhesion", "Enzymatic annealing substrate (K)", "Enzymatic annealing substrate (Q)" |

**Example:**

```turtle
lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii  a  lova:FabricationMethod ;
    lova:describedIn          lova:paper/10.1002-adhm.202300823 ;
    rdfs:label                "Microfluidic PEG-VS microgels with Factor XIII annealing" ;
    lova:chemistry            "Michael-type addition (thiol-ene)" ;
    lova:manufacturingMethod  "Microfluidic water-in-oil emulsion" ;
    lova:annealingChemistry   "Enzymatic (Factor XIII transglutamination)" ;
    lova:annealingConditions  "37°C, 90 min" ;
    lova:monomer              "4-arm PEG-VS (20 kDa)" ;
    lova:crosslinker          "MMP-degradable peptide (GCRDVPMS↓MRGGDRCG)" ;
    lova:surfactant           "Span 80" ;
    lova:surfactantCAS        "1338-43-8" ;
    lova:enzyme               "Factor XIII (FXIIIa)" ;
    lova:enzymeEC             "EC 2.3.2.13" ;
    lova:enzymeRole           "Annealing (inter-particle crosslinking via K/Q peptides)" ;
    lova:peptide              "K-peptide (Ac-FKGG-GPQGIWGQ-ERCG-NH2)" ,
                              "Q-peptide (Ac-NQEQVSPL-ERCG-NH2)" ,
                              "RGD (Ac-GCGYGRGDSPG-NH2)" ;
    lova:peptideRole          "Enzymatic annealing substrate (K)" ,
                              "Enzymatic annealing substrate (Q)" ,
                              "Cell adhesion" .
```

### 6. `lova:Experiment`

An experimental protocol described in a paper. Links a material to one or more outcomes.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `lova:describedIn` | URI → `lova:Paper` | Source paper |
| `lova:usedMaterial` | URI → `lova:Material` | Material studied |
| `rdfs:label` | `xsd:string` | Human-readable label |

**Experiment Classification**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:experimentCategory` | `xsd:string` | Broad category | See categories below |
| `lova:experimentType` | `xsd:string` | Specific type | See types below |
| `lova:assayOrMethod` | `xsd:string` | Specific assay or technique | "AlamarBlue", "DMA", "MicroCT", "Mercury porosimetry" |
| `lova:equipment` | `xsd:string` | Instrument used | "TA Instruments DHR-2", "Bruker SkyScan" |

**Experiment categories and types:**

| Category | Types |
|----------|-------|
| `Mechanical` | Compression, Tension, Shear, Nanoindentation, DMA |
| `Rheological` | Oscillatory shear, Creep, Stress relaxation, Flow sweep |
| `Structural/Imaging` | MicroCT, SEM, Confocal, Histology, Light microscopy |
| `Transport` | Diffusion, Permeability, Swelling |
| `Degradation` | Mass loss, Molecular weight change, pH change |
| `Biological` | Cell viability, Proliferation, Differentiation, Migration, Infiltration, Adhesion, Gene expression, Protein expression |
| `Biochemical` | ELISA, Western blot, qPCR, Metabolomics |

**Biological Experiment Details** (when `experimentCategory` = "Biological" or "Biochemical")

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:cellType` | `xsd:string` | Cell line or primary cells | "hMSC", "MC3T3-E1", "HUVECs", "Primary chondrocytes" |
| `lova:cellSource` | `xsd:string` | Source organism/tissue | "Human bone marrow", "Murine calvaria" |
| `lova:seedingDensity` | `xsd:string` | Cells seeded | "1×10⁵ cells/scaffold" |
| `lova:cultureDuration` | `xsd:string` | How long cells were cultured | "7 days", "1, 3, 7, 14 days" |
| `lova:cultureMedium` | `xsd:string` | Medium composition | "DMEM + 10% FBS", "Osteogenic medium" |

**Environmental Conditions**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:temperature` | `xsd:string` | Temperature | "37°C", "Room temperature" |
| `lova:pH` | `xsd:string` | pH | "7.4" |
| `lova:atmosphere` | `xsd:string` | Gas environment | "5% CO2", "Normoxia", "Hypoxia 1% O2" |
| `lova:medium` | `xsd:string` | Surrounding medium | "PBS", "DMEM", "Simulated body fluid" |
| `lova:strainRate` | `xsd:string` | For mechanical tests | "1 mm/min", "0.01 s⁻¹" |
| `lova:frequency` | `xsd:string` | For rheological tests | "1 Hz", "0.1-100 rad/s" |
| `lova:preconditioning` | `xsd:string` | Sample prep before test | "Swollen in PBS 24h" |

### 7. `lova:Outcome`

A measured result reported in a paper. Each outcome is a single metric from a single experiment.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `lova:fromExperiment` | URI → `lova:Experiment` | Experiment that produced this outcome |
| `lova:describedIn` | URI → `lova:Paper` | Source paper (redundant but useful for direct queries) |
| `rdfs:label` | `xsd:string` | Human-readable label |

**Measurement Identity**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:measurementType` | `xsd:string` | What was measured | See measurement types below |
| `lova:measurementCategory` | `xsd:string` | Broad category | Same as experiment categories |

**Measurement types (non-exhaustive, to be extended as papers are mined):**

| Category | Measurement types |
|----------|-------------------|
| Mechanical | Young's modulus, Compressive modulus, Tensile strength, Compressive strength, Failure strain, Toughness |
| Rheological | Storage modulus (G'), Loss modulus (G''), Tan delta, Yield stress, Viscosity, Loss tangent |
| Structural | Porosity, Pore size, Interconnectivity, Surface area, Tortuosity, Pore size distribution |
| Transport | Permeability, Diffusion coefficient, Swelling ratio, Equilibrium water content |
| Degradation | Mass loss (%), Molecular weight retention, Degradation rate |
| Biological | Cell viability (%), Cell count, Proliferation rate, Infiltration depth (μm), Cell coverage (%), ALP activity, DNA content, GAG content, Collagen content, Mineralization |
| Gene expression | Fold change, Relative expression (2^-ΔΔCt) |

**Value**

| Property | Type | Description |
|----------|------|-------------|
| `lova:value` | `xsd:double` | Numeric value (mean or reported value) |
| `lova:unit` | `xsd:string` | Unit of measurement |
| `lova:stdDev` | `xsd:double` | Standard deviation if reported |
| `lova:stdErr` | `xsd:double` | Standard error if reported |
| `lova:sampleSize` | `xsd:integer` | n |
| `lova:valueString` | `xsd:string` | For non-numeric or complex values, e.g. "5-10 kPa" |
| `lova:comparedToControl` | `xsd:double` | Fold change vs. control |
| `lova:pValue` | `xsd:double` | Statistical significance |
| `lova:isSignificant` | `xsd:boolean` | Whether the result was reported as statistically significant |

**Scope / Granularity**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:scope` | `xsd:string` | Spatial granularity | "Bulk/global", "Regional", "Per-pore", "Per-particle", "Surface" |
| `lova:timePoint` | `xsd:string` | When measured | "Day 7", "24h", "Immediate" |
| `lova:isTimeSeries` | `xsd:boolean` | Whether this is one point in a time series | |
| `lova:comparisonGroup` | `xsd:string` | What this was compared against | "Solid hydrogel", "TCP", "Empty defect" |

### 8. `lova:GeometryProfile`

A **pointer** from the RDF knowledge base to the relational database. It does NOT store descriptor values — those stay in the relational DB where they belong (full distributions, per-pore metrics, per-scaffold data). The GeometryProfile records which scaffold groups match a paper's material description, and how that match was determined.

**Match metadata**

| Property | Type | Description |
|----------|------|-------------|
| `lova:matchType` | `xsd:string` | `"exact"` (paper used these specific scaffolds) or `"aggregate"` (similar scaffolds found by property matching) |
| `lova:matchDescription` | `xsd:string` | Human-readable explanation of the match |
| `lova:scaffoldGroupId` | `xsd:integer` | ScaffoldGroup ID(s) from the relational DB. Multi-valued — one triple per group. |
| `lova:scaffoldId` | `xsd:integer` | Specific Scaffold IDs (exact matches only). Multi-valued. |
| `lova:scaffoldCount` | `xsd:integer` | Total number of individual scaffolds across the matched groups |
| `lova:matchedAt` | `xsd:date` | When the match was created or last refreshed |

**Match criteria** (for aggregate matches — records the query used to find matching scaffold groups)

| Property | Type | Description |
|----------|------|-------------|
| `lova:matchShape` | `xsd:string` | Particle shape filter used (maps to `ParticlePropertyGroup.Shape`) |
| `lova:matchSizeMin` | `xsd:double` | Min particle size filter (maps to `ParticlePropertyGroup.MinSize` / `MeanSize`) |
| `lova:matchSizeMax` | `xsd:double` | Max particle size filter |
| `lova:matchStiffness` | `xsd:string` | Stiffness filter (maps to `ParticlePropertyGroup.Stiffness`) |
| `lova:matchMaterial` | `xsd:string` | Material/polymer filter if used |

These criteria properties serve two purposes: (1) document why these scaffold groups were selected, and (2) allow the match to be re-run when new scaffold groups are added to the relational DB.

**What the GeometryProfile does NOT store:** Descriptor values (porosity, pore volume, connectivity, etc.). Those are fetched from the relational DB at query time via the scaffold group IDs. This preserves the full richness of per-pore distributions, per-scaffold variation, and all descriptor types — rather than collapsing everything into lossy averages.

## Relationships Diagram

```
                        lova:Journal
                            ▲
                 schema:isPartOf
                            │
  lova:Author ◄──dc:creator── lova:Paper
                            │
                   lova:describedIn
                            │
                    lova:Material ───hasGeometryProfile───► lova:GeometryProfile
                            │  │    │                              │
              hasFabricationMethod  │                        scaffoldGroupIds
                            │  │    │ scaffoldGroupId              │ (fuzzy)
               lova:FabricationMethod  │ (exact, if known)         │
                (chemistry,    │       │                           ▼
                 manufacturing,│       │                  ┌─────────────────────┐
                 reagents,     │       └─────────────────▶│   Relational DB     │
                 enzymes)      │                          │  ScaffoldGroup      │
                               │                          │   └─► Scaffold     │
                      lova:usedMaterial                   │        └─► Desc.   │
                               │                          └─────────────────────┘
                        lova:Experiment
                               │
                      lova:fromExperiment
                               │
                        lova:Outcome
```

## Paper Mining Workflow

### Extraction Process

For each paper:

1. **Create the Paper node** — title, DOI, year, journal, authors
2. **Create Material node(s)** — one per distinct material system in the paper. Many papers study multiple formulations or compare material types. Each gets its own node.
3. **Create Experiment node(s)** — one per distinct experimental protocol. A paper might run compression tests AND cell viability assays on the same material — those are separate experiments.
4. **Create Outcome node(s)** — one per reported metric per experiment. If a paper reports Young's modulus, cell viability at day 3, and cell viability at day 7, that's three outcomes.
5. **Create GeometryProfile** — create or reference a GeometryProfile node with match criteria derived from the material's properties (shape, size range, material). Link it to the Material via `hasGeometryProfile`. This is always done when any relational DB link is possible — even for exact matches.
6. **Add exact IDs (if known)** — for papers from our lab where we know which scaffold groups correspond to each material, add `scaffoldGroupId` (and optionally `scaffoldId`) directly on the Material node. These supersede the GeometryProfile's fuzzy matches.

### What to Extract

When reading a paper, extract these in order of priority:

**Always extract:**
- Paper metadata (DOI, title, year, journal, authors)
- Material description (particle shape, size, polymer)
- Fabrication method (chemistry, manufacturing technique, annealing — as a `lova:FabricationMethod` node)
- What was measured and the key reported values
- Experimental conditions (cell type, duration, temperature if non-standard)

**Extract when available:**
- Statistical details (n, std dev, significance)
- Comparison groups and controls
- Reagent identities and CAS numbers (monomer, crosslinker, initiator, surfactant)
- Enzyme names and EC numbers (e.g. Factor XIII = EC 2.3.2.13)
- Peptide sequences and roles (e.g. RGD for adhesion, K/Q peptides for annealing)
- Equipment and specific assay protocols

**Do not extract (leave for relational DB):**
- Raw data tables with per-sample values
- Image data
- Supplementary computational results

### Quality Principles

- **One triple = one claim from one paper.** Every outcome traces to a specific paper via `lova:describedIn`.
- **Preserve the paper's language** for measurement types and methods. Normalize where obvious (e.g. "Young's modulus" vs "elastic modulus"), but don't over-interpret.
- **Record what's reported, not what's inferred.** If a paper says "porous" but doesn't report a porosity value, don't guess one.
- **Multiple materials = multiple nodes.** If a paper compares 3 formulations, create 3 Material nodes, each with their own experiments and outcomes.
- **Time series = multiple outcomes.** Cell viability at day 1, 3, 7, 14 = four Outcome nodes linked to the same Experiment, each with a different `lova:timePoint`.

## Linking Strategy: RDF ↔ Relational DB

The two databases speak different languages. The relational DB knows about `ScaffoldGroup.Id = 12` and `Scaffold.Id = 57`. The RDF store knows about `lova:paper/10.1002-adhm.202300823` and `lova:material/.../map-40um`. The linking strategy defines how to bridge them.

Linking uses a **layered model**: every Material with any relational DB connection gets a **GeometryProfile** (fuzzy baseline). When exact scaffold group IDs are known, they are added **directly on the Material node** as well. Both can coexist — `scaffoldGroupId` on the Material supersedes the GeometryProfile's matched IDs in downstream queries, but the profile remains as documentation of the match criteria and as a fallback. Descriptor values are never duplicated into RDF — they stay in the relational DB and are fetched at query time via scaffold group/scaffold IDs.

### Shared Identifiers

| Identifier | RDF location | Relational location | Notes |
|------------|-------------|---------------------|-------|
| **DOI** | `dc:identifier` on `lova:Paper` | `Publication.Doi` | Shared key for papers. |
| **ScaffoldGroup ID** | `lova:scaffoldGroupId` on `lova:Material` (exact) or `lova:GeometryProfile` (fuzzy) | `ScaffoldGroup.Id` (int) | The primary cross-DB pointer. |
| **Scaffold ID** | `lova:scaffoldId` on `lova:Material` | `Scaffold.Id` (int) | Optional, for exact matches only. |

### The Three Link Scenarios

```
 Link type          Mechanism                          What's on the Material node?
 ─────────          ─────────                          ────────────────────────────
 Exact match        hasGeometryProfile (baseline)      hasGeometryProfile → GeometryProfile
                    + scaffoldGroupId + scaffoldId      + scaffoldGroupId (supersedes profile)
                    directly on the Material node       + scaffoldId (optional)

 Fuzzy match        hasGeometryProfile on Material     hasGeometryProfile → GeometryProfile
                    → GeometryProfile with match       (no scaffoldGroupId on Material —
                    criteria + scaffoldGroupIds         IDs only on the profile)

 No match           Neither property present           No relational link at all
                    on the Material node               (still queryable in RDF)
```

#### Scenario 1 — Exact Match

A paper from the lab where we know **exactly which scaffold groups and scaffolds** correspond to each material. The exact `scaffoldGroupId` goes directly on the Material node, **in addition to** a GeometryProfile baseline. The exact ID supersedes the profile's fuzzy matches for query purposes, but the profile stays as documentation and fallback.

```
 RDF                                          Relational DB
 ───                                          ─────────────

 lova:Paper
 ┌──────────────────────────────┐             Publication
 │ dc:identifier "10.1002/..."  │────DOI─────▶┌─────────────────────────┐
 │ lova:hasLabData true         │             │ Doi = "10.1002/..."     │
 └──────────┬───────────────────┘             └─────────────────────────┘
            │ describedIn
            ▼
 lova:Material (one per material in the paper)
 ┌──────────────────────────────┐             ScaffoldGroup
 │ particleShape "Sphere"       │             ┌─────────────────────────┐
 │ particleSizeMin 40.0         │             │ Id = 12                 │
 │ particleMaterial "PEG-VS"    │             │ Name = "40um PEG MAP"   │
 │                              │             └─────────┬───────────────┘
 │ scaffoldGroupId 12 ─────────┼──(exact)───────────────┘
 │ scaffoldId 57, 58, 59 ──────┼──────┐      Scaffold
 │                              │      │      ┌─────────────────────────┐
 │ hasGeometryProfile ────┐     │      └─────▶│ Id = 57, 58, 59         │
 └──────────┬─────────────┼─────┘             │ ScaffoldGroupId = 12    │
            │             │                   └─────────┬───────────────┘
            │             ▼                             │
            │  lova:GeometryProfile          GlobalDescriptor, PoreDescriptor
            │  ┌────────────────────────┐    ┌─────────────────────────┐
            │  │ matchShape "Sphere"    │    │ Full distributions      │
            │  │ matchSizeMin 35.0      │    │ Per-pore metrics        │
            │  │ matchSizeMax 45.0      │    │ Per-scaffold values     │
            │  │ (baseline / fallback)  │    │ (queried at runtime)    │
            │  └────────────────────────┘    └─────────────────────────┘
            │ usedMaterial
            ▼
 lova:Experiment
 ┌──────────────────────────────┐
 │ experimentType               │
 │   "Macrophage polarization"  │
 └──────────┬───────────────────┘
            │ fromExperiment
            ▼
 lova:Outcome
 ┌──────────────────────────────┐
 │ measurementType "iNOS MFI"   │
 │ value 1250.0                 │
 │ isSignificant true           │
 └──────────────────────────────┘

 Primary path:  Outcome → Experiment → Material → scaffoldGroupId → Relational DB
 Fallback path: Outcome → Experiment → Material → GeometryProfile → scaffoldGroupIds
```

**Triples:**

```turtle
lova:paper/10.1002-adhm.202300823
    dc:identifier    "10.1002/adhm.202300823" ;
    lova:hasLabData  true .

# Material has BOTH exact scaffoldGroupId AND a GeometryProfile baseline
lova:material/10.1002-adhm.202300823/map-40um  a  lova:Material ;
    lova:describedIn         lova:paper/10.1002-adhm.202300823 ;
    lova:particleShape       "Sphere" ;
    lova:particleSizeMin     40.0 ;
    lova:particleMaterial    "4-arm PEG-VS (20 kDa)" ;
    lova:hasGeometryProfile  lova:geometry-profile/peg-sphere-40um ;
    lova:scaffoldGroupId     12 ;       # exact — supersedes profile
    lova:scaffoldId          57 , 58 , 59 .

lova:material/10.1002-adhm.202300823/map-70um  a  lova:Material ;
    lova:describedIn         lova:paper/10.1002-adhm.202300823 ;
    lova:particleShape       "Sphere" ;
    lova:particleSizeMin     70.0 ;
    lova:particleMaterial    "4-arm PEG-VS (20 kDa)" ;
    lova:hasGeometryProfile  lova:geometry-profile/peg-sphere-70um ;
    lova:scaffoldGroupId     15 .       # exact — supersedes profile

lova:material/10.1002-adhm.202300823/map-130um  a  lova:Material ;
    lova:describedIn         lova:paper/10.1002-adhm.202300823 ;
    lova:particleShape       "Sphere" ;
    lova:particleSizeMin     130.0 ;
    lova:particleMaterial    "4-arm PEG-VS (20 kDa)" ;
    lova:hasGeometryProfile  lova:geometry-profile/peg-sphere-130um ;
    lova:scaffoldGroupId     18 .       # exact — supersedes profile
```

**How it's populated:**
1. Create a GeometryProfile with match criteria derived from the paper's material description (shape, size range, material). This is the same process as Scenario 2 — every material gets this baseline.
2. We know this paper is from our lab (`hasLabData = true`)
3. We know which scaffold groups correspond to which materials (from lab records or the `ScaffoldGroupPublication` join)
4. We add `scaffoldGroupId` (and optionally `scaffoldId`) directly to each Material node — these supersede the profile's fuzzy matches
5. The GeometryProfile stays as documentation and fallback — if the exact scaffold group is later deleted or reassigned, the fuzzy match still works

#### Scenario 2 — Fuzzy Match

An external paper studies "spherical PLGA particles, 300-500 μm." We don't have their exact scaffolds, but our relational DB has scaffold groups with similar fabrication properties. We create a **GeometryProfile** that records the match criteria and which scaffold groups matched.

```
 RDF                                          Relational DB
 ───                                          ─────────────

 lova:Material                                ParticlePropertyGroup (query target)
 ┌──────────────────────────────┐             ┌─────────────────────────┐
 │ particleShape "Sphere"       │             │ Shape = "Sphere"        │
 │ particleSizeMin 300.0        │   match     │ MeanSize = 300-500      │
 │ particleSizeMax 500.0        │   criteria  │ Stiffness = ...         │
 │ particleMaterial "PLGA"      │─ ─ ─ ─ ─ ─▶│                         │
 │                              │             └────────────┬────────────┘
 │ hasGeometryProfile ──────┐   │                          │ matched groups
 └──────────────────────────┼───┘                          ▼
                            │             ScaffoldGroup
 lova:GeometryProfile       │             ┌─────────────────────────┐
 ┌──────────────────────────┼───┐         │ Id = 22                 │
 │ matchType "aggregate"    │◀──┘  ┌─────▶│ Sphere, 300μm           │
 │                          │      │      ├─────────────────────────┤
 │ matchShape "Sphere"      │      │      │ Id = 31                 │
 │ matchSizeMin 300.0       │      │ ┌───▶│ Sphere, 400μm           │
 │ matchSizeMax 500.0       │      │ │    ├─────────────────────────┤
 │                          │      │ │    │ Id = 45                 │
 │ scaffoldGroupId 22 ──────┼──────┘ │ ┌─▶│ Sphere, 500μm           │
 │ scaffoldGroupId 31 ──────┼────────┘ │  └─────────────────────────┘
 │ scaffoldGroupId 45 ──────┼──────────┘
 │ scaffoldCount 15         │         Descriptors fetched at query time,
 │                          │         NOT stored on the profile
 └──────────────────────────┘
```

**Triples:**

```turtle
lova:material/10.1234-j.biomaterials.2024.999/mat1  a  lova:Material ;
    lova:describedIn         lova:paper/10.1234-j.biomaterials.2024.999 ;
    lova:particleShape       "Sphere" ;
    lova:particleSizeMin     300.0 ;
    lova:particleSizeMax     500.0 ;
    lova:particleMaterial    "PLGA" ;
    lova:hasGeometryProfile  lova:geometry-profile/sphere-300-500um .

lova:geometry-profile/sphere-300-500um  a  lova:GeometryProfile ;
    lova:matchType        "aggregate" ;
    lova:matchDescription "Scaffold groups with spherical particles, mean size 300-500 μm" ;
    lova:matchShape       "Sphere" ;
    lova:matchSizeMin     300.0 ;
    lova:matchSizeMax     500.0 ;
    lova:scaffoldGroupId  22 , 31 , 45 ;
    lova:scaffoldCount    15 ;
    lova:matchedAt        "2025-06-01"^^xsd:date .
```

**How it's populated:**
1. From the Material node, extract key properties: shape, size range, material
2. Query relational DB: `SELECT sg.Id FROM ScaffoldGroup sg JOIN InputGroup ig ... JOIN ParticlePropertyGroup ppg WHERE ppg.Shape = 'Sphere' AND ppg.MeanSize BETWEEN 300 AND 500`
3. Store the matching scaffold group IDs and the criteria used
4. Descriptors are **not** copied — they are fetched from the relational DB at query time via the stored scaffold group IDs

**Shared profiles:** Multiple Materials from different papers can point to the same GeometryProfile if they describe similar materials:

```
 Paper A (2023) ──▶ Material A (Sphere 300μm PLGA) ──┐
                                                       │
 Paper B (2024) ──▶ Material B (Sphere 400μm PLGA) ──┼──▶ geometry-profile/sphere-300-500um
                                                       │
 Paper C (2025) ──▶ Material C (Sphere 350μm PEG)  ──┘
```

**Staleness:** When new scaffold groups are added to the relational DB, existing GeometryProfiles may need updating. The stored `matchShape`/`matchSizeMin`/`matchSizeMax` criteria can be re-run against the relational DB to find new matches. Update `scaffoldGroupId` list, `scaffoldCount`, and `matchedAt`.

#### Scenario 3 — No Match

An external paper studies a material system for which no LOVAMAP data exists. The Material node has neither `scaffoldGroupId` nor `hasGeometryProfile`. All other data is still captured.

```
 RDF                                          Relational DB
 ───                                          ─────────────

 lova:Material
 ┌──────────────────────────────┐
 │ particleShape "Rod"          │
 │ particleSizeMin 50.0         │             ┌─────────────────────────┐
 │ particleSizeMax 200.0        │             │                         │
 │ particleMaterial "Chitosan"  │     ╳       │  No matching scaffolds  │
 │                              │   no link   │                         │
 │ (no scaffoldGroupId)         │             │                         │
 │ (no hasGeometryProfile)      │             │                         │
 └──────────┬───────────────────┘             └─────────────────────────┘
            │ usedMaterial
            ▼
 lova:Experiment ──▶ lova:Outcome
 (still fully captured and queryable in RDF)
```

**Triples:**

```turtle
# No scaffoldGroupId, no hasGeometryProfile
lova:material/10.5555-example.2024.001/mat1  a  lova:Material ;
    lova:describedIn         lova:paper/10.5555-example.2024.001 ;
    lova:particleShape       "Rod" ;
    lova:particleSizeMin     50.0 ;
    lova:particleSizeMax     200.0 ;
    lova:particleMaterial    "Chitosan" ;
    lova:stiffness           "Soft hydrogel" .

# Experiments and outcomes still fully captured
lova:experiment/10.5555-example.2024.001/exp1  a  lova:Experiment ;
    lova:usedMaterial        lova:material/10.5555-example.2024.001/mat1 ;
    lova:experimentCategory  "Biological" ;
    lova:experimentType      "Cell viability" .

lova:outcome/10.5555-example.2024.001/viab-d7  a  lova:Outcome ;
    lova:fromExperiment      lova:experiment/10.5555-example.2024.001/exp1 ;
    lova:measurementType     "Cell viability" ;
    lova:value               72.5 ;
    lova:unit                "%" ;
    lova:timePoint           "Day 7" .
```

**Why this is still valuable:** This data participates in pure-RDF queries. "What cell viability ranges are reported for rod-shaped particles?" works without any relational link. If LOVAMAP later analyzes rod-shaped chitosan scaffolds, a GeometryProfile can be retroactively created and linked via `hasGeometryProfile`, and if exact matches are identified, `scaffoldGroupId` can be added directly to the Material.

### Cross-Database Queries

Queries that span both databases are always **two-step**, orchestrated by the service layer:

```
  User query: "Show me cell viability for spherical scaffolds with porosity > 0.4"

                         ┌───────────────┐
                         │ Service Layer │
                         └───┬───────┬───┘
                             │       │
                  ┌──────────┘       └──────────┐
                  ▼                              ▼
          Step 1: SQL                    Step 2: SPARQL
    ┌──────────────────────┐      ┌──────────────────────┐
    │ Find scaffold groups │      │ Find Materials whose │
    │ where avg porosity   │      │ scaffoldGroupId or   │
    │ > 0.4                │      │ GeometryProfile refs │
    │                      │      │ those group IDs      │
    │ Returns: group IDs   │─────▶│                      │
    │ [12, 31, 45]         │      │ Follow → Experiment  │
    │                      │      │ → Outcome            │
    └──────────────────────┘      │                      │
                                  │ Returns: outcomes    │
                                  └──────────┬───────────┘
                                             │
                  ┌──────────────────────────┘
                  ▼
          Step 3: SQL (enrich)
    ┌──────────────────────┐
    │ For matched group    │
    │ IDs, fetch full      │
    │ descriptor data      │
    │ (distributions,      │
    │  per-pore metrics)   │
    └──────────────────────┘
                  │
                  ▼
          Combined response:
          - Paper citations (RDF)
          - Biological outcomes (RDF)
          - Full geometry descriptors (relational)
          - Material descriptions (RDF)
```

Or in the reverse direction:

```sparql
# Pure SPARQL: "What outcomes exist for materials with relational DB links?"
SELECT ?materialLabel ?measurementType ?value ?scaffoldGroupId ?linkType WHERE {
    ?material  rdfs:label         ?materialLabel ;
               lova:particleShape "Sphere" .

    ?experiment lova:usedMaterial ?material .
    ?outcome   lova:fromExperiment ?experiment ;
               lova:measurementType ?measurementType ;
               lova:value ?value .

    # Get scaffold group IDs — works for both exact and fuzzy
    {
        # Exact match: ID directly on Material (preferred)
        ?material lova:scaffoldGroupId ?scaffoldGroupId .
        BIND("exact" AS ?linkType)
    } UNION {
        # Fuzzy match: ID on GeometryProfile (fallback)
        ?material lova:hasGeometryProfile ?profile .
        ?profile  lova:scaffoldGroupId ?scaffoldGroupId .
        BIND("fuzzy" AS ?linkType)
    }
}
```

When a Material has both `scaffoldGroupId` (exact) and `hasGeometryProfile` (fuzzy), the UNION returns results from both paths. The `?linkType` binding lets the service layer prefer exact matches and de-duplicate. The service layer then takes the `scaffoldGroupId` values and fetches full descriptors from the relational DB.

## Time Series Data Pattern

Many biological experiments produce time-series data (e.g. cell viability at day 1, 3, 7, 14). We store these as **one Outcome node per time point**, not as a single node with an array value.

### Why one node per time point

The primary use case is cross-paper queries like "across all papers studying spherical particles, what is cell viability at day 7?" This query is trivial when each time point is its own node with a queryable `lova:timePoint` predicate. Storing an entire series as a JSON blob or string array would require client-side parsing and prevent SPARQL-level filtering.

### Pattern

All Outcome nodes in the same series share the same `lova:fromExperiment`, `lova:measurementType`, and have `lova:isTimeSeries true`. They differ only in `lova:timePoint` and `lova:value`. The series can be reconstructed by grouping on those shared predicates.

```turtle
lova:outcome/paper-X/viability-d1  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/paper-X/exp1 ;
    lova:measurementType "Cell viability" ;
    lova:value           45.2 ;
    lova:stdDev          3.1 ;
    lova:sampleSize      5 ;
    lova:unit            "%" ;
    lova:timePoint       "Day 1" ;
    lova:isTimeSeries    true ;
    lova:scope           "Bulk/global" .

lova:outcome/paper-X/viability-d3  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/paper-X/exp1 ;
    lova:measurementType "Cell viability" ;
    lova:value           62.8 ;
    lova:stdDev          4.5 ;
    lova:sampleSize      5 ;
    lova:unit            "%" ;
    lova:timePoint       "Day 3" ;
    lova:isTimeSeries    true ;
    lova:scope           "Bulk/global" .
```

### Reconstructing a time series via SPARQL

```sparql
SELECT ?timePoint ?value ?stdDev WHERE {
    ?outcome lova:fromExperiment lova:experiment/paper-X/exp1 ;
             lova:measurementType "Cell viability" ;
             lova:isTimeSeries true ;
             lova:timePoint ?timePoint ;
             lova:value ?value .
    OPTIONAL { ?outcome lova:stdDev ?stdDev }
}
ORDER BY ?timePoint
```

### Scalability

A typical biomaterials paper has 3–5 figures with time series, each with 3–5 time points across 2–4 material groups. This produces roughly 30–80 Outcome nodes per paper — manageable for a triplestore. The queryability benefit far outweighs the verbosity.

## Figure Data Extraction

Numerical values in published papers are typically embedded in figures (bar charts, line plots) rather than reported inline in the text. Extracting these values is essential for populating `lova:value`, `lova:stdDev`, and other quantitative properties on Outcome nodes.

### Extraction tool

A standalone Python CLI (`literature_ai` repo) extracts figure images from PDFs:

```
python -m figure_extractor extract --pdf paper.pdf --output-dir ./output/my_paper
```

The tool uses PyMuPDF to pull embedded images from PDFs, filter out small icons/logos, and save them as PNGs with a `manifest.json` listing page numbers and dimensions. **No API key needed** — the tool is a dumb image extractor.

### Pipeline

Claude Code (this repo's context) orchestrates the full workflow:

1. Read the paper text → understand materials, experiments, context
2. Invoke the figure extractor via Bash → get PNG paths
3. Read each PNG (Claude Code has native vision) → extract numerical values
4. Combine text understanding + numerical data → produce complete TTL with properly linked triples

### What to extract from figures

| Figure type | Extract |
|-------------|---------|
| Bar chart with error bars | Group labels, bar heights (mean), error bar extents (std dev or SEM), significance markers (*, **, ***) |
| Line plot (time series) | Time points (x-axis), values at each point (y-axis), error bands/bars → one Outcome node per time point |
| Box plot | Median, quartiles, whisker extents, outliers |
| Scatter plot | Individual data points (x, y), trend lines if present |
| Pie chart | Category labels and percentages |
| Schematics / microscopy | Skip (return empty `data_points` array) — non-quantitative |

### Limitations

- Axis labels and scales must be legible in the extracted image. Low-resolution figures may produce inaccurate readings.
- Multi-panel figures (common in biomaterials papers) should be split or the prompt should specify which panel to read.
- Stacked bar charts and overlapping distributions are harder to extract accurately — flag for manual review.
