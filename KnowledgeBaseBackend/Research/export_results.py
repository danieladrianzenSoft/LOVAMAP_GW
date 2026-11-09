"""Run this in a notebook cell with: %run export_results.py"""
import base64
from io import BytesIO
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

css = """
body{font-family:sans-serif;max-width:1200px;margin:auto;padding:20px}
table{border-collapse:collapse;margin:10px 0}
th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}
th{background:#f5f5f5}
h2{margin-top:30px;border-bottom:1px solid #ccc;padding-bottom:5px}
img{max-width:100%}
"""

def fig_to_img(fig):
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return '<img src="data:image/png;base64,' + b64 + '">'

h = []
h.append('<html><head><style>' + css + '</style></head><body>')
h.append('<h1>LOVAMAP Hypothesis Mining Results</h1>')

# 1. Inventory
h.append('<h2>1. Knowledge Base Inventory</h2>')
h.append(inventory.T.rename(columns={0: 'count'}).to_html())

# 2. Papers by year
h.append('<h2>2. Papers by Year</h2>')
fig, ax = plt.subplots(figsize=(10, 4))
ax.bar(papers_by_year['year'], papers_by_year['count'])
ax.set_xlabel('Year')
ax.set_ylabel('Papers')
ax.set_title('Papers by Year')
plt.xticks(rotation=45)
plt.tight_layout()
h.append(fig_to_img(fig))

# 3. Journals
h.append('<h2>3. Top Journals</h2>')
h.append(journals.to_html(index=False))

# 4. Comparison overview
h.append('<h2>4. Comparison Mining Overview</h2>')
n_rows = str(len(comparisons))
n_unique = str(comparisons['cmp'].nunique())
h.append('<p>Total comparison rows: ' + n_rows + '<br>Unique comparisons: ' + n_unique + '</p>')
h.append('<h3>Direction Distribution</h3>')
h.append(comparisons['direction'].value_counts().to_frame('count').to_html())

h.append('<h3>Most Compared Measurement Types</h3>')
fig, ax = plt.subplots(figsize=(10, 6))
mt = comparisons.groupby('measTypeA')['cmp'].nunique().sort_values(ascending=False).head(20)
mt.plot.barh(ax=ax)
ax.set_xlabel('Comparisons')
ax.invert_yaxis()
plt.tight_layout()
h.append(fig_to_img(fig))

# 5. Win rates
h.append('<h2>5. Material Property Win Rates</h2>')
h.append('<h3>Particle Material (min 5 comparisons)</h3>')
h.append(mat_wins[mat_wins['total'] >= 5].head(15).to_html(index=False))
h.append('<h3>Packing Configuration (min 3)</h3>')
h.append(packing_wins[packing_wins['total'] >= 3].to_html(index=False))
h.append('<h3>Particle Shape (min 3)</h3>')
h.append(shape_wins[shape_wins['total'] >= 3].to_html(index=False))
h.append('<h3>Surface Modification (min 3)</h3>')
h.append(surf_wins[surf_wins['total'] >= 3].to_html(index=False))

# 6. Heatmap
h.append('<h2>6. Material x Outcome Heatmap</h2>')
if not pivot_filtered.empty:
    pdf = pivot_filtered.copy()
    pdf.index = [s if len(s) <= 40 else s[:39] + '...' for s in pdf.index]
    pdf.columns = [s if len(s) <= 20 else s[:19] + '...' for s in pdf.columns]
    fig, ax = plt.subplots(figsize=(14, max(8, len(pdf) * 0.5)))
    sns.heatmap(pdf, annot=True, fmt='g', cmap='YlOrRd', ax=ax, linewidths=0.5, linecolor='white')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    h.append(fig_to_img(fig))

# 7. Fabrication
h.append('<h2>7. Fabrication Method Analysis</h2>')
if not fab_sig.empty:
    h.append('<h3>Annealing Chemistries in Significant Wins</h3>')
    ac = fab_sig[fab_sig['annealingChem'] != ''].groupby('annealingChem')['cmp'].nunique()
    h.append(ac.sort_values(ascending=False).head(10).to_frame('sig_wins').to_html())
    h.append('<h3>Manufacturing Methods in Significant Wins</h3>')
    mc = fab_sig[fab_sig['mfgMethod'] != ''].groupby('mfgMethod')['cmp'].nunique()
    h.append(mc.sort_values(ascending=False).head(10).to_frame('sig_wins').to_html())

# 8. Cross-paper
h.append('<h2>8. Cross-Paper Consistency</h2>')
h.append(cross_paper[cross_paper['papers'] >= 2].head(15).to_html())

# 9. Gaps
h.append('<h2>9. Gap Analysis: Untested Combinations</h2>')
h.append('<p>Untested combinations: ' + str(len(gaps_df)) + '</p>')
if not gaps_df.empty:
    h.append(gaps_df.to_html(index=False))

# 10. Hypothesis scoring
h.append('<h2>10. Material Hypothesis Ranking</h2>')
res = material_scores[material_scores['sig_wins'] >= 3].head(15).copy()
res['win_rate'] = res['win_rate'].map('{:.1%}'.format)
res['score'] = res['score'].map('{:.2f}'.format)
h.append(res.to_html(index=False))

h.append('</body></html>')

out = Path('results.html')
out.write_text('\n'.join(h))
print('Exported to ' + str(out.resolve()))
