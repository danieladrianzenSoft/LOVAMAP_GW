import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { RdfGraphNode, RdfGraphEdge } from '../../models/rdfGraph';

interface OntologyGraphProps {
	nodes: RdfGraphNode[];
	edges: RdfGraphEdge[];
	height?: number;
	darkMode?: boolean;
	onNodeClick?: (node: RdfGraphNode) => void;
}

const THEME = {
	light: {
		bg: '#f9fafb',
		nodeColors: { class: '#4f46e5', instance: '#2563eb', literal: '#059669' },
		classBorder: '#3730a3',
		labelColor: '#374151',
		edgeColor: 'rgba(107, 114, 128, 0.3)',
		edgeLabelColor: 'rgba(107, 114, 128, 0.7)',
	},
	dark: {
		bg: '#111827',
		nodeColors: { class: '#6366f1', instance: '#3b82f6', literal: '#10b981' },
		classBorder: '#4338ca',
		labelColor: '#e5e7eb',
		edgeColor: 'rgba(156, 163, 175, 0.3)',
		edgeLabelColor: 'rgba(156, 163, 175, 0.7)',
	},
};

// Radius per node type
const NODE_RADIUS: Record<string, number> = {
	class: 8,
	instance: 5,
	literal: 4,
};

// nodeVal controls built-in circle size: radius = sqrt(val) * nodeRelSize
// With nodeRelSize=1, val = radius^2
const NODE_VAL: Record<string, number> = {
	class: 64,
	instance: 25,
	literal: 16,
};

const OntologyGraph: React.FC<OntologyGraphProps> = ({
	nodes,
	edges,
	height = 500,
	darkMode = false,
	onNodeClick,
}) => {
	const graphRef = useRef<ForceGraphMethods | undefined>();
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number | undefined>();
	const theme = darkMode ? THEME.dark : THEME.light;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setContainerWidth(entry.contentRect.width);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const graphData = useMemo(() => ({
		nodes: nodes.map(n => ({ ...n })),
		links: edges.map(e => ({
			source: e.source,
			target: e.target,
			label: e.label,
		})),
	}), [nodes, edges]);

	const handleEngineStop = useCallback(() => {
		if (graphRef.current) {
			graphRef.current.zoomToFit(400, 40);
		}
	}, []);

	const handleNodeClick = useCallback((node: any) => {
		if (onNodeClick) {
			onNodeClick(node as RdfGraphNode);
		}
		if (graphRef.current) {
			graphRef.current.centerAt(node.x, node.y, 400);
			graphRef.current.zoom(3, 400);
		}
	}, [onNodeClick]);

	// Built-in rendering draws the circles + handles hit detection.
	// "after" mode lets us draw labels and class borders on top.
	const nodeCanvasObjectAfter = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
		const nodeType = node.type || 'instance';
		const radius = NODE_RADIUS[nodeType] || 5;

		// Add border ring for class nodes
		if (nodeType === 'class') {
			ctx.beginPath();
			ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
			ctx.strokeStyle = theme.classBorder;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		// Draw label when zoomed in
		if (globalScale > 1.2) {
			const label = node.label || node.id;
			const fontSize = Math.max(10 / globalScale, 1.5);
			ctx.font = `${fontSize}px Sans-Serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillStyle = theme.labelColor;
			ctx.fillText(label, node.x, node.y + radius + 2);
		}
	}, [theme]);

	const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
		const start = link.source;
		const end = link.target;

		if (!start || !end || typeof start.x !== 'number') return;

		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.strokeStyle = theme.edgeColor;
		ctx.lineWidth = 0.5;
		ctx.stroke();

		if (globalScale > 2.5 && link.label) {
			const midX = (start.x + end.x) / 2;
			const midY = (start.y + end.y) / 2;
			const fontSize = Math.max(8 / globalScale, 1.2);
			ctx.font = `${fontSize}px Sans-Serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = theme.edgeLabelColor;
			ctx.fillText(link.label, midX, midY);
		}
	}, [theme]);

	const getNodeColor = useCallback((node: any) => {
		const nodeType = node.type || 'instance';
		return theme.nodeColors[nodeType as keyof typeof theme.nodeColors] || theme.nodeColors.instance;
	}, [theme]);

	const getNodeVal = useCallback((node: any) => {
		const nodeType = node.type || 'instance';
		return NODE_VAL[nodeType] || 25;
	}, []);

	if (nodes.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				No graph data available.
			</div>
		);
	}

	return (
		<div ref={containerRef}>
			{containerWidth && (
				<ForceGraph2D
					ref={graphRef}
					graphData={graphData}
					width={containerWidth}
					height={height}
					backgroundColor={theme.bg}
					nodeColor={getNodeColor}
					nodeVal={getNodeVal}
					nodeRelSize={1}
					nodeCanvasObjectMode={() => 'after'}
					nodeCanvasObject={nodeCanvasObjectAfter}
					linkCanvasObject={linkCanvasObject}
					onNodeClick={handleNodeClick}
					onEngineStop={handleEngineStop}
					cooldownTicks={100}
					d3AlphaDecay={0.02}
					d3VelocityDecay={0.3}
				/>
			)}
		</div>
	);
};

export default OntologyGraph;
