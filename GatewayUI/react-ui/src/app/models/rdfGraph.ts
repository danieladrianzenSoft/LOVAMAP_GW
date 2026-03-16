export interface RdfGraphNode {
	id: string;
	label: string;
	type: string;
	group?: string;
	properties: Record<string, any>;
}

export interface RdfGraphEdge {
	source: string;
	target: string;
	label: string;
}

export interface RdfGraph {
	nodes: RdfGraphNode[];
	edges: RdfGraphEdge[];
}

export interface RdfClassSummary {
	uri: string;
	label: string;
	instanceCount: number;
}

export interface RdfPropertySummary {
	uri: string;
	label: string;
	usageCount: number;
	datatype?: string;
	distinctValues: string[];
}

export interface RdfOntologySummary {
	classes: RdfClassSummary[];
	properties: RdfPropertySummary[];
	totalTriples: number;
	totalInstances: number;
}
