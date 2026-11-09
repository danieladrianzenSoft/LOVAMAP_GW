# LOVAMAP RDF Schema v4 — Statistical Rigor & Data Completeness

2026-11-05

## Motivation

v3 solved the **structural** problem: outcomes can now be linked to specific materials via `lova:aboutMaterial`, enabling programmatic comparison mining. The hypothesis mining and generation notebooks (`hypothesis_mining.ipynb`, `hypothesis_generation.ipynb`) successfully run against v3 data and produce ranked hypotheses.

v4 addresses three problems discovered during analysis of the v3 results:

1. **Data completeness gaps** — 56% of comparisons (483/859) are "UNSTRUCTURED," meaning the parameter diff engine cannot identify what material property differs between the two sides. Our audit reveals this breaks down into three distinct causes, two of which are fixable.

2. **Outcome granularity** — The current `lova:measurementCategory` groups everything into coarse buckets like "Biological" (1,755 outcomes, 541 unique measurement types). This makes hypothesis mining useless at the biological level — "HA-AC wins for Biological outcomes" doesn't tell you whether it improves vascularization, reduces inflammation, or promotes wound healing. These are very different biological processes with different clinical implications.

3. **Outcome directionality bug** — The pipeline assumes outcomeA is always the "winner." But `lova:direction` is purely mathematical ("higher"/"lower"), not semantic ("better"/"worse"). There is no field that captures which side the paper says performed better, or whether higher/lower is desirable for a given metric. This means losses are counted as wins for metrics where the desirable direction is opposite to the mathematical direction. This likely explains the ~50% win rates seen across most properties.

4. **Methodological limitations** — The current analysis uses vote counting (tallying wins/losses), the weakest form of meta-analysis. The data already supports substantially better methods, but the schema lacks fields to capture the statistics needed for proper effect-size meta-analysis.

## Part 1: The UNSTRUCTURED Problem

### What "UNSTRUCTURED" means

The `hypothesis_generation.ipynb` notebook has a parameter diff engine that, for each pairwise comparison, checks 9 structured properties on Material A vs Material B (particleShape, packing, surfaceModification, stiffness, sizeMin, sizeMax, annealingChemistry, manufacturingMethod, particleMaterial). If both sides have a value and they differ, that property is flagged as the "driver" of the comparison.

When NONE of the 9 properties differ (or data is missing), the comparison is labeled "UNSTRUCTURED" — the notebook cannot determine what was actually being compared.

### Audit results

We audited all 483 UNSTRUCTURED comparisons. They break down into three categories:

| Category | Count | % of UNSTRUCTURED | Root cause |
|---|---|---|---|
| Same material URI on both sides | 257 | 53% | Not a material comparison at all |
| Different materials, asymmetric property coverage | 155 | 32% | Control/comparator materials under-annotated |
| Missing `materialA`/`materialB` links entirely | 33 | 7% | v3 links not populated |
| Missing `particleMaterial` field | 34 | 7% | Base material identity not captured |

#### Category 1: Same material on both sides (257 comparisons)

These are comparisons of different **experimental conditions**, not different materials. The two outcomes reference the exact same material URI. Examples:

- Time-point comparisons: "vessel density at 3 weeks vs 6 weeks"
- Dose comparisons: "N/P ratio 7 vs N/P ratio 12"
- Treatment vs control: "with blocking antibody vs without"

Breakdown by what's actually being compared:

| Condition type | Count |
|---|---|
| Time point | 73 |
| Dose/concentration | 48 |
| Other experimental condition | 96 |
| Gene delivery/expression | 16 |
| Treatment vs control | 15 |
| Cell-related | 9 |

**These are not a data quality problem.** They are valid comparisons that the diff engine correctly identifies as having no material differences — because the materials ARE the same. They should be excluded from material-focused hypothesis mining.

**Fix — Change 7: Add `lova:comparisonType` on ComparisonResult**

| Property | Type | Values | Description |
|---|---|---|---|
| `lova:comparisonType` | `xsd:string` | `"material"`, `"condition"`, `"temporal"`, `"dose"` | What is being compared |

Rules for the extraction LLM:
- `"material"` — the two sides use different materials/formulations (this is what hypothesis mining should focus on)
- `"condition"` — same material, different experimental conditions (e.g., with/without a treatment, different cell types)
- `"temporal"` — same material and condition, different time points
- `"dose"` — same material, different concentrations/doses

If the comparison doesn't fit cleanly, default to `"material"` if materials differ, `"condition"` otherwise.

#### Category 2: Asymmetric property coverage (155 comparisons)

These ARE material comparisons, but properties are populated on one side and missing on the other. The classic case:

```
Material A: "MAP scaffold (PEG-VS, FXIIIa annealed)"
  → has: particleShape=Sphere, packing=Jammed, surfaceMod=RGD-functionalized
  → missing: stiffnessValue

Material B: "Non-porous PEG hydrogel (350 Pa)"
  → has: stiffnessValue=350
  → missing: particleShape, packing, surfaceMod
```

The diff engine requires BOTH sides to have a value to detect a diff. Material B clearly has `packing=Non-porous` and `particleShape=N/A`, but these fields are empty in the TTL, so no diff is detected.

Asymmetric property gaps found:

| Property | A has, B missing | B has, A missing |
|---|---|---|
| surfaceModification | 8 | 6 |
| annealingChemistry | 1 | 7 |
| manufacturingMethod | 6 | 1 |
| stiffness | 5 | 4 |
| sizeMin | 1 | 3 |
| sizeMax | 1 | 4 |
| packing | 2 | 3 |

**Fix — Change 8: Require complete property annotation on ALL materials**

The extraction LLM instructions should require that EVERY material — including controls, comparators, and "simple" materials — has all applicable structured properties populated.

Specific instructions:
- A non-porous/bulk gel MUST have `lova:packingConfiguration "Non-porous"`.
- A material with no surface modification MUST have `lova:surfaceModification "None"` or `"Unmodified"`.
- If a property genuinely doesn't apply (e.g., particle shape for a bulk gel), use `"N/A"`.
- If a property is not reported in the paper, use `"Not reported"`.
- The goal is: **if two materials differ on a property, at least one side must NOT be empty**.

This is the highest-impact fix for reducing UNSTRUCTURED count. If applied, the 155 comparisons in this category would mostly become structured.

#### Category 3: Missing links and fields (67 comparisons)

33 comparisons lack `materialA`/`materialB` links entirely. 34 have materials that lack even the `particleMaterial` field.

**Fix:** Re-extract these papers with the v3+ prompt. These are straightforward extraction failures, concentrated in a handful of papers (primarily `10.1002/adhm.201400410`, `10.1016/j.biomaterials.2007.09.036`).

### Expected impact

After applying Changes 7 and 8:

| Metric | Current | After v4 |
|---|---|---|
| Total comparisons | 859 | 859 |
| Usable for material diff analysis | 370 (43%) | ~560 (65%) |
| Same-material (correctly excluded) | 0 (counted as UNSTRUCTURED) | ~257 (filtered by comparisonType) |
| Truly unresolvable | 483 (56%) | ~40 (5%) |

---

## Part 2: Biological Outcome Taxonomy

### The problem

The current schema has two levels for categorizing outcomes:

- `lova:measurementCategory` — coarse: "Biological", "Mechanical", "Biochemical", etc.
- `lova:measurementType` — extremely fine-grained: 541 unique values under "Biological" alone, with massive redundancy ("Cell viability", "Cell viability (LIVE/DEAD)", "Cell viability (% cell number)", "Cellular viability (% of control)" are all the same measurement)

There is no intermediate level. When the hypothesis pipeline says "HA-AC has a 55% win rate for Biological outcomes across 14 papers," this is uninformative because "Biological" conflates vascularization, inflammation, wound healing, cell infiltration, gene delivery, and dozens of other biological processes.

### What we need

An intermediate classification — `lova:biologicalFunction` — that maps the 541 measurement types to ~15 actionable biological categories. These categories should reflect the biological processes that matter for material design decisions.

### Change 11: Add `lova:biologicalFunction` on Outcome (HIGH priority)

| Property | Type | Description |
|---|---|---|
| `lova:biologicalFunction` | `xsd:string` | The biological process this outcome measures. Canonical values from the taxonomy below. |

This property sits BETWEEN `measurementCategory` and `measurementType` in the hierarchy:

```
measurementCategory: "Biological"              ← too coarse (1 of ~10)
  biologicalFunction: "Vascularization"        ← NEW: actionable level (~15 values)
    measurementType: "CD31+ vessel density"    ← too fine (1 of 541)
```

### Canonical biological function taxonomy

| Canonical value | What it covers | Example measurementTypes |
|---|---|---|
| `Vascularization` | Blood vessel formation, density, maturity, perfusion | CD31+ area, vessel density, PECAM-1+ count, total vessel length, vessel diameter, α-SMA+ vessel maturity, perfused vessel area, NG2+ area, PDGFR-β+ area, Glut-1+ area |
| `Cell infiltration` | Cell migration into scaffolds, cell density in material | Infiltrating cells, cell density, cellular infiltration, cell occupied volume fraction (COVF), DAPI+ area |
| `Cell viability` | Cell survival, live/dead, cytotoxicity | Cell viability, live cell fraction, live cell population, cytotoxicity threshold, cell survival, metabolic activity (MTT) |
| `Cell proliferation` | Cell division, growth, expansion | Ki67+ count, BrdU+ cells, cell number, relative proliferation, DNA content, cell proliferation, doubling time |
| `Cell spreading & morphology` | Cell shape, area, adhesion, cytoskeletal organization | Cell spreading area, cell length, F-actin area, cell volume, cell morphology, stress fibers, cell area |
| `Cell migration` | Cell motility, directionality, velocity | Cell migration rate, migration distance, median velocity, max travel distance, persistence distance |
| `Wound healing` | Wound closure, re-epithelialization, scar formation | % wound closure, remaining wound area, wound aspect ratio, re-epithelialization, granulation tissue area, granulation gap |
| `Immune response - anti-inflammatory` | Reduction in pro-inflammatory markers | CD206+ (M2 macrophage), Arg1+ expression, anti-inflammatory macrophage phenotype, reduced iNOS, reduced CD86 |
| `Immune response - pro-inflammatory` | Pro-inflammatory markers, acute immune response | CD11b+ fraction, iNOS+ cells, CD86 MFI, neutrophil percentage, Ly6G+ area, TNF-α, IL-6 secretion |
| `Immune response - adaptive` | T cells, B cells, dendritic cells, immune diversity | CD8+ T cells, CAR T cells, GL7+ B cells, dendritic cell frequency, clonotype diversity, Tbet+ CD4+ T cells |
| `ECM deposition & remodeling` | Collagen, fibronectin, laminin, matrix production | Collagen I/IV area, fibronectin area, laminin area, MMP expression, LOX expression, fibroplasia score |
| `Skin regeneration` | Hair follicles, sebaceous glands, epidermal markers | Hair follicle count, sebaceous glands, K14 thickness, K15+ cells, epidermal fold change, dermis area, total skin thickness |
| `Neural regeneration` | Neuronal markers, axonal growth, glial response | NF200 (mature neuron), DCX (neuroblast), SOX2 (progenitor), GFAP (astrocyte), axonal length, NPC migration, Tuj1+ cells |
| `Gene delivery` | Transgene expression, transfection efficiency, polyplex performance | Luciferase expression, GFP expression, transfection efficiency, β-galactosidase activity, SEAP expression, DNA internalization, polyplex internalization |
| `Anti-scarring` | Scar reduction, fibrosis markers, tissue remodeling quality | Scar thickness, GFAP scar thickness, collagen alignment, reactive astrocyte signal, fibrosis score, α-SMA expression |
| `Growth factor signaling` | VEGF, receptor phosphorylation, signaling pathways | pVEGFR-2/VEGFR-2 ratio, pERK, pP38, HIF-1α expression, VEGF half-life, receptor activation |
| `Anti-microbial` | Bacterial clearance, infection prevention | Bacterial bioluminescence, colony-forming units, CFU-positive percentage, bacterial growth proportion |
| `Material degradation` | Scaffold breakdown, longevity in vivo | Degradation half-life, gel degradation (histological), remaining material |
| `Adhesion prevention` | Post-surgical adhesion reduction | Percent uterine horn adhesions, clinical adhesion grade, adhesion duration, muscle separation distance |

### Rules for the extraction LLM

1. Every Outcome with `measurementCategory = "Biological"` MUST also have `lova:biologicalFunction` set to one of the canonical values above.
2. If a measurement type maps to multiple functions (rare), use the PRIMARY function. For example, "Ki67+ macrophages" is primarily `Immune response - anti-inflammatory` (it's measuring macrophage phenotype), not `Cell proliferation`.
3. For measurement types not clearly covered by the taxonomy, use the closest match or propose a new category (which should be added to the canonical list).
4. Non-biological outcomes (`measurementCategory` = "Mechanical", "Rheological", etc.) do NOT need this field.

### Change 12: Normalize `lova:measurementType` values

The 541 unique measurement types under "Biological" contain massive redundancy. Examples:

| Intended measurement | Variants in dataset |
|---|---|
| Cell viability | "Cell viability", "Cell viability (LIVE/DEAD)", "Cell viability (% cell number)", "Cellular viability (% of control)", "Cell viability (luminescence)", "Relative cell viability" |
| Vessel density | "Vessel density", "CD31+ area (%)", "CD31 positive area (%)", "PECAM-1+ cell count", "Vascular area percentage", "Blood vessel formation", "% area CD31" |
| Wound closure | "% Wound closure", "% Wound area", "Percent wound closure (End/start wound area)", "Remaining wound area (%)", "% wound remaining", "% Wound remaining", "Percent remaining wound area", "Percent cell coverage (wound closure)" |

Apply the same two-tier normalization pattern from v3 (Changes 4–6):

| Property | Type | Description |
|---|---|---|
| `lova:measurementType` | `xsd:string` | **Canonical short name** — standardized across all papers |
| `lova:measurementTypeDetail` | `xsd:string` | **Paper-specific detail** — includes specific assay, marker, conditions |

Example canonical measurement types for the Vascularization function:

| Canonical `measurementType` | Covers |
|---|---|
| `Vessel density` | CD31+ area, PECAM-1+ count, vascular area percentage, blood vessel formation |
| `Vessel maturity` | α-SMA+ vessel coverage, NG2+ area, pericyte coverage |
| `Vessel perfusion` | Perfused vessel area, total perfused vessel length |
| `Vessel morphology` | Vessel diameter, vessel tortuosity, vessel ramification |

### Impact on hypothesis mining

With `biologicalFunction`, hypotheses become actionable:

**Before (current):**
> "HA-AC has a 55% win rate for Biological outcomes across 14 papers"

**After (with v4):**
> "HA-AC shows consistent improvement in Vascularization (median 2.3x vessel density increase, 6 papers) and Cell infiltration (median 3.1x, 4 papers), but no significant effect on Wound healing (3 papers, mixed results)"

This enables:
1. **Targeted material design** — choose materials based on the specific biological outcome you need
2. **Tradeoff identification** — materials that improve vascularization might worsen inflammation
3. **Mechanism inference** — clustering wins by biological function suggests which biological pathways a material property affects

### Retroactive classification

The 541 existing measurement types can be mapped to the ~15 canonical biological functions with a simple LLM pass — no re-extraction from papers needed. A classification prompt that takes each `measurementType` string and outputs the corresponding `biologicalFunction` would handle this as a batch operation.

---

## Part 3: Outcome Directionality — The Win/Loss Bug

### The problem

The hypothesis mining notebook (`hypothesis_mining.ipynb`, cell 12) assumes **outcomeA is always the "winner"**:

```python
def win_rate_analysis(df, property_col_a, property_col_b, property_name):
    # Count appearances on winner side (outcomeA)
    wins = df[df[property_col_a] != ''][property_col_a].value_counts()
    # Count appearances on loser side (outcomeB)
    losses = df[df[property_col_b] != ''][property_col_b].value_counts()
```

But the v3 schema defines `lova:direction` as purely mathematical:

> "The `lova:direction` field describes the mathematical relationship between the two numeric values (A vs B). It is NOT a description of the biological meaning. Use ONLY 'higher', 'lower', or 'no difference'."

This creates a systematic error. When a comparison says "Vessel density was LOWER in Material A vs Material B" (direction="lower"), outcomeA has fewer vessels — this is a BAD outcome for Material A. But the pipeline counts it as a WIN for Material A's properties.

### Confirmed examples from the data

| Comparison | measType | valA | valB | direction | Reality | Pipeline says |
|---|---|---|---|---|---|---|
| Vessel density lower in n-pore vs 60μm porous | Vessel density | 25 | 115 | lower | A LOST (fewer vessels = bad) | A won |
| Vessel regression from 3 to 6 weeks | Vessel density | 65 | 115 | lower | A LOST (vessel regression = bad) | A won |
| Cell spreading lower on EG-NH2 vs bare gold | Cell spreading area | 770 | 1290 | lower | A LOST (less spreading = bad) | A won |
| iPS-NPC survival lower without encapsulation | Cell survival | 8 | 40 | lower | A LOST (less survival = bad) | A won |

The full scale of the problem is difficult to quantify without manually classifying every measurement type, but it likely affects a substantial fraction of the 231 "lower" direction comparisons. This noise pushes all win rates toward ~50%, which is exactly what we observe.

### The fix: two new properties

**Change 13: Add `lova:favoredOutcome` on ComparisonResult (CRITICAL)**

| Property | Type | Values | Description |
|---|---|---|---|
| `lova:favoredOutcome` | `xsd:string` | `"A"`, `"B"`, `"neither"`, `"unclear"` | Which side the paper considers to have performed better |

This is the most direct fix. The paper's authors already made the judgment about which outcome is "better" — the extraction LLM just needs to capture it.

Rules for the extraction LLM:
- `"A"` — the paper presents outcomeA as the better/desired result
- `"B"` — the paper presents outcomeB as the better/desired result
- `"neither"` — no clear winner (e.g., "no significant difference"), OR both are equally undesirable
- `"unclear"` — the paper reports the comparison without clear value judgment

Examples:
- "MAP gel had significantly higher cell infiltration than bulk gel" → favoredOutcome = `"A"` (more infiltration = better)
- "n-pore had significantly lower vessel density than 60μm porous" → favoredOutcome = `"B"` (more vessels = better, and B had more)
- "No significant difference in viability between groups" → favoredOutcome = `"neither"`

**Why this works better than classifying measurement types:** The same measurement can be "higher is better" in one context and "lower is better" in another. For example:
- "Higher immune cell infiltration" — is this good (wound healing context) or bad (foreign body response context)?
- "Higher stiffness" — is this good (structural support) or bad (prevents cell remodeling)?

The paper's authors know the context. `favoredOutcome` captures their judgment directly.

**Change 14: Add `lova:desirableDirection` on Outcome (RECOMMENDED)**

For outcome types where there IS a universal direction preference, capture it:

| Property | Type | Values | Description |
|---|---|---|---|
| `lova:desirableDirection` | `xsd:string` | `"higher"`, `"lower"`, `"range"`, `"context-dependent"` | Whether higher or lower values are generally better |
| `lova:desirableRangeLow` | `xsd:decimal` | numeric | Lower bound of optimal range (when desirableDirection = "range") |
| `lova:desirableRangeHigh` | `xsd:decimal` | numeric | Upper bound of optimal range (when desirableDirection = "range") |

This is less critical than Change 13 (which captures the paper's actual judgment) but enables automated reasoning about outcome quality:

| Measurement type | desirableDirection | Notes |
|---|---|---|
| Cell viability | higher | Almost always: more live cells = better |
| Vessel density | higher | More vascularization = better healing |
| % Wound area remaining | lower | Less wound = better healing |
| Bacterial CFU | lower | Fewer bacteria = better antimicrobial |
| Scaffold stiffness | range | Too soft or too stiff are both bad |
| Inflammation markers | context-dependent | Some inflammation needed early, bad late |

### Impact on the analysis pipeline

With `lova:favoredOutcome`, the win_rate_analysis changes from:

```python
# CURRENT (buggy): outcomeA is always the winner
wins = df[df[property_col_a] != ''][property_col_a].value_counts()
losses = df[df[property_col_b] != ''][property_col_b].value_counts()
```

To:

```python
# FIXED: use favoredOutcome to determine winner
winners = df[df['favoredOutcome'] == 'A']
losers = df[df['favoredOutcome'] == 'B']
wins = winners[winners[property_col_a] != ''][property_col_a].value_counts()
losses = losers[losers[property_col_b] != ''][property_col_b].value_counts()
# Also count material B's wins when favoredOutcome == 'B'
wins = wins.add(losers[losers[property_col_b] != ''][property_col_b].value_counts(), fill_value=0)
losses = losses.add(winners[winners[property_col_a] != ''][property_col_a].value_counts(), fill_value=0)
```

### Dual-workflow approach

There are two workflows that need `favoredOutcome`, and they use different strategies:

#### Generation workflow (new TTLs from papers)

The LLM reads the full paper and **sets `favoredOutcome` directly from context**. No lookup table needed — the paper tells it everything. The extraction prompt just needs one additional instruction:

> "For each ComparisonResult, set `lova:favoredOutcome` to `"A"` if the paper considers outcomeA to be the better/desired result, `"B"` if outcomeB is better, or `"neither"` if there is no clear winner."

The LLM already understands that lower wound area is good and lower vessel density is bad. It reads the authors' conclusions. This is the simplest and most reliable approach.

#### Repair workflow (fixing existing 859 comparisons)

The LLM does NOT have the full paper — it only has TTL data (labels, measurement types, values). It needs a **valence reference table** to infer `favoredOutcome` from `measurementType` + `direction`.

The valence reference table lives at:
```
KnowledgeBaseBackend/Data/outcome_valence.json
```

It maps each measurement type to a desirable direction (`"higher"`, `"lower"`, `"range"`, `"context-dependent"`, `"neutral"`).

**Repair logic:**

```
if valence == "higher" and direction == "higher":  favoredOutcome = "A"
if valence == "higher" and direction == "lower":   favoredOutcome = "B"
if valence == "lower"  and direction == "lower":   favoredOutcome = "A"
if valence == "lower"  and direction == "higher":  favoredOutcome = "B"
if valence == "context-dependent":                 use comparison label text for LLM inference
if valence == "range":                             compare values to known optimal range
```

For `context-dependent` entries, the repair LLM should read the comparison's `rdfs:label` to infer intent:
- "Relative inflammation lower in MAP scaffold vs non-porous" → A is favored (lower inflammation = good)
- "Storage modulus higher in annealed vs unannealed" → depends on whether higher stiffness is desired in that paper's context

The valence table covers ~130 measurement types across all categories. Measurement types not in the table should be flagged for manual review or LLM inference from labels.

#### Summary

| Workflow | Source of truth for favoredOutcome | Valence table used? |
|---|---|---|
| Generation (new TTLs) | Full paper context → LLM judgment | No |
| Repair (existing TTLs) | Valence table + comparison labels → LLM/heuristic | Yes |
| Validation (either) | Cross-check favoredOutcome against valence table | Yes (as sanity check) |

---

## Part 4: Methodological Improvements

### The current approach and its limitations

The hypothesis mining pipeline uses **vote counting**: for each material property value, count how often it appears on the "winning" side (outcomeA) of significant comparisons. This is the simplest form of meta-analysis and has well-documented weaknesses.

#### Limitation 1: No effect sizes

A comparison where cell viability is 90% vs 88% (ratio 1.02) counts the same as 90% vs 20% (ratio 4.50). Vote counting throws away the magnitude of the effect.

**What the data supports:** 706 out of 859 comparisons have `qudt:numericValue` on BOTH outcomes. We can compute an effect size ratio (A/B) for 82% of comparisons without any schema changes. This would already be a massive improvement — a material that consistently produces 3x improvements should rank higher than one that produces 1.1x improvements.

**What the data doesn't support (yet):** Standardized effect sizes (Cohen's d, Hedges' g) require standard deviations and sample sizes. Currently, 0 outcomes have `lova:standardDeviation` and only 445 have `lova:sampleSize`. Without SDs, we cannot compute standardized effects or proper confidence intervals.

#### Limitation 2: No independence correction

Papers contribute a median of 2.5 comparisons per outcome category, but some contribute up to 21. A single paper with 21 comparisons in "Biological" outcomes contributes 21 "votes" but represents one experimental system.

**Fix:** The analysis pipeline should weight by paper, not by comparison. For each paper × parameter × outcome combination, record one observation (e.g., the median effect size ratio). Then aggregate across papers. This ensures each paper gets one vote regardless of how many internal comparisons it makes.

#### Limitation 3: No confounding control

When two materials differ on 3+ properties simultaneously, we cannot attribute the win to any single property. The current notebook tracks this (243 "clean" single-diff comparisons vs 129 multi-diff), but the scoring doesn't downweight confounded observations.

**Fix:** Weight single-diff comparisons higher (e.g., 1.0) and multi-diff comparisons proportionally lower (e.g., 1/n_diffs). This is a simple heuristic, not a statistical correction, but it prioritizes cleaner evidence.

#### Limitation 4: Publication bias

Papers overwhelmingly report significant results. The current dataset has 536 significant vs 71 non-significant comparisons (88:12 ratio). This inflates confidence in all findings. There is no simple fix for this — it's inherent in working with published literature — but it should be acknowledged in all outputs.

### Recommended analysis improvements (no schema changes needed)

These can be implemented in the notebook immediately using existing data:

1. **Effect size ratios**: For the 706 comparisons with numeric values on both sides, compute `ratio = valA / valB`. Use log-ratios for aggregation (symmetric around 0, additive). A log-ratio of 0 means no difference; positive means A won; negative means B won.

2. **Paper-level aggregation**: Group by paper × parameter × outcome category. Take the median log-ratio per group. Then aggregate across papers. This gives each paper one vote.

3. **Confounding weight**: Multiply each observation by `1 / n_diffs` where `n_diffs` is the number of differing properties. Single-diff comparisons (cleanest evidence) get weight 1.0.

4. **Filter same-material comparisons**: Exclude comparisons where `materialA == materialB` from material hypothesis mining. (Immediately removes 257 from the UNSTRUCTURED pool.)

5. **Report evidence quality metrics alongside scores**: For each hypothesis, report not just the score but: number of independent papers, proportion of single-diff evidence, median effect size ratio, and the range of effect sizes. This lets a human judge whether the signal is real.

### Schema additions to support proper meta-analysis (v4)

To enable standardized effect sizes and proper meta-analytic methods in the future:

**Change 9: Add statistical fields on Outcome**

| Property | Type | Description |
|---|---|---|
| `lova:standardDeviation` | `xsd:decimal` | SD of the measurement |
| `lova:standardError` | `xsd:decimal` | SE of the measurement |
| `lova:sampleSize` | `xsd:integer` | n for this measurement (already exists on some outcomes, make systematic) |
| `lova:confidenceIntervalLow` | `xsd:decimal` | Lower bound of 95% CI |
| `lova:confidenceIntervalHigh` | `xsd:decimal` | Upper bound of 95% CI |

Rules for the extraction LLM:
- Extract SD, SE, and n whenever reported (they appear in figure error bars, table footnotes, methods sections).
- If a paper reports SE, convert to SD if n is known: `SD = SE × sqrt(n)`.
- Many papers report values as "mean ± SD" or "mean ± SEM" — capture the ± value and note which it is.

**Change 10: Add effect size fields on ComparisonResult**

| Property | Type | Description |
|---|---|---|
| `lova:effectSizeType` | `xsd:string` | Type of effect size: `"ratio"`, `"difference"`, `"cohens_d"`, `"fold_change"` |
| `lova:effectSizeValue` | `xsd:decimal` | The computed or reported effect size |
| `lova:foldChange` | `xsd:decimal` | Already exists on 68 comparisons — make systematic |

Rules for the extraction LLM:
- If both outcomes have numeric values, compute and store `lova:foldChange` = outcomeA / outcomeB.
- If the paper reports a specific effect size (Cohen's d, odds ratio, etc.), capture it with the appropriate type.

**Why these matter:** With SD and n on both outcomes of a comparison, a meta-analysis pipeline can compute standardized mean differences (Hedges' g), construct forest plots, run random-effects models, and produce proper confidence intervals. This transforms the pipeline from "suggestive vote counting" to "quantitative evidence synthesis."

### What this means for hypothesis generation

The current pipeline generates hypotheses like:

> "HA-AC has a 55% win rate across 14 papers — consider it for biological outcomes"

With v4 data and improved analysis, hypotheses would look like:

> "HA-AC shows a median 2.3x improvement in biological outcomes (IQR: 1.4–3.8x) across 14 independent papers, with 8 papers showing >2x effect sizes. The effect is strongest for cell spreading (median 3.1x) and weakest for viability (median 1.3x). Evidence quality: 65% from single-diff comparisons."

The second version is actionable. The first is a suggestion.

---

## Part 3: Revised Hypothesis Generation Strategy

### For cross-paper novel hypotheses (the primary goal)

The user's stated goal is to find hypotheses that **no single paper has reported** but that emerge from combining evidence across papers. The current pipeline attempts this but conflates several types of cross-paper insight:

#### Type 1: Convergent evidence (current approach, improved)

Multiple papers independently find that the same parameter value wins. Example: "smaller particles improve biological outcomes across 7 papers."

**Improvement:** Use effect size ratios and paper-level aggregation. Report the consistency (what % of papers agree), the median effect size, and the spread. A hypothesis with 7/7 papers agreeing and a median 3x effect is much stronger than one with 5/7 papers and a median 1.1x effect.

#### Type 2: Untested combinations (current approach, valid)

Two parameter values have individually shown wins but have never been combined. Example: "Irregular particle shape wins for biological outcomes; 2D packing wins for biological outcomes; but no paper has tested Irregular + 2D together."

**This is the most genuinely novel hypothesis type.** It's also the most speculative — there's no guarantee that individually winning properties will win together (they could interact negatively). But it's the type of hypothesis that literature review alone cannot produce.

**Improvement:** Strengthen the evidence for each component. Instead of "Irregular shape wins" (vote count), require "Irregular shape shows median 2.5x improvement across 3+ papers with consistent effect direction."

#### Type 3: Tradeoff resolution (current approach, valid)

A parameter value wins for one outcome but loses for another. Example: "Jammed packing is better for biological and rheological outcomes, but Non-porous is better for diffusion."

**This is inherently a multi-objective optimization problem.** The hypothesis is: "Can we engineer an intermediate packing configuration that captures the biological benefits of Jammed while maintaining the diffusion properties of Non-porous?"

**Improvement:** Quantify the tradeoff with effect sizes. How much biological performance do you gain, and how much diffusion do you lose? This tells you whether the tradeoff is worth engineering around.

#### Type 4: Network inference (NOT in current pipeline — new)

Materials A and B were compared in Paper 1 (A wins). Materials B and C were compared in Paper 2 (B wins). No paper compared A and C. **Inference: A likely beats C.**

This is the principle behind **network meta-analysis** and is the most powerful tool for generating cross-paper hypotheses. It requires careful statistical methodology (transitivity assumption, consistency checks) but can generate hypotheses that are impossible to derive from direct comparisons alone.

**Not a schema change — a pipeline change.** The current data already supports this. It requires implementing a network meta-analysis algorithm (e.g., using the `netmeta` R package or a Python equivalent) rather than simple vote counting.

---

## Part 5: Experiment Context — In Vivo Models & Time Points

### The problem

The knowledge base conflates radically different experimental contexts. A cell viability measurement on a petri dish and a wound healing measurement in a mouse are both "Biological" outcomes with no structured way to distinguish them. A result at day 3 and a result at day 21 are both just outcomes with free-text time point strings like "Day 3" or "POD 21" that cannot be sorted or compared.

For the hypothesis pipeline, this means signals from in vitro studies get mixed with in vivo studies — but a material that performs well in vitro often fails in vivo. For the Q&A system, a user cannot ask "show me only in vivo wound healing results" because there is no structured field to filter on.

### Change 15: Add `lova:experimentSetting` on Experiment (HIGH)

| Property | Type | Values | Description |
|---|---|---|---|
| `lova:experimentSetting` | `xsd:string` | `"in_vivo"`, `"in_vitro"`, `"ex_vivo"`, `"computational"` | The experimental context |

Currently this is only inferable from free-text `lova:experimentType` values like "In vivo infection bioluminescence imaging" vs "In vitro drug release."

Rules for the extraction LLM:
- Every Experiment MUST have `lova:experimentSetting`.
- If the experiment involves live animals, it is `"in_vivo"`.
- If it uses cells/tissues in a lab dish, it is `"in_vitro"`.
- If it uses excised tissue, it is `"ex_vivo"`.
- If it is a simulation or computational model, it is `"computational"`.

### Change 16: Add animal model fields on Experiment (HIGH)

For in vivo experiments, the species, strain, wound model, and implant site are currently jammed into free-text fields like `lova:cellSource "12-week-old male C57BL/6 wild-type mice"`. This makes cross-paper comparison of animal models impossible.

| Property | Type | Description | Example values |
|---|---|---|---|
| `lova:species` | `xsd:string` | Animal species | `"mouse"`, `"rat"`, `"rabbit"`, `"pig"` |
| `lova:strain` | `xsd:string` | Animal strain | `"C57BL/6"`, `"SKH1-Hrhr"`, `"Sprague-Dawley"` |
| `lova:defectModel` | `xsd:string` | Type of wound/defect | `"full-thickness skin wound"`, `"cranial defect"`, `"subcutaneous implant"`, `"spinal cord injury"` |
| `lova:implantSite` | `xsd:string` | Anatomical location | `"dorsal"`, `"tibia"`, `"cranium"`, `"femoral condyle"` |
| `lova:animalAge` | `xsd:string` | Age of animals | `"8 weeks"`, `"12 weeks"`, `"adult"` |
| `lova:animalSex` | `xsd:string` | Sex of animals | `"male"`, `"female"`, `"mixed"` |

Rules:
- These fields only apply when `experimentSetting = "in_vivo"`.
- Use canonical species names (lowercase).
- Use standard strain designations.
- `defectModel` should use the most common name for the model.

**Why this matters:** A user asking "which materials improve vascularization in mouse skin wound models?" currently gets results mixed with rat cranial defects, subcutaneous implants, and in vitro tube formation assays. These are not comparable contexts. With these fields, both the Q&A system and the hypothesis pipeline can filter to relevant experimental contexts.

### Change 17: Add numeric time point fields on Outcome (HIGH)

Currently 47% of outcomes have `lova:timePoint`, but as free-text strings with extreme variation: "Day 2", "4 hrs", "POD 21", "within 40 min", "45, 60 minutes". These cannot be sorted, compared, or used in range queries.

| Property | Type | Description |
|---|---|---|
| `lova:timePointValue` | `xsd:decimal` | Numeric time value |
| `lova:timePointUnit` | `xsd:string` | Standardized unit: `"hours"`, `"days"`, `"weeks"` |

Rules for the extraction LLM:
- Convert all time points to a numeric value + unit: "Day 2" → `timePointValue 2.0 ; timePointUnit "days"`, "4 hrs" → `timePointValue 4.0 ; timePointUnit "hours"`.
- If a time point is a range (e.g., "45-60 minutes"), use the midpoint or the end of the range and note the range in the original `lova:timePoint` text.
- Retain the original free-text `lova:timePoint` for human readability.
- Standardize to the most natural unit: use hours for <24h, days for 1-13 days, weeks for 2+ weeks.

**Why this matters for hypothesis generation:** Time-course analysis could reveal insights like "Jammed packing accelerates early vascularization (day 3-7) but Non-porous catches up by day 21." Currently the pipeline cannot detect temporal patterns because time points are unsortable strings.

**Why this matters for Q&A:** A user could ask "what happens to vessel density between 1 and 4 weeks in MAP scaffolds?" and get a meaningful time-course answer.

### Change 18: Add `lova:proposedMechanism` on ComparisonResult (MEDIUM)

Papers routinely explain WHY a material performed better. Currently this is completely absent from the structured data.

| Property | Type | Description |
|---|---|---|
| `lova:proposedMechanism` | `xsd:string` | The author's explanation for why one outcome was better |

Examples from actual papers:
- "The interconnected microporous network enables faster cell infiltration and nutrient transport"
- "Covalent VEGF immobilization prevents receptor internalization, maintaining sustained surface receptor phosphorylation"
- "Smaller microgel size creates larger interconnected void spaces, improving cell migration"

Rules:
- Extract the mechanism only when the authors explicitly state one (do not infer).
- Keep it to 1-2 sentences — the key causal claim, not the full discussion.
- This field is optional — many comparisons won't have an explicit mechanism stated.

**Why this matters:** Mechanisms bridge the gap between statistical patterns and biological understanding. When the hypothesis pipeline finds "smaller particles improve vascularization across 7 papers," having the proposed mechanisms from those papers ("smaller particles create larger pores → better cell infiltration → better vascularization") makes the hypothesis testable and interpretable. For the Q&A system, users can ask "why do smaller particles improve wound healing?" and get mechanism-grounded answers.

---

## Part 6: Q&A System Improvements

### The problem

The human-facing Q&A system (`KnowledgeBaseBackend/Services/QueryService.cs`) has a stale system prompt that does not reflect v3 or v4 schema additions. The LLM generates SPARQL using only v2 properties, making cross-paper aggregation queries broken or impossible.

### Change 19: Update QueryService system prompt (CRITICAL, no schema change)

The system prompt (`BuildSystemPrompt()`, lines 500-752 of `QueryService.cs`) must be updated to include:

1. **v3 properties**: `lova:aboutMaterial`, `lova:materialA`/`lova:materialB`, `lova:particleMaterialDetail`, `lova:packingDetail`
2. **v4 properties**: `lova:favoredOutcome`, `lova:biologicalFunction`, `lova:comparisonType`, `lova:experimentSetting`, `lova:species`, `lova:defectModel`, `lova:timePointValue`/`lova:timePointUnit`, `lova:proposedMechanism`
3. **Canonical value lists**: The LLM needs to know the allowed values for `particleMaterial` (PEG-VS, HA-AC, HA-NB, etc.), `biologicalFunction` (Vascularization, Cell infiltration, etc.), `packingConfiguration` (Jammed, Non-porous, etc.), `experimentSetting` (in_vivo, in_vitro, etc.)
4. **Cross-paper aggregation examples**: The current 4 example queries are all single-paper lookups. Add examples like:

```sparql
# Which materials have the most significant wins for vascularization?
SELECT ?particleMaterial (COUNT(?cmp) AS ?wins) (COUNT(DISTINCT ?paper) AS ?papers)
WHERE {
  ?cmp a lova:ComparisonResult ;
       lova:materialA ?mat ;
       lova:favoredOutcome "A" ;
       lova:isSignificant true ;
       dc:source ?paper .
  ?mat lova:particleMaterial ?particleMaterial .
  ?cmp lova:outcomeA ?outA .
  ?outA lova:biologicalFunction "Vascularization" .
}
GROUP BY ?particleMaterial
ORDER BY DESC(?wins)
```

```sparql
# What is the effect of packing configuration on wound healing in mouse models?
SELECT ?packing ?direction (COUNT(?cmp) AS ?count)
WHERE {
  ?cmp a lova:ComparisonResult ;
       lova:materialA ?mat ;
       lova:direction ?direction ;
       lova:favoredOutcome "A" ;
       lova:outcomeA ?outA ;
       dc:source ?paper .
  ?mat lova:packingConfiguration ?packing .
  ?outA lova:biologicalFunction "Wound healing" .
  ?outA lova:fromExperiment ?exp .
  ?exp lova:experimentSetting "in_vivo" ;
       lova:species "mouse" .
}
GROUP BY ?packing ?direction
ORDER BY DESC(?count)
```

These examples teach the LLM the query patterns needed for cross-paper questions.

### Change 20: Add text index entries for new properties (LOW)

The Fuseki Lucene text index currently covers 16 fields. Add new v4 properties to the text index for full-text search:
- `lova:biologicalFunction`
- `lova:proposedMechanism`
- `lova:defectModel`
- `lova:experimentSetting`

---

## Summary of All Changes

| # | Change | Priority | Type | Description |
|---|---|---|---|---|
| 7 | `lova:comparisonType` | **HIGH** | New property | Classify comparisons as material/condition/temporal/dose |
| 8 | Complete property annotation | **HIGH** | Convention | Require ALL materials to have ALL applicable properties filled |
| 9 | Statistical fields on Outcome | **HIGH** | New properties | SD, SE, sample size, CI bounds |
| 10 | Effect size fields on Comparison | Medium | New properties | Systematic fold change and effect size capture |
| 11 | `lova:biologicalFunction` | **HIGH** | New property | Intermediate biological process taxonomy (~15 categories) |
| 12 | Normalize `lova:measurementType` | Medium | Convention + new property | Canonical measurement names + `measurementTypeDetail` for specifics |
| 13 | `lova:favoredOutcome` | **CRITICAL** | New property | Which side the paper considers better ("A", "B", "neither") |
| 14 | `lova:desirableDirection` | Recommended | New property | Whether higher/lower/range is better for this outcome type |
| 15 | `lova:experimentSetting` | **HIGH** | New property | In vivo / in vitro / ex vivo / computational |
| 16 | Animal model fields | **HIGH** | New properties | species, strain, defectModel, implantSite, animalAge, animalSex |
| 17 | Numeric time points | **HIGH** | New properties | `timePointValue` (numeric) + `timePointUnit` (standardized) |
| 18 | `lova:proposedMechanism` | Medium | New property | Author-stated explanation for why one material outperformed |
| 19 | Update QueryService system prompt | **CRITICAL** | Code change | Add v3/v4 properties, canonical values, and cross-paper query examples |
| 20 | Fuseki text index update | Low | Config change | Index new v4 properties for full-text search |

### Pipeline improvements (no schema changes)

| # | Improvement | Priority | Impact |
|---|---|---|---|
| P1 | Filter same-material comparisons | **HIGH** | Removes 257 false UNSTRUCTURED |
| P2 | Use effect size ratios instead of vote counting | **HIGH** | Meaningful magnitude ranking |
| P3 | Paper-level aggregation | **HIGH** | Fixes independence violation |
| P4 | Confounding weight (1/n_diffs) | Medium | Prioritizes clean evidence |
| P5 | Report evidence quality metrics | Medium | Enables human judgment |
| P6 | Network meta-analysis | Low (future) | Novel indirect hypotheses |

### Migration impact

Changes 7–18 are **additive** — existing TTL files remain valid. However, to realize the benefits:

1. **Immediate (no re-extraction needed):**
   - Pipeline improvements P1–P5 can be implemented in the notebooks right now using existing data. P1 alone halves the UNSTRUCTURED count.
   - Change 19 (system prompt update) can be done immediately once v3/v4 properties exist in the data.
   - Change 7 (`comparisonType`) can be inferred heuristically from `materialA == materialB`.
   - Change 13 (`favoredOutcome`) can be inferred via the valence lookup table + comparison labels.
   - Change 11 (`biologicalFunction`) can be retroactively classified by an LLM batch pass over the 541 measurement types.

2. **Re-extraction needed (generation workflow):**
   - Changes 8–10, 14–18 require updating the extraction prompt and re-generating TTL files.
   - The generation prompt should capture: complete material properties (Change 8), SD/SE/n (Change 9), fold change (Change 10), favoredOutcome (Change 13), experimentSetting (Change 15), animal model details (Change 16), numeric time points (Change 17), and proposed mechanisms (Change 18).

3. **Repair workflow (existing TTLs):**
   - Changes 11, 13 can be applied to existing TTLs using the repair workflow with the valence lookup table.
   - Changes 15, 17 can partially be inferred from existing free-text fields (`experimentType` labels, `timePoint` strings).
   - Changes 16, 18 generally require going back to the paper.

4. **New pipeline code:** P6 (network meta-analysis) requires a new analysis module, not schema changes.
