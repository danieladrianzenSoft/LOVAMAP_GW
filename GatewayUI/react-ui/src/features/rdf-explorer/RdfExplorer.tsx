import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import OntologyGraph, { getGroupColor } from '../../app/common/ontology-graph/OntologyGraph';
import agent from '../../app/api/agent';
import { useStore } from '../../app/stores/store';
import { RdfGraph, RdfGraphNode, RdfOntologySummary } from '../../app/models/rdfGraph';
import { parseTtlToGraph, buildSummaryFromQuads } from '../../app/helpers/ttlParser';
import TtlDropZone from './TtlDropZone';
import toast from 'react-hot-toast';
import { FiChevronUp, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

type Mode = 'database' | 'ttl';

// --- Compression helpers (browser-native CompressionStream) ---

async function compressString(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const stream = new Blob([encoder.encode(input)]).stream();
	const compressed = stream.pipeThrough(new CompressionStream('deflate'));
	const chunks: Uint8Array[] = [];
	const reader = compressed.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	let binary = '';
	for (let i = 0; i < result.length; i++) {
		binary += String.fromCharCode(result[i]);
	}
	return btoa(binary);
}

async function decompressString(base64: string): Promise<string> {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const stream = new Blob([bytes]).stream();
	const decompressed = stream.pipeThrough(new DecompressionStream('deflate'));
	const reader = decompressed.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return new TextDecoder().decode(result);
}

// --- Floating panel wrapper ---

const FloatingPanel: React.FC<{
	title: string;
	isOpen: boolean;
	onToggle: () => void;
	maxHeight?: string;
	className?: string;
	children: React.ReactNode;
}> = ({ title, isOpen, onToggle, maxHeight = '60vh', className = '', children }) => (
	<div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-lg p-4 ${className}`}>
		<div
			className="flex justify-between items-center cursor-pointer"
			onClick={onToggle}
		>
			<h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
			{isOpen ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
		</div>
		<div
			className={`transition-all duration-300 ${isOpen ? 'opacity-100 mt-3' : 'max-h-0 opacity-0 overflow-hidden'}`}
			style={isOpen ? { maxHeight } : undefined}
		>
			<div className={isOpen ? 'overflow-y-auto' : ''} style={isOpen ? { maxHeight: `calc(${maxHeight} - 2rem)` } : undefined}>
				{children}
			</div>
		</div>
	</div>
);

// --- Main component ---

const RdfExplorer: React.FC = () => {
	const { commonStore } = useStore();

	const [mode, setMode] = useState<Mode>('database');
	const [graph, setGraph] = useState<RdfGraph | null>(null);
	const [summary, setSummary] = useState<RdfOntologySummary | null>(null);
	const [selectedNode, setSelectedNode] = useState<RdfGraphNode | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Panel states
	const [legendOpen, setLegendOpen] = useState(true);
	const [propertiesOpen, setPropertiesOpen] = useState(false);

	// Legend filtering
	const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

	// Search
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearchDropdown, setShowSearchDropdown] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

	// Hover
	const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();

	// Focus on node
	const [focusNodeId, setFocusNodeId] = useState<string | undefined>();
	const [focusTrigger, setFocusTrigger] = useState(0);

	// Toolbar height measurement
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [toolbarHeight, setToolbarHeight] = useState(0);

	useEffect(() => {
		const el = toolbarRef.current;
		if (!el) return;
		const observer = new ResizeObserver(() => {
			setToolbarHeight(el.offsetHeight);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// Track loaded TTL files
	const [ttlFiles, setTtlFiles] = useState<Map<string, string>>(new Map());

	// --- Close search dropdown on click outside ---
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setShowSearchDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// --- Load from URL hash on mount ---
	useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.startsWith('#ttl=')) {
			const encoded = hash.substring(5);
			setMode('ttl');
			decompressString(decodeURIComponent(encoded))
				.then((ttlContent) => {
					setTtlFiles(new Map([['shared.ttl', ttlContent]]));
					try {
						setGraph(parseTtlToGraph(ttlContent));
						setSummary(buildSummaryFromQuads(ttlContent));
					} catch (err: any) {
						setError(`Failed to parse shared TTL: ${err.message}`);
					}
				})
				.catch(() => {
					setError('Failed to decompress shared link data.');
				});
		}
	}, []);

	// --- Database mode: fetch from API ---
	useEffect(() => {
		if (mode !== 'database') return;
		let cancelled = false;

		const fetchData = async () => {
			setLoading(true);
			setError(null);
			try {
				const [graphData, summaryData] = await Promise.all([
					agent.RdfVisualization.getGraph(),
					agent.RdfVisualization.getGraphSummary(),
				]);
				if (!cancelled) {
					setGraph(graphData);
					setSummary(summaryData);
				}
			} catch (err: any) {
				if (!cancelled) setError(err?.message || 'Failed to load RDF graph data.');
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchData();
		return () => { cancelled = true; };
	}, [mode]);

	// --- TTL mode: re-parse whenever files change ---
	useEffect(() => {
		if (mode !== 'ttl' || ttlFiles.size === 0) return;

		try {
			const merged = Array.from(ttlFiles.values()).join('\n\n');
			setGraph(parseTtlToGraph(merged));
			setSummary(buildSummaryFromQuads(merged));
			setError(null);
		} catch (err: any) {
			setError(`TTL parse error: ${err.message}`);
		}
	}, [mode, ttlFiles]);

	const handleTtlLoaded = useCallback((content: string, fileName: string) => {
		setTtlFiles((prev) => {
			const next = new Map(prev);
			next.set(fileName, content);
			return next;
		});
	}, []);

	const handleModeChange = (newMode: Mode) => {
		setMode(newMode);
		setGraph(null);
		setSummary(null);
		setSelectedNode(null);
		setError(null);
		setHiddenGroups(new Set());
		if (newMode === 'ttl') {
			setTtlFiles(new Map());
		}
		if (newMode !== 'ttl') {
			window.location.hash = '';
		}
	};

	const handleCopyShareLink = async () => {
		if (ttlFiles.size === 0) return;
		const merged = Array.from(ttlFiles.values()).join('\n\n');
		try {
			const compressed = await compressString(merged);
			if (compressed.length > 32_000) {
				toast.error('TTL data too large for URL sharing (> ~32KB compressed). Consider using smaller files.');
				return;
			}
			const url = `${window.location.origin}${window.location.pathname}#ttl=${encodeURIComponent(compressed)}`;
			await navigator.clipboard.writeText(url);
			toast.success('Share link copied to clipboard!');
		} catch (err: any) {
			toast.error('Failed to create share link.');
		}
	};

	const handleClearFiles = () => {
		setTtlFiles(new Map());
		setGraph(null);
		setSummary(null);
		setSelectedNode(null);
		window.location.hash = '';
	};

	// --- Legend groups with counts ---
	const legendGroups = useMemo(() => {
		if (!graph) return [];
		const counts = new Map<string, number>();
		for (const n of graph.nodes) {
			if (n.group) counts.set(n.group, (counts.get(n.group) || 0) + 1);
		}
		return Array.from(counts.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([group, count]) => ({ group, count }));
	}, [graph]);

	const toggleGroup = useCallback((group: string) => {
		setHiddenGroups(prev => {
			const next = new Set(prev);
			if (next.has(group)) next.delete(group);
			else next.add(group);
			return next;
		});
	}, []);

	// --- Visibility callbacks for ForceGraph2D ---
	const nodeVisibility = useCallback((node: any) => {
		if (hiddenGroups.size === 0) return true;
		return !hiddenGroups.has(node.group || '');
	}, [hiddenGroups]);

	const linkVisibility = useCallback((link: any) => {
		if (hiddenGroups.size === 0) return true;
		const src = typeof link.source === 'object' ? link.source : null;
		const tgt = typeof link.target === 'object' ? link.target : null;
		if (src && hiddenGroups.has(src.group || '')) return false;
		if (tgt && hiddenGroups.has(tgt.group || '')) return false;
		return true;
	}, [hiddenGroups]);

	// --- Connections for selected node ---
	const nodeConnections = useMemo(() => {
		if (!selectedNode || !graph) return [];
		const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
		return graph.edges.flatMap(edge => {
			if (edge.source === selectedNode.id) {
				const t = nodeMap.get(edge.target);
				return t ? [{ edgeLabel: edge.label, targetNode: t }] : [];
			}
			if (edge.target === selectedNode.id) {
				const s = nodeMap.get(edge.source);
				return s ? [{ edgeLabel: edge.label, targetNode: s }] : [];
			}
			return [];
		});
	}, [selectedNode, graph]);

	// --- Navigate to a connected node ---
	const navigateToNode = useCallback((node: RdfGraphNode) => {
		setSelectedNode(node);
		setFocusNodeId(node.id);
		setFocusTrigger(t => t + 1);
	}, []);

	// --- Search ---
	const searchResults = useMemo(() => {
		if (!searchQuery.trim() || !graph) return [];
		const q = searchQuery.toLowerCase();
		return graph.nodes
			.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
			.slice(0, 20);
	}, [searchQuery, graph]);

	const handleSearchSelect = useCallback((node: RdfGraphNode) => {
		setSelectedNode(node);
		setFocusNodeId(node.id);
		setFocusTrigger(t => t + 1);
		setShowSearchDropdown(false);
		setSearchQuery('');
	}, []);

	const handleNodeHover = useCallback((node: RdfGraphNode | null) => {
		setHoveredNodeId(node?.id);
	}, []);

	const handleBackgroundClick = useCallback(() => {
		setSelectedNode(null);
	}, []);

	return (
		<div className="relative w-full h-[calc(100vh-4rem)] mt-8 -mb-8 overflow-hidden">
			{/* ── Floating top toolbar ── */}
			<div ref={toolbarRef} className="absolute top-0 left-0 right-0 z-50 px-4 py-3 bg-[#f7f5f4]/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-3 flex-wrap">
				<h1 className="text-xl font-bold text-gray-800 dark:text-white mr-2">RDF Explorer</h1>

				{/* Mode toggle */}
				<div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
					<button
						onClick={() => handleModeChange('database')}
						className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
							mode === 'database'
								? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
						}`}
					>
						Database
					</button>
					<button
						onClick={() => handleModeChange('ttl')}
						className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
							mode === 'ttl'
								? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
						}`}
					>
						TTL Preview
					</button>
				</div>

				{/* Stat pills */}
				{summary && (
					<div className="flex gap-2">
						{[
							{ label: 'Triples', value: summary.totalTriples },
							{ label: 'Instances', value: summary.totalInstances },
							{ label: 'Classes', value: summary.classes.length },
							{ label: 'Properties', value: summary.properties.length },
						].map(s => (
							<span key={s.label} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-300">
								<span className="font-semibold">{s.value}</span> {s.label}
							</span>
						))}
					</div>
				)}

				<div className="flex-1" />

				{/* Search */}
				{graph && (
					<div ref={searchRef} className="relative">
						<div className="flex items-center bg-white dark:bg-gray-800 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
							<FiSearch className="text-gray-400 mr-1.5" size={14} />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => {
									setSearchQuery(e.target.value);
									setShowSearchDropdown(true);
								}}
								onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
								placeholder="Search nodes..."
								className="bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none w-40 placeholder-gray-400"
							/>
							{searchQuery && (
								<button onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>
									<FiX className="text-gray-400 hover:text-gray-600" size={14} />
								</button>
							)}
						</div>
						{showSearchDropdown && searchResults.length > 0 && (
							<div className="absolute top-full mt-1 right-0 w-72 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
								{searchResults.map(node => (
									<button
										key={node.id}
										onClick={() => handleSearchSelect(node)}
										className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
									>
										<span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getGroupColor(node.group) }} />
										<span className="text-gray-800 dark:text-gray-200 truncate">{node.label}</span>
										{node.group && <span className="text-gray-400 ml-auto flex-shrink-0">{node.group}</span>}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* TTL actions */}
				{mode === 'ttl' && ttlFiles.size > 0 && (
					<div className="flex gap-2">
						<button
							onClick={handleCopyShareLink}
							className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
						>
							Copy Share Link
						</button>
						<button
							onClick={handleClearFiles}
							className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
						>
							Clear
						</button>
					</div>
				)}

				{/* Loaded TTL files indicator */}
				{mode === 'ttl' && ttlFiles.size > 0 && (
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs text-gray-500 dark:text-gray-400">Loaded:</span>
						{Array.from(ttlFiles.keys()).map((name) => (
							<span key={name} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
								{name}
							</span>
						))}
						<button
							onClick={() => document.getElementById('ttl-add-more')?.click()}
							className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
						>
							+ Add more
						</button>
						<input
							id="ttl-add-more"
							type="file"
							accept=".ttl"
							multiple
							className="hidden"
							onChange={(e) => {
								const files = e.target.files;
								if (!files) return;
								for (let i = 0; i < files.length; i++) {
									const file = files[i];
									const reader = new FileReader();
									reader.onload = () => {
										if (typeof reader.result === 'string') {
											handleTtlLoaded(reader.result, file.name);
										}
									};
									reader.readAsText(file);
								}
								e.target.value = '';
							}}
						/>
					</div>
				)}
			</div>

			{/* ── Graph area (fills entire viewport) ── */}
			<div className="absolute inset-0">
				{/* Loading */}
				{loading && (
					<div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-gray-900/50">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
						<span className="ml-3 text-gray-500 dark:text-gray-400">Loading knowledge graph...</span>
					</div>
				)}

				{/* Error */}
				{error && (
					<div className="absolute left-1/2 -translate-x-1/2 z-20 px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded-lg shadow" style={{ top: toolbarHeight + 12 }}>
						{error}
					</div>
				)}

				{/* TTL drop zone (centered overlay when no files in TTL mode) */}
				{mode === 'ttl' && ttlFiles.size === 0 && !loading && !error && (
					<div className="absolute inset-0 flex items-center justify-center z-10">
						<div className="w-full max-w-md">
							<TtlDropZone onTtlLoaded={handleTtlLoaded} />
						</div>
					</div>
				)}

				{/* Graph */}
				{!loading && graph && (
					<div className="absolute inset-0">
						<OntologyGraph
							nodes={graph.nodes}
							edges={graph.edges}
							darkMode={commonStore.darkMode}
							onNodeClick={setSelectedNode}
							onNodeHover={handleNodeHover}
							onBackgroundClick={handleBackgroundClick}
							selectedNodeId={selectedNode?.id}
							hoveredNodeId={hoveredNodeId}
							focusNodeId={focusNodeId}
							focusTrigger={focusTrigger}
							nodeVisibility={nodeVisibility}
							linkVisibility={linkVisibility}
						/>
					</div>
				)}

				{/* ── Legend panel (bottom-left) ── */}
				{graph && (
					<div className="absolute bottom-4 left-4 z-20 w-56">
						<FloatingPanel title="Legend" isOpen={legendOpen} onToggle={() => setLegendOpen(!legendOpen)}>
							<div className="flex flex-col gap-1.5 text-xs">
								{legendGroups.map(({ group, count }) => {
									const hidden = hiddenGroups.has(group);
									return (
										<button
											key={group}
											onClick={() => toggleGroup(group)}
											className={`flex items-center gap-1.5 text-left transition-opacity ${hidden ? 'opacity-40' : 'opacity-100'}`}
										>
											<span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getGroupColor(group) }} />
											<span className={`text-gray-700 dark:text-gray-300 ${hidden ? 'line-through' : ''}`}>
												{group} ({count})
											</span>
										</button>
									);
								})}
							</div>
							<p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
								Click to toggle. Scroll to zoom. Drag to pan.
							</p>
						</FloatingPanel>
					</div>
				)}

				{/* ── Node Details panel (top-right, below toolbar) ── */}
				{graph && (
					<div className="absolute right-4 z-40 w-72" style={{ top: toolbarHeight + 24 }}>
						<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-lg p-4 overflow-y-auto" style={{ maxHeight: `calc(100vh - ${toolbarHeight + 140}px)` }}>
							<h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Node Details</h2>
							{selectedNode ? (
								<div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
									{/* Group badge */}
									{selectedNode.group && (
										<span
											className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium"
											style={{ backgroundColor: getGroupColor(selectedNode.group) }}
										>
											{selectedNode.group}
										</span>
									)}

									<p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{selectedNode.label}</p>
									<p className="text-gray-400 dark:text-gray-500 break-all">{selectedNode.id}</p>

									{/* Properties */}
									{Object.keys(selectedNode.properties).length > 0 && (
										<div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
											<p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Properties</p>
											<div className="space-y-1">
												{Object.entries(selectedNode.properties).map(([k, v]) => (
													<div key={k} className="flex gap-2">
														<span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{k}:</span>
														<span className="text-gray-700 dark:text-gray-300 break-all">{String(v)}</span>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Connections */}
									{nodeConnections.length > 0 && (
										<div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
											<p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
												Connections ({nodeConnections.length})
											</p>
											<div className="space-y-1 max-h-48 overflow-y-auto">
												{nodeConnections.map((conn, i) => (
													<button
														key={i}
														onClick={() => navigateToNode(conn.targetNode)}
														className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
													>
														<span
															className="w-2 h-2 rounded-full flex-shrink-0"
															style={{ backgroundColor: getGroupColor(conn.targetNode.group) }}
														/>
														<span className="truncate text-gray-700 dark:text-gray-300">{conn.targetNode.label}</span>
														<span className="text-gray-400 ml-auto flex-shrink-0 text-[10px]">{conn.edgeLabel}</span>
													</button>
												))}
											</div>
										</div>
									)}
								</div>
							) : (
								<p className="text-xs text-gray-400 dark:text-gray-500">Click a node to see its details.</p>
							)}
						</div>
					</div>
				)}

				{/* ── Properties panel (bottom-right) ── */}
				{graph && summary && (
					<div className="absolute bottom-4 right-4 z-20 w-64 space-y-2">
						{summary.properties.length > 0 && (
							<FloatingPanel title={`Properties (${summary.properties.length})`} isOpen={propertiesOpen} onToggle={() => setPropertiesOpen(!propertiesOpen)} maxHeight="30vh">
								<table className="w-full text-xs text-gray-600 dark:text-gray-400">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-1">Property</th>
											<th className="text-right py-1">Usage</th>
										</tr>
									</thead>
									<tbody>
										{summary.properties.map(p => (
											<tr key={p.uri} className="border-b border-gray-100 dark:border-gray-700/50">
												<td className="py-1">{p.label}</td>
												<td className="text-right py-1">{p.usageCount}</td>
											</tr>
										))}
									</tbody>
								</table>
							</FloatingPanel>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default observer(RdfExplorer);
