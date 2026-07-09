import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import OntologyGraph, { getGroupColor } from '../../app/common/ontology-graph/OntologyGraph';
import agent from '../../app/api/agent';
import { useStore } from '../../app/stores/store';
import { RdfGraph, RdfGraphNode, RdfOntologySummary } from '../../app/models/rdfGraph';

interface RdfVisualizationProps {
	height?: number;
}

const RdfVisualization: React.FC<RdfVisualizationProps> = ({ height = 500 }) => {
	const { commonStore } = useStore();
	const [graph, setGraph] = useState<RdfGraph | null>(null);
	const [summary, setSummary] = useState<RdfOntologySummary | null>(null);
	const [selectedNode, setSelectedNode] = useState<RdfGraphNode | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [graphData, summaryData] = await Promise.all([
					agent.RdfVisualization.getGraph(),
					agent.RdfVisualization.getGraphSummary(),
				]);
				setGraph(graphData);
				setSummary(summaryData);
			} catch (err: any) {
				setError(err?.message || 'Failed to load RDF graph data.');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const legendGroups = useMemo(() => {
		if (!graph) return [];
		const groups = new Set<string>();
		for (const n of graph.nodes) {
			if (n.group) groups.add(n.group);
		}
		return Array.from(groups).sort();
	}, [graph]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
				<span className="ml-3 text-gray-500 dark:text-gray-400">Loading knowledge graph...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-20 text-red-500">
				{error}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Summary stats */}
			{summary && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatCard label="Total Triples" value={summary.totalTriples} />
					<StatCard label="Total Instances" value={summary.totalInstances} />
					<StatCard label="Classes" value={summary.classes.length} />
					<StatCard label="Properties" value={summary.properties.length} />
				</div>
			)}

			{/* Graph */}
			<div className="rounded-lg overflow-hidden">
				{graph && (
					<OntologyGraph
						nodes={graph.nodes}
						edges={graph.edges}
						height={height}
						darkMode={commonStore.darkMode}
						onNodeClick={setSelectedNode}
					/>
				)}
			</div>

			{/* Legend + details row */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{/* Legend */}
				<div className="bg-white dark:bg-gray-800 rounded-lg p-4">
					<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Legend</h4>
					<div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
						{legendGroups.map(g => (
							<span key={g} className="flex items-center gap-1.5">
								<span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(g) }}></span>
								{g}
							</span>
						))}
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
						Click a node to zoom in. Scroll to zoom. Drag to pan.
					</p>
				</div>

				{/* Selected node details */}
				<div className="bg-white dark:bg-gray-800 rounded-lg p-4">
					<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Node Details</h4>
					{selectedNode ? (
						<div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
							<p><span className="text-gray-800 dark:text-gray-300 font-medium">Label:</span> {selectedNode.label}</p>
							<p><span className="text-gray-800 dark:text-gray-300 font-medium">Type:</span> {selectedNode.type}</p>
							{selectedNode.group && (
								<p><span className="text-gray-800 dark:text-gray-300 font-medium">Group:</span> {selectedNode.group}</p>
							)}
							{Object.keys(selectedNode.properties).length > 0 && (
								<div>
									<span className="text-gray-800 dark:text-gray-300 font-medium">Properties:</span>
									<ul className="ml-3 mt-1 space-y-0.5">
										{Object.entries(selectedNode.properties).map(([k, v]) => (
											<li key={k}>{k}: {String(v)}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					) : (
						<p className="text-xs text-gray-400 dark:text-gray-500">Click a node to see its details.</p>
					)}
				</div>
			</div>

			{/* Ontology summary tables */}
			{summary && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{summary.classes.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-lg p-4">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Classes</h4>
							<table className="w-full text-xs text-gray-600 dark:text-gray-400">
								<thead>
									<tr className="border-b border-gray-100 dark:border-gray-700">
										<th className="text-left py-1">Class</th>
										<th className="text-right py-1">Instances</th>
									</tr>
								</thead>
								<tbody>
									{summary.classes.map(c => (
										<tr key={c.uri} className="border-b border-gray-100 dark:border-gray-700/50">
											<td className="py-1">{c.label}</td>
											<td className="text-right py-1">{c.instanceCount}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{summary.properties.length > 0 && (
						<div className="bg-white dark:bg-gray-800 rounded-lg p-4">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Properties</h4>
							<table className="w-full text-xs text-gray-600 dark:text-gray-400">
								<thead>
									<tr className="border-b border-gray-100 dark:border-gray-700">
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
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
		<p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
		<p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
	</div>
);

export default observer(RdfVisualization);
