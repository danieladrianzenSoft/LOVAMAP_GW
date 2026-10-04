# LOVAMAP RDF Schema v2 — FAIR Refactor

2026-09-23

## Design Philosophy

This is v2 of the LOVAMAP RDF ontology, restructured around three principles:

**1. Standard vocabularies first, `lova:` only when nothing fits.**
Where a well-adopted vocabulary (BIBO, QUDT, STATO, OBI, FOAF, Dublin Core) provides an exact or near-exact match for a property or class, use it directly — don't dual-type, don't keep a parallel `lova:` alias. This eliminates ambiguity for both human readers and AI agents generating SPARQL. Reserve `lova:` for genuinely domain-specific concepts (scaffold packing, annealing chemistry, geometry profiles) that no existing ontology covers.

**2. AI-agent queryable.**
The primary consumer of this schema is an LLM generating SPARQL from natural-language questions. Every entity keeps an `rdfs:label` with a human-readable name. Machine-readable ontology URIs (ChEBI, Cell Ontology, ORCID) are added as supplementary links alongside the label, not as replacements. The system prompt for SPARQL generation documents all properties — the AI just needs the prefix table and property names.

**3. Restructure now while the dataset is small.**
With only 3 papers loaded, this is the cheapest possible time to make breaking changes. Reagents become entity nodes instead of flat string pairs. Measurements use QUDT. Statistics use STATO. The migration cost is re-generating 3 TTL files and updating the QueryService system prompt.

### What Changed from v1

| Area | v1 | v2 |
|------|----|----|
| Paper/Author/Journal types | `lova:Paper`, `lova:Author`, `lova:Journal` | `bibo:AcademicArticle`, `foaf:Person`, `bibo:Journal` |
| Provenance links | `lova:describedIn` | `dc:source` |
| Paper classification | `lova:paperType` | `dc:type` |
| Measurement values | `lova:value`, `lova:unit` | `qudt:numericValue`, `qudt:unit` |
| Statistics | `lova:stdDev`, `lova:pValue`, etc. | `lova:` aliases with `owl:equivalentProperty` → STATO (readable names, FAIR via equivalence) |
| Reagents | Flat string pairs (`lova:monomer` + `lova:monomerCAS`) | `lova:Reagent` entity nodes with `rdfs:label`, `lova:casNumber`, `lova:molecularWeight`, `lova:concentration`, `lova:supplier`, optional ChEBI/PubChem link |
| Chemical/biological identifiers | Not present | ChEBI, PubChem, Cell Ontology, UniProt, ORCID — as supplementary links (post-processing) |
| Fabrication process mappings | Not present | `lova:chemistryURI` → RXNO, `lova:manufacturingMethodURI` → CHMO (post-processing) |
| FAIR enrichment pipeline | Not present | Two-phase architecture: LLM extracts text identifiers, post-processing resolves to standard URIs |
| Experiment→Material link | `lova:usedMaterial` | Kept (no readable standard equivalent) |
| Domain-specific properties | `lova:` | Kept as `lova:` — no standard covers scaffold geometry, annealing, packing |

## Namespaces

| Prefix | URI | Use |
|--------|-----|-----|
| `lova:` | `https://lovamap.com/ontology#` | Domain-specific classes and properties (material science, scaffold geometry, fabrication) |
| `dc:` | `http://purl.org/dc/terms/` | Paper metadata — title, creator, date, identifier, type, source |
| `foaf:` | `http://xmlns.com/foaf/0.1/` | People — name, familyName, givenName |
| `schema:` | `https://schema.org/` | Affiliations, identifiers, journal membership |
| `bibo:` | `http://purl.org/ontology/bibo/` | Bibliographic types — AcademicArticle, Journal, volume, issue, issn |
| `qudt:` | `http://qudt.org/schema/qudt/` | Measurement values and units |
| `unit:` | `http://qudt.org/vocab/unit/` | Specific QUDT unit instances (e.g. `unit:KiloPA`, `unit:MicroM`) |
| `stato:` | `http://purl.obolibrary.org/obo/STATO_` | Statistical terms (referenced via `owl:equivalentProperty` in ontology header, not used directly in triples) |
| `obo:` | `http://purl.obolibrary.org/obo/` | OBO Foundry ontology terms — ChEBI chemicals, Cell Ontology cell types, RXNO reactions, CHMO methods |
| `rxno:` | `http://purl.obolibrary.org/obo/RXNO_` | Named Reaction Ontology — reaction types (Michael addition, thiol-ene, radical polymerization) |
| `chmo:` | `http://purl.obolibrary.org/obo/CHMO_` | Chemical Methods Ontology — fabrication/manufacturing techniques (emulsion, electrospray, photopolymerization) |
| `pubchem:` | `https://pubchem.ncbi.nlm.nih.gov/compound/` | PubChem compound identifiers — fallback when ChEBI lacks a specific entry |
| `uniprot:` | `https://www.uniprot.org/uniprot/` | UniProt protein entries — for enzyme/protein identity resolution |
| `rdfs:` | `http://www.w3.org/2000/01/rdf-schema#` | Labels, comments |
| `owl:` | `http://www.w3.org/2002/07/owl#` | Ontology declarations, sameAs links |
| `xsd:` | `http://www.w3.org/2001/XMLSchema#` | Datatypes |
| `prov:` | `http://www.w3.org/ns/prov#` | Provenance — how data was extracted |
| `text:` | `http://jena.apache.org/text#` | Jena full-text search (SPARQL queries only, not in stored triples) |

### New in v2
- **`qudt:` / `unit:`** — replaces `lova:value` + `lova:unit` string pairs with structured measurement representation
- **`stato:`** — FAIR equivalence target for statistical properties. Not used directly in triples — instead, `lova:stdDev`, `lova:pValue`, `lova:sampleSize` are declared `owl:equivalentProperty` to their STATO counterparts in the ontology header. This keeps SPARQL readable for LLMs while maintaining interoperability.
- **`obo:`** — umbrella prefix for OBO Foundry ontologies (ChEBI for chemicals, CL for cell types, RXNO for reactions, CHMO for methods)
- **`rxno:` / `chmo:`** — Named Reaction Ontology and Chemical Methods Ontology. Used to map free-text chemistry and fabrication process descriptions to standard terms. Populated by post-processing enrichment, not by the extraction LLM.
- **`pubchem:`** — PubChem compound identifiers. Fallback for chemicals where ChEBI lacks a specific entry (common for functionalized polymers like PEG-VS, GelMA, PEGDA).
- **`uniprot:`** — UniProt protein entries. For resolving enzyme/protein identity beyond EC numbers.
- **`prov:`** — optional provenance tracking for extraction pipeline metadata

### Ontology Header — STATO Equivalences

Load this once into Fuseki alongside your data. It declares that your readable `lova:` statistical properties are equivalent to standard STATO terms, enabling external systems to discover the mapping.

```turtle
@prefix lova:  <https://lovamap.com/ontology#> .
@prefix stato: <http://purl.obolibrary.org/obo/STATO_> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .

lova:stdDev      owl:equivalentProperty  stato:0000237 .
lova:stdErr      owl:equivalentProperty  stato:0000562 .
lova:pValue      owl:equivalentProperty  stato:0000175 .
lova:sampleSize  owl:equivalentProperty  stato:0000088 .
```

## URI Design

URIs are globally unique identifiers. DOI slugs replace `/` with `-` and drop the `https://doi.org/` prefix.

| Entity | URI pattern | Example |
|--------|-------------|---------|
| Paper | `lova:paper/{doi-slug}` | `lova:paper/10.1002-adhm.202300823` |
| Author | `lova:author/{last}-{firstInitial}` | `lova:author/liu-y` |
| Journal | `lova:journal/{slug}` | `lova:journal/advanced-healthcare-materials` |
| Material | `lova:material/{doi-slug}/{id}` | `lova:material/10.1002-adhm.202300823/map-40um` |
| FabricationMethod | `lova:fabrication-method/{doi-slug}/{id}` | `lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii` |
| Reagent | `lova:reagent/{doi-slug}/{id}` | `lova:reagent/10.1002-adhm.202300823/peg-vs-20kda` |
| Experiment | `lova:experiment/{doi-slug}/{id}` | `lova:experiment/10.1002-adhm.202300823/exp1` |
| Outcome | `lova:outcome/{doi-slug}/{id}` | `lova:outcome/10.1002-adhm.202300823/out1` |
| GeometryProfile | `lova:geometry-profile/{doi-slug}/{id}` | `lova:geometry-profile/10.1002-adhm.202300823/map-40um-profile` |
| ComparisonResult | `lova:comparison/{doi-slug}/{id}` | `lova:comparison/10.1002-adhm.202300823/tnf-40-vs-130` |

**New in v2:** `lova:Reagent` entities get their own URIs, scoped to the paper's DOI slug. All other URI patterns are unchanged.

**Note on `lova:` URIs for standard-typed entities:** Papers are typed as `bibo:AcademicArticle` but their URI is still `lova:paper/...`. This is correct — the URI namespace and the `rdf:type` are independent. The `lova:` URI is an identifier we control; the `bibo:` type says what kind of thing it is in a standard vocabulary.

## Ontology Classes

### 1. Paper — `bibo:AcademicArticle`

A published study from which data is extracted. Provenance root.

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `dc:title` | `xsd:string` | Dublin Core | Paper title |
| `dc:identifier` | `xsd:string` | Dublin Core | DOI |
| `dc:date` | `xsd:gYear` | Dublin Core | Publication year |
| `dc:type` | `xsd:string` | Dublin Core | "Research Article", "Review" |
| `schema:isPartOf` | URI → `bibo:Journal` | Schema.org | Journal |
| `dc:creator` | URI → `foaf:Person` | Dublin Core | Author(s), multi-valued (unordered) |
| `bibo:authorList` | `rdf:Seq` of URIs → `foaf:Person` | BIBO | Ordered author list — preserves first-author position |
| `dc:bibliographicCitation` | `xsd:string` | Dublin Core | Short formatted citation for LLM use, e.g. "Liu et al., 2023" |
| `lova:focusMaterial` | `xsd:string` | LOVAMAP | Brief summary of material system studied |
| `lova:hasLabData` | `xsd:boolean` | LOVAMAP | Whether LOVAMAP descriptors exist for scaffolds in this paper |

**Changes from v1:** Type changed from `lova:Paper` to `bibo:AcademicArticle`. `lova:paperType` → `dc:type`. `lova:describedIn` on child entities → `dc:source`. Added `dc:bibliographicCitation` for LLM-friendly citation strings and `bibo:authorList` for ordered authorship.

### 2. Author — `foaf:Person`

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `foaf:familyName` | `xsd:string` | FOAF | Last name |
| `foaf:givenName` | `xsd:string` | FOAF | First name |
| `foaf:name` | `xsd:string` | FOAF | Full name |
| `schema:affiliation` | `xsd:string` | Schema.org | Institution |
| `owl:sameAs` | URI | OWL | ORCID URI when known, e.g. `<https://orcid.org/0000-0002-1234-5678>` |

**Changes from v1:** Type changed from `lova:Author` to `foaf:Person`. Added optional ORCID via `owl:sameAs`.

### 3. Journal — `bibo:Journal`

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `dc:title` | `xsd:string` | Dublin Core | Journal name |
| `bibo:issn` | `xsd:string` | BIBO | ISSN |

**Changes from v1:** Type changed from `lova:Journal` to `bibo:Journal`.

### 4. Material — `lova:Material`

A granular material system as described in a paper. No standard ontology covers this concept adequately.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `dc:source` | URI → `bibo:AcademicArticle` | Source paper |
| `rdfs:label` | `xsd:string` | Human-readable label, e.g. "40 μm PEG-VS MAP scaffold (confining)" |

**Particle Properties**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:particleShape` | `xsd:string` | Particle geometry | "Sphere", "Cylinder", "Cube", "Irregular", "Star" |
| `lova:particleMaterial` | `xsd:string` | Polymer or material name | "PLGA", "GelMA", "Alginate", "PEGDA" |
| `lova:particleMaterialURI` | URI | ChEBI URI for the material (when available) | `obo:CHEBI_53374` |
| `lova:particleSizeMin` | `xsd:double` | Lower bound of size range (μm) | 35.0 |
| `lova:particleSizeMax` | `xsd:double` | Upper bound of size range (μm) | 45.0 |
| `lova:particleSizeUnit` | `xsd:string` | Unit of size | "μm", "mm" |
| `lova:sizeDistribution` | `xsd:string` | Distribution description | "Monodisperse", "Polydisperse 100-500μm" |
| `lova:stiffnessQualitative` | `xsd:string` | Qualitative stiffness | "Rigid", "Soft hydrogel", "Semi-rigid" |
| `lova:stiffnessValue` | `xsd:double` | Quantitative stiffness | 5.0 |
| `lova:stiffnessUnit` | `xsd:string` | Unit for stiffness | "kPa", "MPa", "GPa" |
| `lova:surfaceModification` | `xsd:string` | Coatings, functionalization | "RGD-coated", "Fibronectin-adsorbed" |

**Scaffold / Assembly Properties**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:hasFabricationMethod` | URI → `lova:FabricationMethod` | Link to fabrication method |
| `lova:packingConfiguration` | `xsd:string` | Packing arrangement | "Random", "Hexagonal", "Jammed" |
| `lova:reportedPorosity` | `xsd:double` | Void fraction as reported | 0.35 |
| `lova:reportedPoreSize` | `xsd:string` | Pore size as reported | "50-100 μm" |
| `lova:scaffoldDimensions` | `xsd:string` | Physical dimensions | "8mm diameter × 2mm height" |

**Relational DB Link**

| Property | Type | Description |
|----------|------|-------------|
| `lova:hasGeometryProfile` | URI → `lova:GeometryProfile` | Per-Material match record |
| `lova:scaffoldGroupId` | `xsd:integer` | Direct ScaffoldGroup link (exact matches). Multi-valued. |
| `lova:scaffoldId` | `xsd:integer` | Direct Scaffold link. Optional, multi-valued. |

**Changes from v1:** `lova:describedIn` → `dc:source`. Added optional `lova:particleMaterialURI` for ChEBI links.

### 5. FabricationMethod — `lova:FabricationMethod`

Describes how a granular material was fabricated. No standard ontology covers this.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `dc:source` | URI → `bibo:AcademicArticle` | Source paper |
| `rdfs:label` | `xsd:string` | Human-readable label |

**Manufacturing**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:chemistry` | `xsd:string` | Primary polymerization/crosslinking chemistry | "Michael-type addition (thiol-ene)", "Radical photopolymerization" |
| `lova:chemistryURI` | URI | RXNO term for the reaction type (**post-processing**) | `obo:RXNO_0000017` (Michael addition) |
| `lova:manufacturingMethod` | `xsd:string` | Physical technique | "Microfluidic water-in-oil emulsion", "Batch emulsion", "Electrospray" |
| `lova:manufacturingMethodURI` | URI | CHMO term for the technique (**post-processing**) | `obo:CHMO_0001054` (emulsion polymerization) |
| `lova:annealingChemistry` | `xsd:string` | How particles are bonded into scaffold | "Enzymatic (Factor XIII transglutamination)", "Photoinitiated thiol-ene" |
| `lova:annealingChemistryURI` | URI | RXNO/CHMO term for annealing process (**post-processing**) | `obo:CHMO_0001707` (photopolymerization) |
| `lova:annealingConditions` | `xsd:string` | Annealing parameters | "37°C, 90 min", "UV 365nm 10 min" |

**Reagents (v2 — entity model)**

| Property | Type | Description |
|----------|------|-------------|
| `lova:hasReagent` | URI → `lova:Reagent` | Link to reagent entity. Multi-valued. |

See **Reagent Entity Model** section below for the `lova:Reagent` class definition.

**Changes from v1:** `lova:describedIn` → `dc:source`. All flat reagent properties (`lova:monomer`, `lova:monomerCAS`, `lova:crosslinker`, etc.) replaced by `lova:hasReagent` pointing to `lova:Reagent` entity nodes. Added `lova:chemistryURI`, `lova:manufacturingMethodURI`, `lova:annealingChemistryURI` for post-processing enrichment with RXNO/CHMO terms.

### 6. Experiment — `lova:Experiment`

An experimental protocol linking a material to outcomes. Kept as `lova:Experiment` because OBI equivalents (`obi:OBI_0000070`) have opaque numeric URIs that harm AI-agent readability.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `dc:source` | URI → `bibo:AcademicArticle` | Source paper |
| `lova:usedMaterial` | URI → `lova:Material` | Material studied. Multi-valued. |
| `rdfs:label` | `xsd:string` | Human-readable label |

**Experiment Classification**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:experimentCategory` | `xsd:string` | Broad category | "Mechanical", "Biological", "Rheological" |
| `lova:experimentType` | `xsd:string` | Specific type | "Compression", "Cell viability", "qPCR" |
| `lova:assayOrMethod` | `xsd:string` | Specific assay/technique | "AlamarBlue", "MicroCT", "Flow cytometry" |
| `lova:equipment` | `xsd:string` | Instrument used | "TA Instruments DHR-2" |

**Biological Experiment Details**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:cellType` | `xsd:string` | Cell line or primary cells | "hMSC", "MC3T3-E1", "HUVECs" |
| `lova:cellTypeURI` | URI | Cell Ontology URI (when available) | `obo:CL_0000134` |
| `lova:cellSource` | `xsd:string` | Source organism/tissue | "Human bone marrow" |
| `lova:seedingDensity` | `xsd:string` | Cells seeded | "1×10⁵ cells/scaffold" |
| `lova:cultureDuration` | `xsd:string` | Culture time | "7 days", "1, 3, 7, 14 days" |
| `lova:cultureMedium` | `xsd:string` | Medium composition | "DMEM + 10% FBS" |

**Environmental Conditions**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:temperature` | `xsd:string` | Temperature | "37°C", "Room temperature" |
| `lova:pH` | `xsd:string` | pH | "7.4" |
| `lova:atmosphere` | `xsd:string` | Gas environment | "5% CO2", "Normoxia" |
| `lova:medium` | `xsd:string` | Surrounding medium | "PBS", "DMEM" |
| `lova:strainRate` | `xsd:string` | For mechanical tests | "1 mm/min" |
| `lova:frequency` | `xsd:string` | For rheological tests | "1 Hz" |
| `lova:preconditioning` | `xsd:string` | Sample prep before test | "Swollen in PBS 24h" |
| `lova:sampleSize` | `xsd:integer` | n | 5 |

**Changes from v1:** `lova:describedIn` → `dc:source`. Added optional `lova:cellTypeURI` for Cell Ontology links.

### 7. Outcome — `lova:Outcome`

A measured result. Each outcome is a single metric from a single experiment.

**Identity & Provenance**

| Property | Type | Description |
|----------|------|-------------|
| `lova:fromExperiment` | URI → `lova:Experiment` | Experiment that produced this outcome |
| `dc:source` | URI → `bibo:AcademicArticle` | Source paper (intentionally denormalized for query efficiency) |
| `rdfs:label` | `xsd:string` | Human-readable label |

**Measurement Identity**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:measurementType` | `xsd:string` | What was measured | "Cell viability", "Storage modulus (G')", "TNF secretion" |
| `lova:measurementCategory` | `xsd:string` | Broad category | Same as experiment categories |

**Value — using QUDT**

| Property | Type | Vocabulary | Description |
|----------|------|------------|-------------|
| `qudt:numericValue` | `xsd:double` | QUDT | Numeric value (mean or reported) |
| `qudt:unit` | `xsd:string` | QUDT | Unit of measurement (as string for AI readability; optionally also link to QUDT unit URI) |
| `lova:valueString` | `xsd:string` | LOVAMAP | For non-numeric/complex values, e.g. "5-10 kPa" |

**Statistics** (using `lova:` aliases with `owl:equivalentProperty` → STATO for FAIR compliance)

| Property | Type | STATO equivalent | Description |
|----------|------|------------------|-------------|
| `lova:stdDev` | `xsd:double` | `stato:0000237` | Standard deviation |
| `lova:stdErr` | `xsd:double` | `stato:0000562` | Standard error |
| `lova:sampleSize` | `xsd:integer` | `stato:0000088` | Sample size (n) |
| `lova:pValue` | `xsd:double` | `stato:0000175` | p-value |
| `lova:isSignificant` | `xsd:boolean` | — | Whether reported as statistically significant |
| `lova:comparedToControl` | `xsd:double` | — | Fold change vs. control |

**Scope / Granularity**

| Property | Type | Description | Example values |
|----------|------|-------------|----------------|
| `lova:scope` | `xsd:string` | Spatial granularity | "Bulk/global", "Regional", "Per-pore" |
| `lova:timePoint` | `xsd:string` | When measured | "Day 7", "24h", "Immediate" |
| `lova:isTimeSeries` | `xsd:boolean` | Whether part of a time series | |
| `lova:comparisonGroup` | `xsd:string` | Comparator | "Solid hydrogel", "TCP", "Empty defect" |
| `lova:dataSource` | `xsd:string` | Extraction source | "[TEXT]", "[FIG-Q]", "[FIG-E]" |

**Changes from v1:** `lova:describedIn` → `dc:source`. `lova:value` → `qudt:numericValue`. `lova:unit` → `qudt:unit`. Statistical properties (`lova:stdDev`, `lova:pValue`, etc.) keep their readable `lova:` names but are now declared equivalent to STATO terms via `owl:equivalentProperty` in the ontology header.

### 8. GeometryProfile — `lova:GeometryProfile`

Per-Material match record bridging RDF to relational DB. **Unchanged from v1** — this is entirely domain-specific.

| Property | Type | Description |
|----------|------|-------------|
| `rdfs:label` | `xsd:string` | Human-readable label |
| `lova:matchType` | `xsd:string` | "exact" or "aggregate" |
| `lova:matchDescription` | `xsd:string` | Explanation of match |
| `lova:matchedAt` | `xsd:date` | When match was resolved |
| `lova:scaffoldGroupId` | `xsd:integer` | Matched ScaffoldGroup IDs. Multi-valued. |
| `lova:scaffoldId` | `xsd:integer` | Specific Scaffold IDs. Multi-valued. |
| `lova:scaffoldCount` | `xsd:integer` | Total scaffolds matched |
| `lova:matchSizeMin` | `xsd:double` | Size filter lower bound (only if divergent from Material) |
| `lova:matchSizeMax` | `xsd:double` | Size filter upper bound |
| `lova:matchStiffness` | `xsd:string` | Stiffness filter (only if divergent) |
| `lova:matchMaterial` | `xsd:string` | Material filter (only if divergent) |
| `lova:matchShape` | `xsd:string` | Shape filter (only if divergent) |

### 9. ComparisonResult — `lova:ComparisonResult`

Structured pairwise comparison between outcomes. **Unchanged from v1.**

| Property | Type | Description |
|----------|------|-------------|
| `dc:source` | URI → `bibo:AcademicArticle` | Source paper |
| `rdfs:label` | `xsd:string` | e.g. "TNF lower in 40 μm vs 130 μm MAP" |
| `lova:outcomeA` | URI → `lova:Outcome` | First outcome |
| `lova:outcomeB` | URI → `lova:Outcome` | Second outcome (comparator) |
| `lova:direction` | `xsd:string` | "higher", "lower", "no difference" |
| `lova:pValue` | `xsd:double` | p-value of comparison |
| `lova:isSignificant` | `xsd:boolean` | Statistically significant |
| `lova:foldChange` | `xsd:double` | Fold change of A relative to B |

## Reagent Entity Model

In v1, reagents were flat string pairs on FabricationMethod:

```turtle
# v1 — flat (DEPRECATED)
lova:fab/paper1/fab1
    lova:monomer         "4-arm PEG-VS (20 kDa)" ;
    lova:monomerCAS      "25322-68-3" ;
    lova:crosslinker     "MMP-degradable peptide" ;
    lova:crosslinkerCAS  "custom" ;
    lova:enzyme          "Factor XIII (FXIIIa)" ;
    lova:enzymeEC        "EC 2.3.2.13" ;
    lova:peptide         "RGD (GCGYGRGDSPG)" ;
    lova:peptideRole     "Cell adhesion" .
```

Problems: can't have two monomers cleanly, CAS number is disconnected from its reagent, no way to link to external chemical databases.

### v2 — `lova:Reagent` entity nodes

Each reagent becomes a node linked from FabricationMethod via `lova:hasReagent`.

**Class: `lova:Reagent`**

*LLM-extracted properties (from paper text):*

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `rdfs:label` | `xsd:string` | Human-readable name as it appears in the paper | "4-arm PEG-VS (20 kDa)" |
| `lova:reagentRole` | `xsd:string` | Role in fabrication: "monomer", "crosslinker", "initiator", "surfactant", "enzyme", "peptide", "solvent", "carrier oil", "photoinitiator", "other" | "monomer" |
| `lova:casNumber` | `xsd:string` | CAS registry number, if stated in paper | "25322-68-3" |
| `lova:ecNumber` | `xsd:string` | Enzyme Commission number (enzymes only), if stated | "EC 2.3.2.13" |
| `lova:sequence` | `xsd:string` | Peptide/protein sequence, if stated | "GCGYGRGDSPG" |
| `lova:molecularWeight` | `xsd:string` | Molecular weight as reported in paper (string to preserve units/format) | "20 kDa", "2000 Da" |
| `lova:concentration` | `xsd:string` | Concentration/amount as reported | "10% w/v", "2 mM", "5 mg/mL" |
| `lova:reagentFunction` | `xsd:string` | What this reagent does in the process | "Cell adhesion", "Inter-particle crosslinking" |
| `lova:supplier` | `xsd:string` | Vendor/manufacturer, if stated | "Sigma-Aldrich", "Laysan Bio" |
| `lova:catalogNumber` | `xsd:string` | Vendor catalog/product number, if stated | "HK1002-1KT" |

*Post-processing enrichment properties (added by enrichment pipeline, never by LLM):*

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `owl:sameAs` | URI | Canonical identity link to ChEBI, PubChem, UniProt, or BRENDA | `obo:CHEBI_46793`, `pubchem:24832` |
| `lova:inchiKey` | `xsd:string` | InChIKey resolved from external DB (enables cross-DB deduplication) | "YCOZIPAWZNQLMR-UHFFFAOYSA-N" |

**Example:**

```turtle
lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii
    a                     lova:FabricationMethod ;
    dc:source             lova:paper/10.1002-adhm.202300823 ;
    rdfs:label            "Microfluidic PEG-VS microgels with Factor XIII annealing" ;
    lova:chemistry        "Michael-type addition (thiol-ene)" ;
    lova:manufacturingMethod "Microfluidic water-in-oil emulsion" ;
    lova:annealingChemistry "Enzymatic (Factor XIII transglutamination)" ;
    lova:annealingConditions "37°C, 90 min" ;
    lova:hasReagent       lova:reagent/10.1002-adhm.202300823/peg-vs-20kda ,
                          lova:reagent/10.1002-adhm.202300823/mmp-peptide ,
                          lova:reagent/10.1002-adhm.202300823/span80 ,
                          lova:reagent/10.1002-adhm.202300823/fxiiia ,
                          lova:reagent/10.1002-adhm.202300823/k-peptide ,
                          lova:reagent/10.1002-adhm.202300823/q-peptide ,
                          lova:reagent/10.1002-adhm.202300823/rgd .

lova:reagent/10.1002-adhm.202300823/peg-vs-20kda
    a                     lova:Reagent ;
    rdfs:label            "4-arm PEG-VS (20 kDa)" ;          # [LLM]
    lova:reagentRole      "monomer" ;                         # [LLM]
    lova:casNumber        "25322-68-3" ;                      # [LLM]
    lova:molecularWeight  "20 kDa" ;                          # [LLM]
    owl:sameAs            <http://purl.obolibrary.org/obo/CHEBI_46793> .  # [ENRICH]

lova:reagent/10.1002-adhm.202300823/fxiiia
    a                     lova:Reagent ;
    rdfs:label            "Factor XIII (FXIIIa)" ;            # [LLM]
    lova:reagentRole      "enzyme" ;                          # [LLM]
    lova:ecNumber         "EC 2.3.2.13" ;                     # [LLM]
    lova:reagentFunction  "Annealing (inter-particle crosslinking via K/Q peptides)" .  # [LLM]

lova:reagent/10.1002-adhm.202300823/rgd
    a                     lova:Reagent ;
    rdfs:label            "RGD (Ac-GCGYGRGDSPG-NH2)" ;       # [LLM]
    lova:reagentRole      "peptide" ;                         # [LLM]
    lova:sequence         "GCGYGRGDSPG" ;                     # [LLM]
    lova:reagentFunction  "Cell adhesion" .                   # [LLM]

lova:reagent/10.1002-adhm.202300823/span80
    a                     lova:Reagent ;
    rdfs:label            "Span 80" ;                         # [LLM]
    lova:reagentRole      "surfactant" ;                      # [LLM]
    lova:casNumber        "1338-43-8" .                       # [LLM]
```

### Querying reagents in v2

The entity model makes cross-paper reagent queries natural:

```sparql
# "Which papers use Factor XIII for annealing?"
PREFIX lova: <https://lovamap.com/ontology#>
PREFIX text: <http://jena.apache.org/text#>
SELECT ?paper ?title ?reagentLabel WHERE {
  (?reagent ?score) text:query (rdfs:label "Factor XIII*") .
  ?reagent a lova:Reagent ;
           rdfs:label ?reagentLabel ;
           lova:reagentRole "enzyme" .
  ?fab lova:hasReagent ?reagent ;
       dc:source ?paper .
  ?paper dc:title ?title .
}
```

## Ontology URI Strategy

The principle: **keep human-readable labels for AI querying, add machine-readable URIs as supplementary links.** The label is what the LLM reads and searches; the URI is what enables cross-database joins and FAIR interoperability.

### When to add an ontology URI

Add a URI link when:
- The entity has an unambiguous match in a standard ontology
- The ontology is actively maintained and widely used
- The URI provides value for cross-referencing (e.g., linking to external databases)

Don't force it when:
- The match is approximate or requires interpretation
- The paper's terminology doesn't map cleanly to any standard term
- It would slow down the extraction pipeline significantly

Ontology URIs are always **optional** — a Reagent or Experiment is valid without them. They're added when literature-ai can confidently identify a match.

### Standard ontologies to use

| Domain | Ontology | Prefix | Use for | Example | Populated by |
|--------|----------|--------|---------|---------|-------------|
| Chemicals | ChEBI | `obo:CHEBI_` | Polymers, monomers, crosslinkers, surfactants | `obo:CHEBI_46793` (PEG) | Post-processing |
| Chemicals | PubChem | `pubchem:` | Fallback when ChEBI lacks a specific entry (functionalized polymers) | `pubchem:174` (acetic acid) | Post-processing |
| Cell types | Cell Ontology | `obo:CL_` | Cell lines, primary cells | `obo:CL_0000134` (mesenchymal stem cell) | Post-processing |
| Enzymes | BRENDA / IntEnz | EC number string | Enzymes used in fabrication | `"EC 2.3.2.13"` (captured as `lova:ecNumber`) | LLM extraction |
| Enzymes / Proteins | UniProt | `uniprot:` | Specific protein/enzyme entries | `uniprot:P00488` (Factor XIII) | Post-processing |
| Reactions | RXNO | `obo:RXNO_` | Named reaction types (Michael addition, thiol-ene click) | `obo:RXNO_0000017` | Post-processing |
| Techniques | CHMO | `obo:CHMO_` | Fabrication/manufacturing techniques (emulsion, electrospray) | `obo:CHMO_0001054` | Post-processing |
| People | ORCID | Full ORCID URI | Author persistent identifiers | `<https://orcid.org/0000-0002-1234-5678>` | Post-processing |

### How URIs attach to entities

| Entity | Label property (LLM-extracted) | URI property (post-processing) | Notes |
|--------|-------------------------------|-------------------------------|-------|
| Reagent (chemical) | `rdfs:label` + `lova:casNumber` | `owl:sameAs` → ChEBI or PubChem | The reagent *is* that chemical. CAS/name used for lookup. |
| Reagent (enzyme) | `rdfs:label` + `lova:ecNumber` | `owl:sameAs` → UniProt | EC number is a standard ID; UniProt adds protein-level identity |
| Reagent (peptide) | `rdfs:label` + `lova:sequence` | `owl:sameAs` → UniProt/PDB (if canonical) | Custom peptides often have no DB entry — `owl:sameAs` only when match exists |
| Author | `foaf:name` | `owl:sameAs` → ORCID | The author *is* that person |
| Material polymer | `lova:particleMaterial` | `lova:particleMaterialURI` → ChEBI/PubChem | Separate property since Material isn't the chemical itself |
| Cell type | `lova:cellType` | `lova:cellTypeURI` → CL | Separate property since Experiment isn't the cell |
| Fabrication chemistry | `lova:chemistry` | `lova:chemistryURI` → RXNO | Reaction type mapped to Named Reaction Ontology |
| Manufacturing technique | `lova:manufacturingMethod` | `lova:manufacturingMethodURI` → CHMO | Technique mapped to Chemical Methods Ontology |
| Annealing chemistry | `lova:annealingChemistry` | `lova:annealingChemistryURI` → RXNO/CHMO | Annealing process mapped to standard term |

### For the SPARQL system prompt

The AI agent generating SPARQL doesn't need to know about ChEBI or CL URIs for most queries — it queries by label using `text:query`. The ontology URIs are for:
- External systems doing federated SPARQL
- Data export / publication to repositories
- Future cross-database joins

## FAIR Enrichment Pipeline — Extraction vs. Post-Processing

The LOVAMAP data pipeline has two distinct phases. This separation exists because the LLM extracting data from papers cannot reliably look up external database identifiers — it would hallucinate ChEBI IDs, PubChem CIDs, etc. Instead, the LLM extracts all textual identifiers that appear literally in the paper, and a separate programmatic step resolves those to canonical URIs.

### Phase 1: LLM Extraction (literature-ai)

The extraction LLM reads a paper and produces TTL triples. It should extract **every identifier and descriptor that appears in the paper text**, because this raw information is what the enrichment pipeline uses to resolve external URIs.

**The LLM extraction prompt must explicitly state:** *"Do not attempt to generate ChEBI, PubChem, UniProt, Cell Ontology, RXNO, or CHMO URIs. Only extract identifiers that appear literally in the paper text."*

**What the LLM extracts per entity type:**

| Entity | Properties the LLM must extract | Why it matters for enrichment |
|--------|---------------------------------|-------------------------------|
| **Reagent** | `rdfs:label` (name as written), `lova:reagentRole`, `lova:casNumber`, `lova:ecNumber`, `lova:sequence`, `lova:molecularWeight`, `lova:concentration`, `lova:reagentFunction`, `lova:supplier`, `lova:catalogNumber` | Name + CAS is the primary lookup key for ChEBI/PubChem. MW helps disambiguate (e.g., "PEG 2kDa" vs "PEG 20kDa"). Supplier + catalog number can resolve exact product. |
| **FabricationMethod** | `lova:chemistry` (reaction description), `lova:manufacturingMethod` (technique description), `lova:annealingChemistry` (bonding method), `lova:annealingConditions` | Free-text chemistry/method descriptions are matched against RXNO/CHMO term labels. The more descriptive, the better the match. |
| **Experiment** | `lova:cellType` (name), `lova:cellSource` (species/tissue), `lova:assayOrMethod` | Cell name + source species enables unambiguous Cell Ontology lookup. |
| **Material** | `lova:particleMaterial` (polymer name), `lova:particleSizeMin/Max`, `lova:stiffnessValue` | Polymer name is the lookup key for ChEBI/PubChem. |
| **Author** | `foaf:name`, `foaf:familyName`, `foaf:givenName`, `schema:affiliation` | Name + affiliation enables ORCID lookup via the ORCID API. |

**Key principle:** Extract more rather than less. A property like `lova:supplier "Laysan Bio"` or `lova:molecularWeight "20 kDa"` may seem trivial, but it's often the disambiguating signal that lets the enrichment pipeline pick the right ChEBI entry. If the paper says it, extract it.

### Phase 2: Post-Processing Enrichment

A programmatic script (not an LLM) takes the TTL output from Phase 1 and resolves external identifiers by querying databases via their APIs.

**Enrichment targets and lookup strategy:**

| Target property | Lookup input | API / Database | Strategy |
|----------------|-------------|----------------|----------|
| `owl:sameAs` → ChEBI (on Reagent) | `lova:casNumber` or `rdfs:label` | ChEBI REST API (`/search`) | CAS exact match first; fall back to name search. Verify MW if available. |
| `owl:sameAs` → PubChem (on Reagent) | `lova:casNumber` or `rdfs:label` | PubChem PUG REST (`/compound/name/` or `/compound/xref/RN/`) | Use when ChEBI returns no result. CAS lookup preferred. |
| `owl:sameAs` → UniProt (on Reagent enzyme) | `lova:ecNumber` + `rdfs:label` | UniProt REST API (`/search?query=ec:`) | EC number search, filter by protein name. |
| `lova:inchiKey` (on Reagent) | Resolved from ChEBI or PubChem entry | Same as above | Extract InChIKey from the matched DB entry. Enables cross-DB deduplication. |
| `lova:particleMaterialURI` (on Material) | `lova:particleMaterial` string | ChEBI or PubChem | Same strategy as Reagent chemical lookup. |
| `lova:cellTypeURI` (on Experiment) | `lova:cellType` + `lova:cellSource` | OLS API (`/search?q=&ontology=cl`) | Search Cell Ontology by name. Use species from `cellSource` to disambiguate. |
| `lova:chemistryURI` (on FabricationMethod) | `lova:chemistry` string | OLS API (`/search?q=&ontology=rxno`) | Fuzzy match reaction name against RXNO labels. |
| `lova:manufacturingMethodURI` (on FabricationMethod) | `lova:manufacturingMethod` string | OLS API (`/search?q=&ontology=chmo`) | Fuzzy match technique name against CHMO labels. |
| `lova:annealingChemistryURI` (on FabricationMethod) | `lova:annealingChemistry` string | OLS API (RXNO or CHMO) | Try RXNO first (for reaction type), then CHMO (for technique). |
| `owl:sameAs` → ORCID (on Author) | `foaf:name` + `schema:affiliation` | ORCID public API (`/search`) | Name + affiliation search. Only add if single unambiguous match. |

**Enrichment rules:**

1. **No match → skip.** Never invent or approximate an identifier. A Reagent without `owl:sameAs` is valid; a Reagent with a wrong `owl:sameAs` is harmful.
2. **Ambiguous match → skip.** If a name search returns multiple candidates and CAS/MW can't disambiguate, leave the URI empty. Log it for manual review.
3. **ChEBI preferred over PubChem.** ChEBI is OBO Foundry / FAIR-native. Only fall back to PubChem when ChEBI has no entry for the specific chemical (common for functionalized polymers like PEG-VS, GelMA, PEGDA).
4. **InChIKey always populated when `owl:sameAs` is set.** The InChIKey is the universal chemical deduplication key — if you resolved to ChEBI or PubChem, you can always extract the InChIKey from that entry.
5. **Log all resolutions.** The enrichment script should output a manifest: reagent label → resolved URI → confidence (exact CAS match / name match / skipped). This enables auditing.

### What This Means for the Schema

All URI properties marked **(post-processing)** in this document are:
- Present in the schema definition (so SPARQL queries and downstream systems know they can exist)
- Optional on every entity (a triple is valid without them)
- Never populated by the extraction LLM
- Added by the enrichment pipeline after initial TTL generation
- Auditable via the enrichment manifest

The LLM-extracted text properties (labels, CAS numbers, EC numbers, sequences, molecular weights, concentrations, suppliers) serve a dual purpose:
1. They are the **queryable data** that LLM-based SPARQL agents search against
2. They are the **lookup keys** that the enrichment pipeline uses to resolve external URIs

This is why Phase 1 extraction must be thorough — every piece of identifying information from the paper is a potential input to the enrichment lookup.

## Relationships Diagram

```
                        bibo:Journal
                            ▲
                 schema:isPartOf
                            │
  foaf:Person ◄──dc:creator── bibo:AcademicArticle
   (ORCID*)                 │
                      dc:source
                            │
                    lova:Material ───hasGeometryProfile──► lova:GeometryProfile
                         │  │                                    │
           hasFabricationMethod  particleMaterialURI* → ChEBI  scaffoldGroupIds
                         │  │                                    │
            lova:FabricationMethod                               ▼
              │          │  (chemistryURI* → RXNO       ┌─────────────────────┐
        hasReagent       │   manufacturingMethodURI*    │   Relational DB     │
              │          │   → CHMO                     │  ScaffoldGroup      │
              ▼          │   annealingChemistryURI*     │   └─► Scaffold     │
         lova:Reagent    │   → RXNO/CHMO)              └─────────────────────┘
          (label,        │
           role,         │
           casNumber,    │
           MW, conc,  lova:usedMaterial
           supplier)     │
           ↓ *           │
     owl:sameAs →  lova:Experiment
     ChEBI/PubChem       │  (cellTypeURI* → CL)
     inchiKey*    lova:fromExperiment
                         │
                  lova:Outcome
                   (qudt:numericValue,
                    qudt:unit,
                    STATO stats)
                         │
                lova:outcomeA / lova:outcomeB
                         │
               lova:ComparisonResult

  * = post-processing enrichment (not LLM-extracted)
```

## Migration Checklist

What needs to change across the system to adopt v2.

### 1. TTL Seed Data (3 papers)

Re-generate all TTL files with literature-ai using the v2 schema:

- [ ] Change `a lova:Paper` → `a bibo:AcademicArticle`
- [ ] Change `a lova:Author` → `a foaf:Person`
- [ ] Change `a lova:Journal` → `a bibo:Journal`
- [ ] Replace all `lova:describedIn` → `dc:source`
- [ ] Replace `lova:paperType` → `dc:type`
- [ ] Replace `lova:value` → `qudt:numericValue` on all Outcomes
- [ ] Replace `lova:unit` → `qudt:unit` on all Outcomes
- [ ] Keep `lova:stdDev`, `lova:stdErr`, `lova:pValue`, `lova:sampleSize` as-is in triples (no rename needed)
- [ ] Load ontology header with `owl:equivalentProperty` declarations mapping these to STATO
- [ ] Add `dc:bibliographicCitation` with formatted "FirstAuthor et al., Year" on each Paper
- [ ] Add `bibo:authorList` with ordered `rdf:Seq` of author URIs on each Paper
- [ ] Convert flat reagent properties to `lova:Reagent` entity nodes
- [ ] Ensure all Reagent nodes include `lova:casNumber`, `lova:molecularWeight`, `lova:concentration`, `lova:supplier` when stated in paper
- [ ] Ensure FabricationMethod nodes include detailed `lova:chemistry`, `lova:manufacturingMethod`, `lova:annealingChemistry` text descriptions

### 2. Fuseki Text Index Configuration

Update `fuseki/configuration/lovamap-rdf.ttl` entity map:

- [ ] Add `lova:reagentRole` to indexed fields
- [ ] Add `lova:reagentFunction` to indexed fields
- [ ] Add `lova:sequence` to indexed fields (peptide sequences)
- [ ] Verify `dc:source` doesn't need indexing (it's a URI, not text)
- [ ] Rebuild Lucene index after loading new TTL data

### 3. KnowledgeBaseBackend — QueryService.cs

Update the SPARQL generation system prompt:

- [ ] Update prefix block (add `qudt:`, `stato:`, `unit:`, `obo:` prefixes)
- [ ] Update ontology schema section with v2 property names
- [ ] Update example queries to use `qudt:numericValue`, `dc:source`, etc.
- [ ] Update the `bibo:AcademicArticle`, `foaf:Person`, `bibo:Journal` types in examples
- [ ] Add reagent query examples

### 4. KnowledgeBaseBackend — RdfService.cs

Update SPARQL queries that directly reference old property names:

- [ ] `lova:value` → `qudt:numericValue`
- [ ] `lova:unit` → `qudt:unit`
- [ ] `lova:describedIn` → `dc:source`
- [ ] `lova:Paper` → `bibo:AcademicArticle` in any type filters
- [ ] Any direct reagent property queries → update to entity model

### 5. KnowledgeBaseBackend — DTOs

Update `OntologyDtos.cs` to match new property names:

- [ ] `OutcomeDto`: rename `Value` → map from `qudt:numericValue`, `Unit` → from `qudt:unit`
- [ ] `FabricationMethodDto`: replace flat reagent properties with `List<ReagentDto>`
- [ ] Add `ReagentDto` class

### 6. literature-ai — LLM Extraction (Phase 1)

- [ ] Update extraction schema/template with v2 classes and properties
- [ ] Update TTL generation to produce `lova:Reagent` entity nodes
- [ ] Update extraction prompt to include all new Reagent properties (`lova:casNumber`, `lova:molecularWeight`, `lova:concentration`, `lova:supplier`, `lova:catalogNumber`)
- [ ] Update extraction prompt to explicitly prohibit LLM from generating external DB URIs (ChEBI, PubChem, UniProt, RXNO, CHMO, CL, ORCID)
- [ ] Re-extract the 3 existing papers with the new schema

### 7. Enrichment Pipeline (Phase 2)

Build a post-processing script that takes Phase 1 TTL output and adds external URIs:

- [ ] Implement ChEBI lookup (CAS number → ChEBI ID, with name fallback)
- [ ] Implement PubChem fallback (for chemicals not in ChEBI)
- [ ] Implement InChIKey extraction from resolved ChEBI/PubChem entries
- [ ] Implement Cell Ontology lookup (cell type name + species → CL term)
- [ ] Implement RXNO lookup (chemistry description → RXNO term)
- [ ] Implement CHMO lookup (manufacturing method description → CHMO term)
- [ ] Implement UniProt lookup (EC number → UniProt entry for enzymes)
- [ ] Implement ORCID lookup (author name + affiliation → ORCID)
- [ ] Add enrichment manifest/log output for auditing
- [ ] Add `lova:particleMaterialURI` on Materials (using same ChEBI/PubChem lookup)
- [ ] Add `lova:cellTypeURI` on Experiments
- [ ] Add `lova:chemistryURI`, `lova:manufacturingMethodURI`, `lova:annealingChemistryURI` on FabricationMethods
- [ ] Add `owl:sameAs` on Reagents and Authors
- [ ] Add `lova:inchiKey` on Reagents

### 8. Post-migration

- [ ] Clear Fuseki test dataset and reload enriched TTL files
- [ ] Rebuild Lucene index
- [ ] Run test queries to verify (both label-based and URI-based)
- [ ] Verify enrichment manifest for accuracy
- [ ] Repeat for prod when deploying

## Example TTL — v2 Schema

A condensed example showing one paper with one material, one fabrication method with reagent entities, one experiment, and one outcome.

```turtle
@prefix lova:   <https://lovamap.com/ontology#> .
@prefix dc:     <http://purl.org/dc/terms/> .
@prefix foaf:   <http://xmlns.com/foaf/0.1/> .
@prefix schema: <https://schema.org/> .
@prefix bibo:   <http://purl.org/ontology/bibo/> .
@prefix qudt:   <http://qudt.org/schema/qudt/> .
@prefix obo:    <http://purl.obolibrary.org/obo/> .
@prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix owl:    <http://www.w3.org/2002/07/owl#> .

# ── Paper ──
lova:paper/10.1002-adhm.202300823  a  bibo:AcademicArticle ;
    dc:title       "Microporous Annealed Particle Hydrogel Stiffness..." ;
    dc:identifier  "10.1002/adhm.202300823" ;
    dc:date        "2023"^^xsd:gYear ;
    dc:type        "Research Article" ;
    schema:isPartOf lova:journal/advanced-healthcare-materials ;
    dc:creator     lova:author/liu-y ,
                   lova:author/suarez-arnedo-a ;
    bibo:authorList ( lova:author/liu-y
                      lova:author/suarez-arnedo-a ) ;
    dc:bibliographicCitation "Liu et al., 2023" ;
    lova:focusMaterial  "PEG-VS MAP scaffolds, confining vs unconfining" ;
    lova:hasLabData     true .

# ── Authors ──
lova:author/liu-y  a  foaf:Person ;
    foaf:familyName    "Liu" ;
    foaf:givenName     "Yining" ;
    foaf:name          "Yining Liu" ;
    schema:affiliation "Duke University" ;
    owl:sameAs         <https://orcid.org/0000-0002-XXXX-XXXX> .

# ── Journal ──
lova:journal/advanced-healthcare-materials  a  bibo:Journal ;
    dc:title    "Advanced Healthcare Materials" ;
    bibo:issn   "2192-2659" .

# ── Material ──
lova:material/10.1002-adhm.202300823/map-40um  a  lova:Material ;
    dc:source             lova:paper/10.1002-adhm.202300823 ;
    rdfs:label            "40 μm PEG-VS MAP scaffold (confining)" ;
    lova:particleShape    "Sphere" ;
    lova:particleMaterial "8-arm PEG-VS (40 kDa)" ;
    lova:particleMaterialURI obo:CHEBI_46793 ;
    lova:particleSizeMin  35.0 ;
    lova:particleSizeMax  45.0 ;
    lova:particleSizeUnit "μm" ;
    lova:sizeDistribution "Monodisperse" ;
    lova:stiffnessQualitative "Soft hydrogel" ;
    lova:hasFabricationMethod lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii ;
    lova:packingConfiguration "Jammed" ;
    lova:hasGeometryProfile   lova:geometry-profile/10.1002-adhm.202300823/map-40um-profile .

# ── Fabrication Method ──
lova:fabrication-method/10.1002-adhm.202300823/microfluidic-peg-fxiii  a  lova:FabricationMethod ;
    dc:source                    lova:paper/10.1002-adhm.202300823 ;
    rdfs:label                   "Microfluidic PEG-VS microgels with Factor XIII annealing" ;
    lova:chemistry               "Michael-type addition (thiol-ene)" ;              # [LLM]
    lova:chemistryURI            obo:RXNO_0000017 ;                                 # [ENRICH] — Michael addition
    lova:manufacturingMethod     "Microfluidic water-in-oil emulsion" ;             # [LLM]
    lova:manufacturingMethodURI  obo:CHMO_0001054 ;                                 # [ENRICH] — emulsion polymerization
    lova:annealingChemistry      "Enzymatic (Factor XIII transglutamination)" ;      # [LLM]
    lova:annealingChemistryURI   obo:CHMO_0002745 ;                                 # [ENRICH] — enzymatic crosslinking
    lova:annealingConditions     "37°C, 90 min" ;                                   # [LLM]
    lova:hasReagent              lova:reagent/10.1002-adhm.202300823/peg-vs ,
                                 lova:reagent/10.1002-adhm.202300823/mmp-peptide ,
                                 lova:reagent/10.1002-adhm.202300823/span80 ,
                                 lova:reagent/10.1002-adhm.202300823/fxiiia ,
                                 lova:reagent/10.1002-adhm.202300823/rgd .

# ── Reagent Entities ──
# Properties marked [LLM] are extracted from paper text.
# Properties marked [ENRICH] are added by post-processing enrichment pipeline.

lova:reagent/10.1002-adhm.202300823/peg-vs  a  lova:Reagent ;
    rdfs:label           "4-arm PEG-VS (20 kDa)" ;          # [LLM]
    lova:reagentRole     "monomer" ;                         # [LLM]
    lova:casNumber       "25322-68-3" ;                      # [LLM] — from paper
    lova:molecularWeight "20 kDa" ;                          # [LLM] — from paper
    lova:concentration   "10% w/v" ;                         # [LLM] — from paper
    lova:supplier        "Laysan Bio" ;                      # [LLM] — from paper
    lova:reagentFunction "Backbone polymer" ;                # [LLM]
    owl:sameAs           obo:CHEBI_46793 ;                   # [ENRICH] — resolved via CAS lookup
    lova:inchiKey        "YCOZIPAWZNQLMR-UHFFFAOYSA-N" .    # [ENRICH] — from ChEBI entry

lova:reagent/10.1002-adhm.202300823/mmp-peptide  a  lova:Reagent ;
    rdfs:label           "MMP-degradable peptide (GCRDVPMS↓MRGGDRCG)" ;  # [LLM]
    lova:reagentRole     "crosslinker" ;                     # [LLM]
    lova:sequence        "GCRDVPMSMRGGDRCG" ;                # [LLM]
    lova:reagentFunction "Enzymatically degradable crosslink" .  # [LLM]
    # No owl:sameAs — custom peptide, no canonical DB entry

lova:reagent/10.1002-adhm.202300823/span80  a  lova:Reagent ;
    rdfs:label           "Span 80" ;                         # [LLM]
    lova:reagentRole     "surfactant" ;                      # [LLM]
    lova:casNumber       "1338-43-8" ;                       # [LLM]
    owl:sameAs           obo:CHEBI_32372 .                   # [ENRICH] — resolved via CAS lookup

lova:reagent/10.1002-adhm.202300823/fxiiia  a  lova:Reagent ;
    rdfs:label           "Factor XIII (FXIIIa)" ;            # [LLM]
    lova:reagentRole     "enzyme" ;                          # [LLM]
    lova:ecNumber        "EC 2.3.2.13" ;                     # [LLM]
    lova:reagentFunction "Annealing (inter-particle crosslinking)" ;  # [LLM]
    owl:sameAs           <https://www.uniprot.org/uniprot/P00488> .   # [ENRICH] — resolved via EC number

lova:reagent/10.1002-adhm.202300823/rgd  a  lova:Reagent ;
    rdfs:label           "RGD (Ac-GCGYGRGDSPG-NH2)" ;       # [LLM]
    lova:reagentRole     "peptide" ;                         # [LLM]
    lova:sequence        "GCGYGRGDSPG" ;                     # [LLM]
    lova:reagentFunction "Cell adhesion" .                   # [LLM]
    # No owl:sameAs — short adhesion motif, no single canonical DB entry

# ── Experiment ──
lova:experiment/10.1002-adhm.202300823/tnf-secretion  a  lova:Experiment ;
    dc:source              lova:paper/10.1002-adhm.202300823 ;
    lova:usedMaterial      lova:material/10.1002-adhm.202300823/map-40um ;
    rdfs:label             "TNF-α secretion by BMDMs on 40 μm MAP" ;
    lova:experimentCategory "Biochemical" ;
    lova:experimentType    "Cytokine secretion" ;
    lova:assayOrMethod     "ELISA" ;
    lova:cellType          "BMDM" ;
    lova:cellTypeURI       obo:CL_0000235 ;
    lova:cellSource        "Murine bone marrow" ;
    lova:cultureDuration   "24h" ;
    lova:sampleSize        5 .

# ── Outcome ──
lova:outcome/10.1002-adhm.202300823/tnf-secretion-40um  a  lova:Outcome ;
    lova:fromExperiment    lova:experiment/10.1002-adhm.202300823/tnf-secretion ;
    dc:source              lova:paper/10.1002-adhm.202300823 ;
    rdfs:label             "TNF-α secretion at 24h — 40 μm MAP — reduced vs 130 μm" ;
    lova:measurementType   "TNF-α secretion" ;
    lova:measurementCategory "Biochemical" ;
    qudt:numericValue      150.0 ;
    qudt:unit              "pg/mL" ;
    lova:stdDev            25.0 ;
    lova:sampleSize        5 ;
    lova:pValue            0.001 ;
    lova:isSignificant     true ;
    lova:scope             "Bulk/global" ;
    lova:timePoint         "24h" ;
    lova:comparisonGroup   "130 μm MAP" ;
    lova:dataSource        "[FIG-Q]" .

# ── GeometryProfile ──
lova:geometry-profile/10.1002-adhm.202300823/map-40um-profile  a  lova:GeometryProfile ;
    rdfs:label            "Match record for 40 μm PEG MAP" ;
    lova:matchType        "aggregate" ;
    lova:matchDescription "Scaffold groups with spherical PEG particles, mean size ~40 μm" ;
    lova:matchSizeMin     35.0 ;
    lova:matchSizeMax     45.0 ;
    lova:scaffoldCount    0 .
```

### Key differences from v1 visible here

1. **Types**: `bibo:AcademicArticle`, `foaf:Person`, `bibo:Journal` — not `lova:Paper/Author/Journal`
2. **Provenance**: `dc:source` everywhere — not `lova:describedIn`
3. **Measurements**: `qudt:numericValue` + `qudt:unit` — not `lova:value` + `lova:unit`
4. **Statistics**: `lova:stdDev`, `lova:pValue`, `lova:sampleSize` — same readable names as v1, now backed by `owl:equivalentProperty` → STATO for FAIR interoperability
5. **Reagents**: Entity nodes via `lova:hasReagent` — not flat `lova:monomer` + `lova:monomerCAS` pairs
6. **Cross-references**: `owl:sameAs` ChEBI/ORCID, `lova:cellTypeURI` CL, `lova:particleMaterialURI` ChEBI
