import React, { useState, useRef } from 'react';
import { queryApi } from '../api/client';
import { FiSend, FiPlay, FiChevronUp, FiChevronDown, FiCode, FiX } from 'react-icons/fi';
import { useQueryState } from '../hooks/useQueryState';

const EXAMPLES = [
	'How does particle size affect macrophage polarization markers like CD206 and CD86?',
	'Compare TNF and IL-6 secretion levels across the different MAP scaffold sizes',
	'What peptides and crosslinkers are used in each fabrication method?',
	'Which experiments used hECFC cells and what were the vasculogenesis outcomes?',
];

/** Convert markdown links [text](url) to <a> tags, escaping the rest */
function renderMarkdownLinks(text: string): string {
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	return escaped.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer" class="text-kb-600 dark:text-kb-400 underline hover:text-kb-800 dark:hover:text-kb-300">$1</a>',
	);
}

const QueryPage: React.FC = () => {
	const {
		question, setQuestion,
		sparql, setSparql,
		result, setResult,
		error, setError,
		sortField, setSortField,
		sortDir, setSortDir,
		sparqlOpen, setSparqlOpen,
	} = useQueryState();
	const [loading, setLoading] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleAsk = async (q?: string) => {
		const text = q ?? question;
		if (!text.trim()) return;
		setLoading(true);
		setError(null);
		setResult(null);
		setSortField('');
		try {
			const r = await queryApi.ask(text.trim());
			setResult(r);
			setSparql(r.sparql);
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || 'Request failed.');
		} finally {
			setLoading(false);
		}
	};

	const handleRunSparql = async () => {
		if (!sparql.trim()) return;
		setLoading(true);
		setError(null);
		setResult(null);
		setSortField('');
		try {
			const r = await queryApi.runSparql(sparql.trim());
			setResult(r);
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || 'Request failed.');
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAsk();
		}
	};

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const sortedRows = result
		? [...result.rows].sort((a, b) => {
				if (!sortField) return 0;
				const av = a[sortField] ?? '';
				const bv = b[sortField] ?? '';
				const an = Number(av);
				const bn = Number(bv);
				if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
				return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
			})
		: [];

	// Filter out the first column if all its values are URIs
	const displayColumns = result
		? (() => {
				const cols = result.columns;
				if (cols.length < 2) return cols;
				const firstCol = cols[0];
				const allUri = result.rows.length > 0 && result.rows.every(r => (r[firstCol] ?? '').startsWith('http'));
				return allUri ? cols.slice(1) : cols;
			})()
		: [];

	const SortIcon: React.FC<{ field: string }> = ({ field }) => {
		if (sortField !== field) return null;
		return sortDir === 'asc' ? (
			<FiChevronUp className="inline ml-0.5" size={14} />
		) : (
			<FiChevronDown className="inline ml-0.5" size={14} />
		);
	};

	// Shorten URIs for display
	const shorten = (v: string) => {
		if (!v.startsWith('http')) return v;
		const hash = v.lastIndexOf('#');
		if (hash >= 0) return v.slice(hash + 1);
		const slash = v.lastIndexOf('/');
		return slash >= 0 ? v.slice(slash + 1) : v;
	};

	return (
		<div className="flex flex-col p-4 sm:p-6 gap-4">
			{/* ── Question input ── */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Ask a question about the knowledge base
				</label>
				<div className="flex gap-2">
					<input
						type="text"
						value={question}
						onChange={e => setQuestion(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g. Show me the papers where particle size affects cell response..."
						className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kb-500 focus:border-transparent"
						disabled={loading}
					/>
					<button
						onClick={() => handleAsk()}
						disabled={loading || !question.trim()}
						className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-kb-600 text-white text-sm font-medium hover:bg-kb-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<FiSend size={14} />
						Ask
					</button>
					{(sparql || result) && !loading && (
						<button
							onClick={() => setSparqlOpen(true)}
							className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-kb-300 dark:border-kb-600 text-kb-600 dark:text-kb-400 text-sm font-medium hover:bg-kb-50 dark:hover:bg-kb-900/20 transition-colors"
							title="View SPARQL query"
						>
							<FiCode size={14} />
							SPARQL
						</button>
					)}
				</div>

				{/* Example chips */}
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1.5">Try an example</p>
				<div className="flex flex-wrap gap-2">
					{EXAMPLES.map(ex => (
						<button
							key={ex}
							onClick={() => {
								setQuestion(ex);
								handleAsk(ex);
							}}
							disabled={loading}
							className="px-2.5 py-1 rounded-full text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
						>
							{ex}
						</button>
					))}
				</div>
			</div>

			{/* ── Loading ── */}
			{loading && (
				<div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
					<svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					{sparql ? 'Running query...' : 'Generating SPARQL...'}
				</div>
			)}

			{/* ── Error ── */}
			{error && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
					{error}
				</div>
			)}

			{/* ── SPARQL sidebar ── */}
			{sparqlOpen && (
				<>
					<div
						className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
						onClick={() => setSparqlOpen(false)}
					/>
					<div className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col animate-slide-in-right">
						<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
								SPARQL Query
							</span>
							<button
								onClick={() => setSparqlOpen(false)}
								className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<FiX size={18} />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
							{result?.explanation && (
								<p className="text-xs text-gray-500 dark:text-gray-400 italic">
									{result.explanation}
								</p>
							)}
							<textarea
								ref={textareaRef}
								value={sparql}
								onChange={e => setSparql(e.target.value)}
								rows={Math.min(sparql.split('\n').length + 1, 20)}
								className="w-full flex-1 font-mono text-xs px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-kb-500 focus:border-transparent resize-y"
								spellCheck={false}
							/>
							<button
								onClick={handleRunSparql}
								disabled={loading || !sparql.trim()}
								className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<FiPlay size={14} />
								Run
							</button>
						</div>
					</div>
				</>
			)}

			{/* ── Answer ── */}
			{result?.answer && !loading && (
				<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-orange-500 rounded-lg p-4">
					<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
						Answer
					</h3>
					<div
						className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose-link"
						dangerouslySetInnerHTML={{ __html: renderMarkdownLinks(result.answer) }}
					/>
				</div>
			)}

			{/* ── Results table ── */}
			{result && displayColumns.length > 0 && !loading && (
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Results
						</span>
						<span className="text-xs text-gray-500 dark:text-gray-400">
							{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
						</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-xs">
							<thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
								<tr>
									{displayColumns.map(col => (
										<th
											key={col}
											onClick={() => handleSort(col)}
											className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 whitespace-nowrap select-none"
										>
											{col}
											<SortIcon field={col} />
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-gray-700">
								{sortedRows.map((row, i) => (
									<tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
										{displayColumns.map(col => (
											<td key={col} className="px-3 py-1.5 text-gray-800 dark:text-gray-200 max-w-xs truncate" title={row[col]}>
												{shorten(row[col] ?? '')}
											</td>
										))}
									</tr>
								))}
								{sortedRows.length === 0 && (
									<tr>
										<td colSpan={displayColumns.length} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
											No results found.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default QueryPage;
