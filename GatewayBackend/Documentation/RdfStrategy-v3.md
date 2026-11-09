# LOVAMAP RDF Schema v3 — Analytical Queryability Refactor

2026-11-03

## Motivation

v2 was designed for **human-facing Q&A**: a user asks a question, an LLM generates a SPARQL query, Fuseki returns results, and an LLM summarizes them. It works well for this use case.

v3 addresses a different requirement: **programmatic hypothesis mining** — automated analysis pipelines that aggregate across papers to identify which material properties, fabrication methods, and design choices are systematically associated with better biological outcomes.

When we attempted this analysis on the v2 schema, we discovered a critical structural gap that makes cross-paper quantitative analysis unreliable. This document describes the problem, the fix, and additional improvements discovered during analysis.

## The Core Problem: Outcome → Material Ambiguity

### What happens in v2

The v2 relationship chain for connecting a comparison result to its materials is:

```
ComparisonResult
  ├─ lova:outcomeA → Outcome
  │    └─ lova:fromExperiment → Experiment
  │         └─ lova:usedMaterial → [Material_1, Material_2, ...]
  └─ lova:outcomeB → Outcome
       └─ lova:fromExperiment → Experiment
            └─ lova:usedMaterial → [Material_1, Material_2, ...]
```

The problem is at the `Experiment → Material` link. An experiment that compares two materials (e.g., "MAP scaffold vs. non-porous gel") lists **both** materials via `lova:usedMaterial`. When an analysis pipeline traces outcomeA back through the experiment to find which material it's about, it retrieves **all** materials in that experiment — not just the one outcomeA measured.

### Concrete example

From Griffin et al., 2015 (10.1038/nmat4294):

```turtle
# The experiment lists BOTH materials
lova:experiment/.../degradation-kinetics  a  lova:Experiment ;
    lova:usedMaterial  lova:material/.../map-general ,
                       lova:material/.../non-porous-350pa ;
    rdfs:label "In vitro degradation kinetics: MAP vs. non-porous gel" .

# OutcomeA is specifically about the MAP gel
lova:outcome/.../degradation-map-4hr  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/.../degradation-kinetics ;
    rdfs:label "% Degradation, MAP gel, 4 hours" ;
    qudt:numericValue 40.0 .

# OutcomeB is specifically about the non-porous gel
lova:outcome/.../degradation-nonporous-4hr  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/.../degradation-kinetics ;
    rdfs:label "% Degradation, Non-porous gel, 4 hours" ;
    qudt:numericValue 25.0 .

# The comparison says outcomeA > outcomeB
lova:comparison/.../degradation-map-vs-nonporous  a  lova:ComparisonResult ;
    lova:outcomeA  lova:outcome/.../degradation-map-4hr ;
    lova:outcomeB  lova:outcome/.../degradation-nonporous-4hr ;
    lova:direction "higher" .
```

**The problem**: A SPARQL query asking "which material had higher degradation?" traces outcomeA → experiment → usedMaterial and gets **both** `map-general` AND `non-porous-350pa`. The same happens for outcomeB. So both materials appear on both sides of every comparison, and all win rates collapse to ~50%.

The material identity is currently encoded only in the `rdfs:label` text ("% Degradation, **MAP gel**, 4 hours"), which is not machine-queryable.

### Impact on analysis

Across 92 papers with 859 comparisons, **every material property showed approximately 50% win rate** — particle materials, packing configurations, shapes, and surface modifications. This made the entire win-rate analysis, hypothesis scoring, and material ranking uninformative. The data is there, but the schema doesn't expose it in a queryable way.

## v3 Changes

### Change 1: Add `lova:aboutMaterial` on Outcome (CRITICAL)

**New property on `lova:Outcome`:**

| Property | Type | Description |
|----------|------|-------------|
| `lova:aboutMaterial` | URI → `lova:Material` | The specific material this outcome measured. Single-valued. |

**Rules for the extraction LLM:**

- Every Outcome that is specific to a single material MUST have `lova:aboutMaterial` pointing to that material's URI.
- If an outcome is a global/aggregate measurement not specific to any single material (e.g., "overall scaffold porosity" when there's only one material in the experiment), `lova:aboutMaterial` should still be set if the material is identifiable.
- If an outcome genuinely cannot be attributed to a single material (rare), omit the property.
- `lova:fromExperiment` is **retained** — it still serves its original purpose of linking outcomes to experimental protocols, conditions, cell types, etc. The two properties are complementary, not redundant.

**Example — v3 outcome:**

```turtle
lova:outcome/.../degradation-map-4hr  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/.../degradation-kinetics ;
    lova:aboutMaterial   lova:material/.../map-general ;          # ← NEW in v3
    dc:source            lova:paper/10.1038-nmat4294 ;
    rdfs:label           "% Degradation, MAP gel, 4 hours" ;
    lova:measurementType "% Degradation" ;
    lova:measurementCategory "Degradation" ;
    qudt:numericValue    40.0 ;
    qudt:unit            "%" ;
    lova:timePoint       "4 hrs" ;
    lova:dataSource      "[FIG-Q]" .
```

**Why this fixes the analysis:**

With `lova:aboutMaterial`, the analysis pipeline can now directly query:

```sparql
SELECT ?matLabel ?direction ?significant
WHERE {
  ?cmp  a lova:ComparisonResult ;
        lova:outcomeA ?outA ;
        lova:direction ?direction .
  OPTIONAL { ?cmp lova:isSignificant ?significant }
  ?outA lova:aboutMaterial ?mat .
  ?mat  rdfs:label ?matLabel .
}
```

No ambiguity. OutcomeA links to exactly one material. Win rates become meaningful.

### Change 2: Add `lova:aboutMaterial` on ComparisonResult (RECOMMENDED)

For convenience in queries that only need the comparison level (without drilling into outcomes), add direct material links on ComparisonResult:

| Property | Type | Description |
|----------|------|-------------|
| `lova:materialA` | URI → `lova:Material` | Material that outcomeA is about |
| `lova:materialB` | URI → `lova:Material` | Material that outcomeB is about (comparator) |

**Example:**

```turtle
lova:comparison/.../degradation-map-vs-nonporous  a  lova:ComparisonResult ;
    dc:source      lova:paper/10.1038-nmat4294 ;
    rdfs:label     "MAP gel degrades faster than non-porous gel at 4 hours" ;
    lova:outcomeA  lova:outcome/.../degradation-map-4hr ;
    lova:outcomeB  lova:outcome/.../degradation-nonporous-4hr ;
    lova:materialA lova:material/.../map-general ;         # ← NEW in v3
    lova:materialB lova:material/.../non-porous-350pa ;    # ← NEW in v3
    lova:direction "higher" ;
    lova:isSignificant true .
```

**Why:** This is intentional denormalization (same pattern as `dc:source` on Outcomes — noted as "intentionally denormalized for query efficiency" in v2). It saves a two-hop join in every comparison query, which matters when running aggregate analysis across all 859+ comparisons.

**Rules for the extraction LLM:**
- `lova:materialA` MUST match the material that `lova:outcomeA.lova:aboutMaterial` points to.
- `lova:materialB` MUST match the material that `lova:outcomeB.lova:aboutMaterial` points to.
- If either outcome has no `lova:aboutMaterial` (rare), omit the corresponding property on the comparison.

### Change 3: Normalize `lova:direction` values (RECOMMENDED)

In v2, `lova:direction` has inconsistent values across TTL files. The following were found in the dataset:

| Value | Count |
|-------|-------|
| `"higher"` | 529 |
| `"lower"` | 230 |
| `"no difference"` | 91 |
| `"higher degradation rate"` | 4 |

The value `"higher degradation rate"` breaks automated analysis because it doesn't match the standard enum.

**v3 rule:** `lova:direction` MUST be one of exactly three values:
- `"higher"` — outcomeA has a higher value than outcomeB
- `"lower"` — outcomeA has a lower value than outcomeB
- `"no difference"` — no significant difference between outcomeA and outcomeB

Any qualitative context (like "degradation rate") should be captured in the `rdfs:label` or `lova:measurementType`, not in the direction value.

**Extraction LLM instruction:** The `lova:direction` field describes the mathematical relationship between the two numeric values (A vs B). It is NOT a description of the biological meaning. Use ONLY "higher", "lower", or "no difference".

### Change 4: Normalize `lova:particleMaterial` values (RECOMMENDED)

The v2 dataset contains many variant spellings of the same material that prevent aggregation. Examples found:

| Intended material | Variants in dataset |
|---|---|
| Hyaluronic acid (HA) | "Hyaluronic acid (HA)", "Hyaluronic acid", "HA", "Hyaluronic acid (HA)-MMP hydrogel" |
| HA-Norbornene | "Hyaluronic acid-norbornene (HA-NB)", "HA-NB", "HA-Norb (hyaluronic acid-norbornene)" |
| HA-Acrylate | "Acrylated hyaluronic acid (HA-AC)", "Acrylated hyaluronic acid (HA-Ac)", "Hyaluronic acid (HA), acrylate-modified (HA-Ac)", "Acrylated hyaluronic acid (60 kDa, 13% acrylate modification)" |
| PEG-VS | "PEG-VS", "4-arm PEG-VS", "4-arm PEG-vinyl sulfone (PEG-VS, 20 kDa)", "4-arm PEG-VS MW 20,000", "Four-arm PEG-vinyl sulfone (PEG-VS)", "4-arm PEG-vinylsulfone (20 kDa)", "8-arm PEG Vinylsulfone (20 kDa)", "8-arm PEG-VS" |

This fragmentation means cross-paper aggregation is unreliable — the same material system appears as 5+ different strings across papers.

**v3 approach — two-tier naming:**

| Property | Type | Description | Example |
|---|---|---|---|
| `lova:particleMaterial` | `xsd:string` | **Canonical short name** — standardized across all papers | `"PEG-VS"`, `"HA-NB"`, `"HA-AC"` |
| `lova:particleMaterialDetail` | `xsd:string` | **Paper-specific detail** — includes MW, arm count, modification % | `"4-arm PEG-VS (20 kDa)"`, `"HA-NB (100 kDa, 20% modification)"` |

**Rules for the extraction LLM:**

- `lova:particleMaterial` should use the **shortest unambiguous canonical name** for the base material. Refer to the canonical material list below.
- `lova:particleMaterialDetail` captures paper-specific formulation details (molecular weight, arm count, modification degree, etc.).
- If a material does not appear in the canonical list, use its most common short name and note it for list expansion.

**Canonical material list (initial — extend as needed):**

| Canonical name | Covers |
|---|---|
| `PEG-VS` | All PEG-vinyl sulfone variants (4-arm, 8-arm, any MW) |
| `PEG-MAL` | PEG-maleimide variants |
| `PEG-NB` | PEG-norbornene variants |
| `PEG-DA` | PEG-diacrylate variants |
| `HA` | Unmodified hyaluronic acid |
| `HA-AC` | Acrylated hyaluronic acid |
| `HA-NB` | Norbornene-modified hyaluronic acid |
| `GelMA` | Gelatin methacryloyl |
| `Alginate` | Alginate variants |
| `Polystyrene` | Polystyrene beads/particles |
| `PLGA` | Poly(lactic-co-glycolic acid) |
| `Fibrin` | Fibrin/fibrinogen-based |
| `Collagen` | Collagen-based |
| `Titanium` | Titanium and Ti alloys |

### Change 5: Normalize `lova:packingConfiguration` values (RECOMMENDED)

Similar fragmentation issue. Examples:

| Intended concept | Variants in dataset |
|---|---|
| Random jammed packing | "Jammed", "Random, jammed", "Random/jammed", "Random packing (jammed)", "Jammed, annealed microgel packing", "Annealed random jammed packing", "Random, annealed, jammed" |
| Bulk/non-porous | "Bulk (non-porous)", "Non-porous (bulk gel)", "Nonporous bulk gel", "None (bulk/non-porous)", "Not applicable (bulk hydrogel)", "N/A (bulk continuous gel)", "Nonporous", "None (solid, non-porous)" |

**v3 approach — same two-tier pattern:**

| Property | Type | Description | Example |
|---|---|---|---|
| `lova:packingConfiguration` | `xsd:string` | **Canonical name** | `"Jammed"`, `"Random"`, `"Hexagonal"`, `"Non-porous"` |
| `lova:packingDetail` | `xsd:string` | **Paper-specific detail** | `"Random jammed, annealed with FXIIIa"` |

**Canonical packing list:**

| Canonical name | Covers |
|---|---|
| `Jammed` | All jammed/annealed particle packings |
| `Random` | Random non-jammed packings |
| `Hexagonal` | Hexagonal close-packed or templated |
| `Square` | Square lattice packings |
| `Non-porous` | Bulk gels, solid hydrogels, non-particulate controls |
| `2D` | 2D monolayers, flat substrates |

### Change 6: Normalize `lova:annealingChemistry` values (RECOMMENDED)

Same fragmentation. Factor XIII annealing alone has 10+ variant strings:

- "Enzymatic (Factor XIII / thrombin crosslinking)"
- "Enzymatic (Factor XIII transglutamination)"
- "Enzymatic (Thrombin/Factor XIII transglutamination)"
- "Enzymatic (Factor XIIIa transglutamination)"
- "Enzymatic (FXIIIa and thrombin added to mimic microgel condition)"
- etc.

**v3 approach:** Same two-tier pattern with `lova:annealingChemistry` (canonical) and `lova:annealingDetail` (paper-specific).

## Summary of All Changes

| # | Change | Priority | Type | Description |
|---|--------|----------|------|-------------|
| 1 | `lova:aboutMaterial` on Outcome | **CRITICAL** | New property | Links each outcome to its specific material |
| 2 | `lova:materialA`/`lova:materialB` on ComparisonResult | Recommended | New properties | Denormalized material links for efficient comparison queries |
| 3 | Normalize `lova:direction` | Recommended | Constraint | Restrict to "higher"/"lower"/"no difference" |
| 4 | Normalize `lova:particleMaterial` | Recommended | Convention + new property | Canonical short names + `lova:particleMaterialDetail` for specifics |
| 5 | Normalize `lova:packingConfiguration` | Recommended | Convention + new property | Canonical names + `lova:packingDetail` for specifics |
| 6 | Normalize `lova:annealingChemistry` | Recommended | Convention + new property | Canonical names + `lova:annealingDetail` for specifics |

## Migration Impact

### What needs to change in TTL generation

1. **Outcome extraction**: The LLM must identify which specific material each outcome pertains to and emit `lova:aboutMaterial` pointing to that material's URI.
2. **Comparison extraction**: The LLM must emit `lova:materialA` and `lova:materialB` on each ComparisonResult.
3. **Material naming**: The LLM must use canonical `lova:particleMaterial` values from the provided list, with detail in `lova:particleMaterialDetail`.
4. **Direction values**: The LLM must use only "higher", "lower", or "no difference" for `lova:direction`.
5. **Packing/annealing naming**: Same canonical normalization.

### What needs to change in the query system

1. **QueryService system prompt**: Update schema documentation to include new properties.
2. **Fuseki text index**: Add `lova:aboutMaterial` and `lova:particleMaterialDetail` to indexed fields if text search is desired.

### Backward compatibility

v3 is **additive** — all new properties are additions, not replacements. Existing v2 TTL files remain valid. However, they will lack `lova:aboutMaterial` and material normalization, so analysis pipelines should handle missing values gracefully.

**Recommended migration strategy**: Re-generate all 92 TTL files with v3 rules. Given that the files are LLM-generated, this means updating the extraction prompt and re-running against the same papers.

## Example TTL — v3 Schema

Condensed example showing the new properties (additions to v2 marked with `# ← v3`):

```turtle
# ── Material ──
lova:material/.../map-general  a  lova:Material ;
    dc:source              lova:paper/10.1038-nmat4294 ;
    rdfs:label             "MAP scaffold (PEG-VS microgel building blocks, FXIIIa annealed)" ;
    lova:particleShape     "Sphere" ;
    lova:particleMaterial  "PEG-VS" ;                                          # ← v3: canonical
    lova:particleMaterialDetail "4-arm PEG-VS (20 kDa)" ;                     # ← v3: paper-specific
    lova:packingConfiguration "Jammed" ;                                       # ← v3: canonical
    lova:packingDetail     "Random jammed, annealed with FXIIIa" ;             # ← v3: paper-specific
    lova:surfaceModification "RGD-coated" ;
    lova:hasFabricationMethod lova:fabrication-method/.../microfluidic-peg-fxiii .

# ── Experiment (unchanged from v2) ──
lova:experiment/.../degradation-kinetics  a  lova:Experiment ;
    dc:source        lova:paper/10.1038-nmat4294 ;
    lova:usedMaterial lova:material/.../map-general ,
                      lova:material/.../non-porous-350pa ;
    rdfs:label       "In vitro degradation kinetics: MAP vs. non-porous gel" ;
    lova:experimentCategory "Degradation" ;
    lova:experimentType "Enzymatic degradation" .

# ── Outcome A (v3: has aboutMaterial) ──
lova:outcome/.../degradation-map-4hr  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/.../degradation-kinetics ;
    lova:aboutMaterial   lova:material/.../map-general ;                       # ← v3: CRITICAL
    dc:source            lova:paper/10.1038-nmat4294 ;
    rdfs:label           "% Degradation, MAP gel, 4 hours" ;
    lova:measurementType "% Degradation" ;
    lova:measurementCategory "Degradation" ;
    qudt:numericValue    40.0 ;
    qudt:unit            "%" ;
    lova:timePoint       "4 hrs" ;
    lova:dataSource      "[FIG-Q]" .

# ── Outcome B (v3: has aboutMaterial) ──
lova:outcome/.../degradation-nonporous-4hr  a  lova:Outcome ;
    lova:fromExperiment  lova:experiment/.../degradation-kinetics ;
    lova:aboutMaterial   lova:material/.../non-porous-350pa ;                  # ← v3: CRITICAL
    dc:source            lova:paper/10.1038-nmat4294 ;
    rdfs:label           "% Degradation, Non-porous gel, 4 hours" ;
    lova:measurementType "% Degradation" ;
    lova:measurementCategory "Degradation" ;
    qudt:numericValue    25.0 ;
    qudt:unit            "%" ;
    lova:timePoint       "4 hrs" ;
    lova:dataSource      "[FIG-Q]" .

# ── Comparison (v3: has materialA/materialB, normalized direction) ──
lova:comparison/.../degradation-map-vs-nonporous  a  lova:ComparisonResult ;
    dc:source      lova:paper/10.1038-nmat4294 ;
    rdfs:label     "MAP gel degrades faster than non-porous gel at 4 hours" ;
    lova:outcomeA  lova:outcome/.../degradation-map-4hr ;
    lova:outcomeB  lova:outcome/.../degradation-nonporous-4hr ;
    lova:materialA lova:material/.../map-general ;                             # ← v3
    lova:materialB lova:material/.../non-porous-350pa ;                        # ← v3
    lova:direction "higher" ;                                                  # ← v3: normalized
    lova:isSignificant true .
```

## Analytical Queries Enabled by v3

### 1. Material win rates (impossible in v2, trivial in v3)

```sparql
SELECT ?matLabel (COUNT(?cmp) AS ?wins)
WHERE {
  ?cmp  a lova:ComparisonResult ;
        lova:materialA ?mat ;
        lova:direction "higher" ;
        lova:isSignificant true .
  ?mat  rdfs:label ?matLabel .
}
GROUP BY ?matLabel
ORDER BY DESC(?wins)
```

### 2. Material × outcome category matrix

```sparql
SELECT ?particleMat ?measCat (COUNT(?cmp) AS ?sig_wins)
WHERE {
  ?cmp  a lova:ComparisonResult ;
        lova:materialA ?mat ;
        lova:outcomeA ?out ;
        lova:isSignificant true .
  ?mat  lova:particleMaterial ?particleMat .
  ?out  lova:measurementCategory ?measCat .
}
GROUP BY ?particleMat ?measCat
ORDER BY DESC(?sig_wins)
```

### 3. Cross-paper material performance

```sparql
SELECT ?particleMat (COUNT(DISTINCT ?paper) AS ?papers) (COUNT(?cmp) AS ?wins)
WHERE {
  ?cmp  a lova:ComparisonResult ;
        lova:materialA ?mat ;
        lova:isSignificant true ;
        dc:source ?paper .
  ?mat  lova:particleMaterial ?particleMat .
}
GROUP BY ?particleMat
ORDER BY DESC(?papers)
```

## Appendix: Link Ambiguity Audit

To ensure v3 addresses all structural gaps (not just the most visible one), we audited every relationship link in the schema for similar ambiguity issues.

### Experiment → Material: CONFIRMED CRITICAL (Change 1 fixes this)

**550 out of 905 experiments (61%)** list more than one material via `lova:usedMaterial`. This confirms the Outcome → Material ambiguity is not an edge case — it affects the majority of the dataset. Without `lova:aboutMaterial`, programmatic analysis cannot determine which material any given outcome is about for 61% of experiments.

### Material → FabricationMethod: NO ISSUE

Only 3 materials across all 92 papers reference more than one `lova:hasFabricationMethod`. In each case, this reflects a legitimate multi-step fabrication process (e.g., microfluidic generation followed by thermal annealing). The `lova:hasFabricationMethod` link is on `lova:Material` itself, so there is no ambiguity — each material directly lists its own fabrication methods.

**No schema change needed.**

### Experiment → CellType: NORMALIZATION ISSUE

78 experiments contain comma-separated `lova:cellType` strings (e.g., `"HDF, HUVEC"` instead of two separate triples). This doesn't cause the same structural ambiguity as the Outcome → Material issue, but it does prevent clean aggregation by cell type.

**Recommendation (not blocking for v3 but noted for extraction LLM guidance):** Each cell type should be a separate triple:

```turtle
# Instead of:
lova:experiment/... lova:cellType "HDF, HUVEC" .

# Use:
lova:experiment/... lova:cellType "HDF" ;
                    lova:cellType "HUVEC" .
```

This is a convention/extraction LLM instruction rather than a schema change — the RDF property is already multi-valued capable.

### Other links audited (no issues found)

- **Outcome → Experiment** (`lova:fromExperiment`): Single-valued, no ambiguity.
- **ComparisonResult → Outcome** (`lova:outcomeA`/`lova:outcomeB`): Single-valued, no ambiguity.
- **FabricationMethod → Reagent** (`lova:usedReagent`): Multi-valued but unambiguous — reagents belong to the fabrication method, not to a specific step.
- **Paper → everything** (`dc:source`): Denormalized on most entities, no ambiguity.
