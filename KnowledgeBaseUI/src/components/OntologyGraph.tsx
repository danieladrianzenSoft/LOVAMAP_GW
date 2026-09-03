import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { RdfGraphNode, RdfGraphEdge } from '../models/rdfGraph';

interface OntologyGraphProps {
	nodes: RdfGraphNode[];
	edges: RdfGraphEdge[];
	height?: number;
	darkMode?: boolean;
	onNodeClick?: (node: RdfGraphNode) => void;
	onBackgroundClick?: () => void;
	selectedNodeId?: string;
	hoveredNodeId?: string;
	onNodeHover?: (node: RdfGraphNode | null) => void;
	focusNodeId?: string;
	focusTrigger?: number;
	nodeVisibility?: (node: any) => boolean;
	linkVisibility?: (link: any) => boolean;
}

const GROUP_COLORS: Record<string, string> = {
	Paper:              '#e0a458',
	Author:             '#4fb0a5',
	Journal:            '#a888d4',
	Material:           '#e2725b',
	FabricationMethod:  '#d46aa8',
	Experiment:         '#5b8def',
	Outcome:            '#6fbf73',
	GeometryProfile:    '#8a94a6',
	BiologicalModel:    '#5b8def',
};

const FALLBACK_PALETTE = [
	'#e0a458', '#4fb0a5', '#a888d4', '#e2725b',
	'#d46aa8', '#5b8def', '#6fbf73', '#8a94a6',
];

function hashCode(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

function getGroupColor(group: string | undefined): string {
	if (!group) return '#8a94a6';
	return GROUP_COLORS[group] || FALLBACK_PALETTE[hashCode(group) % FALLBACK_PALETTE.length];
}

const THEME = {
	light: {
		bg: '#ffffff',
		edgeColor: 'rgba(107, 114, 128, 0.25)',
		edgeLabelColor: 'rgba(107, 114, 128, 0.7)',
		labelColor: '#374151',
	},
	dark: {
		bg: '#111827',
		edgeColor: 'rgba(156, 163, 175, 0.25)',
		edgeLabelColor: 'rgba(156, 163, 175, 0.7)',
		labelColor: '#e5e7eb',
	},
};

const NODE_RADII: Record<string, number> = {
	Paper:             8,
	Author:            4,
	Journal:           6,
	Material:          6,
	FabricationMethod: 5,
	Experiment:        6,
	Outcome:           5,
	GeometryProfile:   5,
	BiologicalModel:   5,
};
const DEFAULT_RADIUS = 5;

function getNodeRadius(node: any): number {
	return NODE_RADII[node.group] ?? DEFAULT_RADIUS;
}


function findNearestNode(
	nodes: any[],
	graphX: number,
	graphY: number,
	zoom: number,
): any | null {
	const threshold = 20 / zoom;
	let nearest: any = null;
	let nearestDist = Infinity;
	for (const n of nodes) {
		if (typeof n.x !== 'number' || typeof n.y !== 'number') continue;
		const dx = n.x - graphX;
		const dy = n.y - graphY;
		const d = Math.sqrt(dx * dx + dy * dy);
		if (d < threshold && d < nearestDist) {
			nearest = n;
			nearestDist = d;
		}
	}
	return nearest;
}

const OntologyGraph: React.FC<OntologyGraphProps> = ({
	nodes,
	edges,
	height,
	darkMode = false,
	onNodeClick,
	onBackgroundClick,
	selectedNodeId,
	hoveredNodeId,
	onNodeHover,
	focusNodeId,
	focusTrigger,
	nodeVisibility,
	linkVisibility,
}) => {
	const graphRef = useRef<ForceGraphMethods | undefined>();
	const hasZoomedRef = useRef(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number | undefined>();
	const [containerHeight, setContainerHeight] = useState<number | undefined>();
	const theme = darkMode ? THEME.dark : THEME.light;

	const hoveredRef = useRef(hoveredNodeId);
	const selectedRef = useRef(selectedNodeId);
	const onNodeClickRef = useRef(onNodeClick);
	const onNodeHoverRef = useRef(onNodeHover);
	const onBackgroundClickRef = useRef(onBackgroundClick);
	hoveredRef.current = hoveredNodeId;
	selectedRef.current = selectedNodeId;
	onNodeClickRef.current = onNodeClick;
	onNodeHoverRef.current = onNodeHover;
	onBackgroundClickRef.current = onBackgroundClick;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setContainerWidth(entry.contentRect.width);
				setContainerHeight(entry.contentRect.height);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!focusNodeId || !graphRef.current) return;
		const gd = graphRef.current;
		const nodeObj = (gd as any).graphData?.().nodes?.find((n: any) => n.id === focusNodeId);
		if (nodeObj && typeof nodeObj.x === 'number') {
			gd.centerAt(nodeObj.x, nodeObj.y, 400);
			gd.zoom(3, 400);
		}
	}, [focusNodeId, focusTrigger]);

	const graphData = useMemo(() => ({
		nodes: nodes.map(n => ({ ...n })),
		links: edges.map(e => ({
			source: e.source,
			target: e.target,
			label: e.label,
		})),
	}), [nodes, edges]);

	const handleEngineStop = useCallback(() => {
		if (graphRef.current && !hasZoomedRef.current) {
			hasZoomedRef.current = true;
			graphRef.current.zoomToFit(300, 30);
		}
	}, []);

	const graphDataRef = useRef(graphData);
	graphDataRef.current = graphData;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const canvas = container.querySelector('canvas');
		if (!canvas) return;

		const getGraphCoords = (e: MouseEvent) => {
			if (!graphRef.current) return null;
			const rect = canvas.getBoundingClientRect();
			return (graphRef.current as any).screen2GraphCoords(
				e.clientX - rect.left,
				e.clientY - rect.top,
			);
		};

		const getZoom = (): number => {
			if (!graphRef.current) return 1;
			return (graphRef.current as any).zoom?.() || 1;
		};

		const handleMouseMove = (e: MouseEvent) => {
			const coords = getGraphCoords(e);
			if (!coords) return;
			const nearest = findNearestNode(graphDataRef.current.nodes, coords.x, coords.y, getZoom());
			if (nearest) {
				canvas.style.cursor = 'pointer';
				if (onNodeHoverRef.current) onNodeHoverRef.current(nearest as RdfGraphNode);
			} else {
				canvas.style.cursor = 'default';
				if (onNodeHoverRef.current) onNodeHoverRef.current(null);
			}
		};

		const handleClick = (e: MouseEvent) => {
			const coords = getGraphCoords(e);
			if (!coords) return;
			const nearest = findNearestNode(graphDataRef.current.nodes, coords.x, coords.y, getZoom());
			if (nearest) {
				if (onNodeClickRef.current) onNodeClickRef.current(nearest as RdfGraphNode);
			} else {
				if (onBackgroundClickRef.current) onBackgroundClickRef.current();
			}
		};

		canvas.addEventListener('mousemove', handleMouseMove);
		canvas.addEventListener('click', handleClick);
		return () => {
			canvas.removeEventListener('mousemove', handleMouseMove);
			canvas.removeEventListener('click', handleClick);
		};
	}, [graphData, containerWidth, containerHeight]);

	const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
		const x = node.x as number;
		const y = node.y as number;
		if (typeof x !== 'number' || typeof y !== 'number') return;

		const r = getNodeRadius(node);
		const color = getGroupColor(node.group);
		const isSelected = node.id === selectedRef.current;
		const isHovered = node.id === hoveredRef.current;

		if (isSelected) {
			ctx.beginPath();
			ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
			ctx.strokeStyle = darkMode ? '#ffffff' : '#1f2937';
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2 * Math.PI);
		ctx.fillStyle = color;
		ctx.fill();

		// Show labels for hub nodes always; others on hover/select or when zoomed in
		const isPaper = node.group === 'Paper';
		const zoomedIn = globalScale > 1.8;
		const showLabel = isPaper || isHovered || isSelected || zoomedIn;
		if (showLabel && node.label) {
			const fontSize = Math.max(10 / globalScale, 1.5);
			ctx.font = `${isPaper ? 'bold ' : ''}${fontSize}px Sans-Serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			ctx.fillStyle = theme.labelColor;
			const maxLen = isPaper ? 35 : 25;
			const label = node.label.length > maxLen ? node.label.substring(0, maxLen) + '...' : node.label;
			ctx.fillText(label, x, y + r + 1.5);
		}
	}, [darkMode, theme.labelColor]);

	const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
		const start = link.source;
		const end = link.target;
		if (!start || !end || typeof start.x !== 'number') return;

		const srcId = typeof start === 'object' ? start.id : start;
		const tgtId = typeof end === 'object' ? end.id : end;
		const isEndpointActive = srcId === hoveredRef.current || tgtId === hoveredRef.current
			|| srcId === selectedRef.current || tgtId === selectedRef.current;

		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.strokeStyle = theme.edgeColor;
		ctx.lineWidth = 0.5;
		ctx.stroke();

		if (isEndpointActive && link.label) {
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

	useEffect(() => {
		if (graphRef.current) {
			(graphRef.current as any).refresh?.();
		}
	}, [hoveredNodeId, selectedNodeId]);

	if (nodes.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
				No graph data available.
			</div>
		);
	}

	const resolvedHeight = containerHeight ?? height ?? 500;

	return (
		<div ref={containerRef} className="h-full w-full">
			{containerWidth && resolvedHeight > 0 && (
				<ForceGraph2D
					ref={graphRef}
					graphData={graphData}
					width={containerWidth}
					height={resolvedHeight}
					backgroundColor={theme.bg}
					nodeCanvasObject={nodeCanvasObject}
					nodeCanvasObjectMode={() => 'replace'}
					nodeVisibility={nodeVisibility}
					linkVisibility={linkVisibility}
					linkCanvasObject={linkCanvasObject}
					linkCanvasObjectMode={() => 'replace'}
					onEngineStop={handleEngineStop}
					enableNodeDrag={false}
					warmupTicks={50}
					cooldownTicks={50}
					d3AlphaDecay={0.02}
					d3VelocityDecay={0.3}
				/>
			)}
		</div>
	);
};

export { GROUP_COLORS, getGroupColor };
export default OntologyGraph;
