"""Run this in a notebook cell with: %run -i export_hypothesis_results.py"""
import base64
from io import BytesIO
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

css = """
body{font-family:'Segoe UI',system-ui,sans-serif;max-width:1300px;margin:auto;padding:20px;color:#222;line-height:1.5}
table{border-collapse:collapse;margin:10px 0;width:100%}
th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:13px}
th{background:#f5f5f5;position:sticky;top:0}
h1{border-bottom:2px solid #333;padding-bottom:8px}
h2{margin-top:30px;border-bottom:1px solid #ccc;padding-bottom:5px;color:#1a5276}
h3{color:#2e86c1;margin-top:20px}
img{max-width:100%}
p.intro{color:#444;font-size:14px;margin:8px 0 12px 0}
.def{background:#f8f9fa;border:1px solid #e0e0e0;padding:10px 14px;border-radius:4px;margin:10px 0;font-size:13px}
.def dt{font-weight:bold;color:#1a5276;margin-top:6px}
.def dd{margin:2px 0 6px 16px;color:#444}
.hypothesis{background:#f9f9f9;border-left:3px solid #2e86c1;padding:10px 15px;margin:8px 0;font-size:14px}
.hyp-a{border-left-color:#27ae60}
.hyp-b{border-left-color:#e67e22}
.hyp-c{border-left-color:#8e44ad}
.score{font-weight:bold;color:#666;font-size:12px}
.tradeoff{background:#fef9e7;border-left:3px solid #f39c12;padding:10px 15px;margin:8px 0}
.rule{background:#eafaf1;border-left:3px solid #27ae60;padding:8px 15px;margin:6px 0}
.stat{display:inline-block;background:#eee;padding:3px 8px;border-radius:3px;margin:2px;font-size:12px}
.legend{font-size:12px;color:#666;margin:4px 0}
"""


def fig_to_img(fig):
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return '<img src="data:image/png;base64,' + b64 + '">'


def truncate(s, max_len=50):
    return s if len(s) <= max_len else s[:max_len - 1] + '…'


def esc(s):
    """HTML-escape a string."""
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


h = []
h.append('<!DOCTYPE html><html><head><meta charset="utf-8">')
h.append('<title>LOVAMAP Hypothesis Generation Results</title>')
h.append('<style>' + css + '</style></head><body>')
h.append('<h1>LOVAMAP Parameter-Driven Hypothesis Generation</h1>')

# ── 1. Summary Stats ──
h.append('<h2>1. Data Overview</h2>')
h.append('<p class="intro">Summary of the data feeding into this analysis. '
         'The knowledge base contains comparison results extracted from peer-reviewed papers, '
         'each recording whether one material formulation outperformed another for a specific '
         'measured outcome.</p>')

h.append(f'<p><span class="stat">Unique comparisons: {len(cmp_df)}</span>')
h.append(f'<span class="stat">Significant directional: {sig_diffs["cmp"].nunique()}</span>')
h.append(f'<span class="stat">Structured diff rows: {len(diff_df[diff_df["param"] != "UNSTRUCTURED"])}</span>')
h.append(f'<span class="stat">UNSTRUCTURED: {len(diff_df[diff_df["param"] == "UNSTRUCTURED"])}</span></p>')

h.append('<h3>Comparison Types</h3>')
h.append('<p class="intro">Each comparison is classified by whether materialA and materialB '
         'share the same base material (same_material = different formulations of the same '
         'chemistry), are genuinely different materials (cross_material), or lack sufficient '
         'annotation to determine (material_unknown).</p>')
h.append('<dl class="def">')
h.append('<dt>same_material</dt><dd>Both sides share the same base particleMaterial '
         '(e.g., two HA-AC formulations differing in particle size or surface modification). '
         'These are the most useful for identifying which <em>parameter change</em> drives a result.</dd>')
h.append('<dt>cross_material</dt><dd>MaterialA and materialB are genuinely different base chemistries '
         '(e.g., HA-AC vs Fibrin). These answer &ldquo;which material is better?&rdquo; '
         'but don&rsquo;t isolate a single parameter.</dd>')
h.append('<dt>material_unknown</dt><dd>One or both sides lack a material link in the RDF data, '
         'so the comparison type cannot be determined.</dd>')
h.append('</dl>')
h.append(cmp_df['cmp_type'].value_counts().to_frame('count').to_html())

h.append('<h3>Diffs per Parameter</h3>')
h.append('<p class="intro">For each comparison, the diff engine checks 9 structured material '
         'properties (particle shape, packing, surface modification, stiffness, particle size '
         'min/max, annealing chemistry, manufacturing method, and particle material) on both '
         'the winning and losing side. A <strong>diff row</strong> is created when both sides '
         'have a value for a property and those values are different. One comparison can produce '
         'multiple diff rows if several properties differ simultaneously.</p>')
h.append('<dl class="def">')
h.append('<dt>UNSTRUCTURED</dt><dd>Comparisons where <em>no</em> structured properties differ '
         'between the two materials. The difference is encoded only in free-text labels '
         '(e.g., different concentrations, ratios, or cell types). These cannot be '
         'automatically mined for design rules.</dd>')
h.append('<dt>diff_rows (count)</dt><dd>Total number of (comparison &times; differing parameter) '
         'rows for each parameter. Higher counts mean that parameter varies frequently across '
         'comparisons in the knowledge base.</dd>')
h.append('</dl>')
h.append(diff_df['param'].value_counts().to_frame('diff_rows').to_html())

# ── 2. Parameter-Outcome Table ──
h.append('<h2>2. Parameter&ndash;Outcome Associations</h2>')
h.append('<p class="intro">The core output of the diff engine. For each case where a structured '
         'parameter differs between materialA (winner) and materialB (loser) in a significant, '
         'directional comparison, we record which parameter value won, which lost, and for '
         'which outcome category.</p>')
h.append('<dl class="def">')
h.append('<dt>parameter</dt><dd>The material property that differs between the two sides.</dd>')
h.append('<dt>winner_value</dt><dd>The value on the materialA side (the side that was '
         '&ldquo;higher&rdquo; or &ldquo;lower&rdquo; per the comparison direction).</dd>')
h.append('<dt>loser_value</dt><dd>The value on the materialB side.</dd>')
h.append('<dt>outcome_category</dt><dd>Broad category of the measured outcome '
         '(Biological, Mechanical, Rheological, etc.).</dd>')
h.append('<dt>wins</dt><dd>Number of significant comparisons supporting this association.</dd>')
h.append('<dt>papers</dt><dd>Number of independent papers contributing evidence.</dd>')
h.append('<dt>direction_note</dt><dd>For quantitative parameters (stiffness, size): '
         'whether the higher or lower numeric value tends to win.</dd>')
h.append('</dl>')
if not param_outcome_df.empty:
    top_po = param_outcome_df.head(40).copy()
    top_po['winner_value'] = top_po['winner_value'].apply(lambda s: truncate(s, 50))
    top_po['loser_value'] = top_po['loser_value'].apply(lambda s: truncate(s, 50))
    h.append(top_po.to_html(index=False))

# Parameter-outcome bar chart
if not param_outcome_df.empty:
    viz = param_outcome_df.groupby(['parameter', 'outcome_category'])['wins'].sum().reset_index()
    pivot_viz = viz.pivot_table(index='parameter', columns='outcome_category',
                                values='wins', fill_value=0)
    fig, ax = plt.subplots(figsize=(12, 6))
    pivot_viz.plot.bar(stacked=True, ax=ax, colormap='Set2')
    ax.set_title('Significant Wins per Differing Parameter, by Outcome Category')
    ax.set_xlabel('Parameter')
    ax.set_ylabel('Wins')
    ax.legend(title='Outcome', bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    h.append(fig_to_img(fig))
    h.append('<p class="legend">Each bar shows how many significant comparisons involved that '
             'parameter differing, broken down by the outcome category being measured. '
             'Taller bars = more evidence available for that parameter.</p>')

# Clean single-diff associations
if 'clean_param_outcome_df' in dir() and not clean_param_outcome_df.empty:
    h.append('<h3>Unconfounded (Single-Diff) Associations</h3>')
    h.append('<p class="intro">These associations come from comparisons where <strong>only one</strong> '
             'structured parameter differs between materialA and materialB. When multiple '
             'parameters change at once, it is impossible to attribute the outcome to any single '
             'parameter (confounding). Single-diff comparisons provide the cleanest causal signal '
             'and are the most actionable for design guidance.</p>')
    cpo = clean_param_outcome_df.head(30).copy()
    cpo['winner_value'] = cpo['winner_value'].apply(lambda s: truncate(s, 50))
    cpo['loser_value'] = cpo['loser_value'].apply(lambda s: truncate(s, 50))
    h.append(cpo.to_html(index=False))

# ── 3. Cross-Paper Design Rules ──
h.append('<h2>3. Cross-Paper Design Rules</h2>')
h.append('<p class="intro">A design rule is considered reliable when the same parameter&ndash;outcome '
         'pattern appears in <strong>2 or more independent papers</strong>. Single-paper findings '
         'may reflect experimental idiosyncrasies, but cross-paper replication suggests a '
         'generalizable relationship. These are the most actionable findings in the analysis.</p>')
h.append('<dl class="def">')
h.append('<dt>consistency</dt><dd>For categorical parameters: what fraction of wins are attributed '
         'to the top-performing value. Higher = one value clearly dominates. '
         'For quantitative parameters: how consistently &ldquo;higher&rdquo; or &ldquo;lower&rdquo; '
         'wins (1.0 = always the same direction).</dd>')
h.append('<dt>quant_direction</dt><dd>For stiffness/size parameters: whether the higher or lower '
         'numeric value tends to win. &ldquo;mixed&rdquo; means no clear directional trend.</dd>')
h.append('<dt>top_winner</dt><dd>For categorical parameters: the value that appears most often '
         'on the winning side.</dd>')
h.append('</dl>')

if 'cross_paper_rules' in dir() and not cross_paper_rules.empty:
    h.append(cross_paper_rules.head(30).to_html(index=False))

    # Heatmap
    rule_pivot = cross_paper_rules.pivot_table(
        index='parameter', columns='outcome_category',
        values='total_wins', fill_value=0
    )
    fig, ax = plt.subplots(figsize=(12, max(5, len(rule_pivot) * 0.6)))
    sns.heatmap(rule_pivot, annot=True, fmt='g', cmap='Blues', ax=ax,
                linewidths=0.5, linecolor='white')
    ax.set_title('Cross-Paper Design Rules: Parameter × Outcome (wins)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    h.append(fig_to_img(fig))
    h.append('<p class="legend">Heatmap cells show the number of significant wins for each '
             'parameter&ndash;outcome combination, considering only rules replicated across 2+ papers. '
             'Darker = more evidence.</p>')

# Natural-language rules
if 'nl_rules_df' in dir() and not nl_rules_df.empty:
    h.append('<h3>Design Rules (Natural Language)</h3>')
    h.append('<p class="intro">The same cross-paper rules expressed as human-readable statements. '
             'Each rule describes which parameter value (or numeric direction) is associated with '
             'improved outcomes, how many wins and papers support it, and the consistency of the '
             'finding.</p>')
    for _, row in nl_rules_df.head(15).iterrows():
        h.append(f'<div class="rule">{esc(row["rule"])}</div>')

# ── 4. Outcome-Specific Rankings ──
h.append('<h2>4. Outcome-Specific Rankings</h2>')
h.append('<p class="intro">For each outcome category (Biological, Mechanical, Rheological, etc.), '
         'this section ranks which parameter values perform best. This answers the question: '
         '&ldquo;If I want to optimize for <em>X</em>, what parameter values should I choose?&rdquo;</p>')
h.append('<dl class="def">')
h.append('<dt>recommendation</dt><dd>The specific parameter value (for categorical params) or '
         'direction (Higher/Lower, for quantitative params) associated with winning.</dd>')
h.append('<dt>confidence</dt><dd>What fraction of comparisons involving this parameter '
         'are won by this specific value/direction. Higher = more dominant.</dd>')
h.append('</dl>')

if 'outcome_rankings' in dir():
    for cat, rank_df in sorted(outcome_rankings.items(), key=lambda x: -len(x[1])):
        h.append(f'<h3>{esc(cat)}</h3>')
        top = rank_df.head(10).copy()
        top['confidence'] = top['confidence'].map('{:.0%}'.format)
        top['recommendation'] = top['recommendation'].apply(lambda s: truncate(s, 60))
        h.append(top.to_html(index=False))

# ── 5. Tradeoffs ──
h.append('<h2>5. Tradeoff Detection</h2>')
h.append('<p class="intro">A tradeoff occurs when the same parameter value pair shows '
         '<em>opposite</em> winners depending on which outcome category is measured. For example, '
         'value A might outperform value B for Biological outcomes, but value B outperforms A '
         'for Mechanical outcomes. These tradeoffs define the boundaries of the design space '
         '&mdash; you cannot optimize for everything simultaneously.</p>')
h.append('<dl class="def">')
h.append('<dt>value_1_wins_for / value_2_wins_for</dt><dd>The outcome categories where each '
         'value exclusively wins (the other value never wins for that category).</dd>')
h.append('<dt>contested_cats</dt><dd>Outcome categories where <em>both</em> values have wins '
         '&mdash; no clear winner.</dd>')
h.append('<dt>total_evidence</dt><dd>Combined number of exclusive wins across both sides.</dd>')
h.append('</dl>')

if 'tradeoff_df' in dir() and not tradeoff_df.empty:
    tdf = tradeoff_df.head(20).copy()
    tdf['value_1'] = tdf['value_1'].apply(lambda s: truncate(s, 40))
    tdf['value_2'] = tdf['value_2'].apply(lambda s: truncate(s, 40))
    h.append(tdf.to_html(index=False))

if 'nl_tradeoffs' in dir() and nl_tradeoffs:
    h.append('<h3>Tradeoff Descriptions</h3>')
    h.append('<p class="intro">Natural-language descriptions of each detected tradeoff.</p>')
    for t in nl_tradeoffs[:10]:
        h.append(f'<div class="tradeoff">{esc(t)}</div>')

if 'quant_tradeoff_df' in dir() and not quant_tradeoff_df.empty:
    h.append('<h3>Quantitative Parameter Directions</h3>')
    h.append('<p class="intro">For numeric parameters (stiffness, particle size), this table '
             'shows whether &ldquo;higher&rdquo; or &ldquo;lower&rdquo; values tend to win for '
             'each outcome category. When the direction flips between outcome categories, that '
             'indicates a quantitative tradeoff.</p>')
    h.append(quant_tradeoff_df.to_html(index=False))

# ── 6. Untested Combinations ──
h.append('<h2>6. Untested Combinations (Gap Hypotheses)</h2>')
h.append('<p class="intro">Parameter values that have individually been shown to win in '
         'significant comparisons, but have <em>never been combined together</em> in any tested '
         'material in the knowledge base. Each row represents a pair of winning values from '
         'different parameters that could be combined in a new material design. These are '
         'candidate hypotheses for novel experiments.</p>')
if 'gap_df' in dir() and not gap_df.empty:
    h.append(f'<p><span class="stat">Untested combinations found: {len(gap_df)}</span></p>')
    h.append(gap_df.head(30).to_html(index=False))
else:
    h.append('<p>All top winning value combinations have been tested.</p>')

# ── 7. Hypotheses ──
h.append('<h2>7. Ranked Hypotheses</h2>')
h.append('<p class="intro">All findings are combined into scored hypotheses of three types:</p>')
h.append('<dl class="def">')
h.append('<dt>A_optimization <span style="color:#27ae60">(green)</span></dt>'
         '<dd>Apply a proven cross-paper design rule to improve a specific outcome. '
         'Score = log(wins+1) &times; log(papers+1) &times; consistency.</dd>')
h.append('<dt>B_tradeoff <span style="color:#e67e22">(orange)</span></dt>'
         '<dd>Propose a way to break a detected tradeoff (e.g., intermediate value, '
         'hybrid approach). Includes a 1.5&times; novelty bonus in scoring.</dd>')
h.append('<dt>C_untested_combo <span style="color:#8e44ad">(purple)</span></dt>'
         '<dd>Combine individually-proven winning values that have never been tested together. '
         'Includes a 2.0&times; novelty bonus in scoring.</dd>')
h.append('</dl>')
h.append('<p class="intro">Higher scores indicate stronger evidence and/or higher novelty. '
         'The score formula balances evidence volume (wins), replication (papers), reliability '
         '(consistency), and novelty (bonus multiplier for tradeoff and untested hypotheses).</p>')

if 'all_hypotheses' in dir() and not all_hypotheses.empty:
    type_counts = all_hypotheses['type'].value_counts()
    h.append('<p>')
    h.append(f'<span class="stat">Total: {len(all_hypotheses)}</span>')
    for t, c in type_counts.items():
        h.append(f'<span class="stat">{t}: {c}</span>')
    h.append('</p>')

    # Summary table
    summary = all_hypotheses[['type', 'parameter', 'outcome', 'wins', 'papers', 'score']].head(30).copy()
    summary['score'] = summary['score'].map('{:.2f}'.format)
    h.append(summary.to_html(index=True))

    # Full hypothesis text
    h.append('<h3>Top 20 Hypotheses (Full Text)</h3>')
    h.append('<p class="intro">Each hypothesis card shows its rank, evidence score, type, '
             'and a natural-language description of the proposed design action with supporting '
             'evidence.</p>')
    for i, (_, hyp) in enumerate(all_hypotheses.head(20).iterrows()):
        htype = hyp['type']
        cls = 'hyp-a' if 'optim' in htype else ('hyp-b' if 'tradeoff' in htype else 'hyp-c')
        h.append(f'<div class="hypothesis {cls}">')
        h.append(f'<span class="score">#{i+1} | Score: {hyp["score"]:.2f} | {htype}</span><br>')
        h.append(esc(hyp['hypothesis']))
        h.append('</div>')

    # Score distribution chart
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    for htype in all_hypotheses['type'].unique():
        subset = all_hypotheses[all_hypotheses['type'] == htype]
        axes[0].hist(subset['score'], bins=20, alpha=0.6, label=htype)
    axes[0].set_xlabel('Score')
    axes[0].set_ylabel('Count')
    axes[0].set_title('Hypothesis Score Distribution')
    axes[0].legend()

    top30 = all_hypotheses.head(30)
    param_counts = top30['parameter'].value_counts().head(10)
    param_counts.plot.barh(ax=axes[1])
    axes[1].set_xlabel('Count in Top 30')
    axes[1].set_title('Most Frequent Parameters in Top Hypotheses')
    axes[1].invert_yaxis()
    plt.tight_layout()
    h.append(fig_to_img(fig))
    h.append('<p class="legend">Left: distribution of hypothesis scores by type. '
             'Right: which parameters appear most often among the top-ranked hypotheses.</p>')
else:
    h.append('<p>No hypotheses generated.</p>')

# ── 8. Cross-Material Comparisons ──
h.append('<h2>8. Cross-Material Comparisons</h2>')
h.append('<p class="intro">These are comparisons where materialA and materialB are genuinely '
         'different base chemistries (not just different formulations of the same material). '
         'They directly answer &ldquo;material A vs material B&rdquo; but are rarer in the '
         'knowledge base and typically come from single papers, so they have limited '
         'replication.</p>')

if 'cross_mat' in dir() and not cross_mat.empty:
    h.append(f'<p><span class="stat">Cross-material comparisons: {len(cross_mat)}</span>'
             f'<span class="stat">Papers: {cross_mat["doi"].nunique()}</span></p>')

    if 'cross_mat_summaries' in dir() and cross_mat_summaries:
        h.append('<h3>Cross-Material Findings</h3>')
        h.append('<p class="intro">Each finding states which material outperformed which, '
                 'for which outcome categories, with the number of significant wins and papers.</p>')
        for s in sorted(cross_mat_summaries, key=lambda x: -x['wins'])[:15]:
            h.append(f'<div class="rule">{esc(s["summary"])}</div>')
else:
    h.append('<p>No cross-material comparisons found.</p>')

h.append('</body></html>')

out = Path('hypothesis_results.html')
out.write_text('\n'.join(h))
print('Exported to ' + str(out.resolve()))
