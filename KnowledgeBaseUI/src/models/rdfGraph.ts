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

// ── NL → SPARQL query result ──

export interface QueryResult {
	sparql: string;
	explanation?: string;
	answer?: string;
	columns: string[];
	rows: Record<string, string>[];
}

// ── Ontology entity interfaces ──

export interface Paper {
	uri: string;
	title: string;
	doi: string;
	year?: string;
	journalUri?: string;
	journalTitle?: string;
	paperType?: string;
	focusMaterial?: string;
	hasLabData?: boolean;
	authorUris: string[];
	authorNames: string[];
}

export interface Author {
	uri: string;
	familyName?: string;
	givenName?: string;
	name?: string;
	affiliation?: string;
}

export interface Journal {
	uri: string;
	title: string;
}

export interface Material {
	uri: string;
	label: string;
	paperUri?: string;
	particleShape?: string;
	particleMaterial?: string;
	particleSizeMin?: number;
	particleSizeMax?: number;
	particleSizeUnit?: string;
	sizeDistribution?: string;
	stiffnessQualitative?: string;
	fabricationMethodUri?: string;
	geometryProfileUri?: string;
	packingConfiguration?: string;
	reportedPoreSize?: string;
}

export interface Experiment {
	uri: string;
	label: string;
	paperUri?: string;
	experimentCategory?: string;
	experimentType?: string;
	assayOrMethod?: string;
	cellType?: string;
	cellSource?: string;
	cultureDuration?: string;
	equipment?: string;
	temperature?: string;
	usedMaterialUris: string[];
}

export interface Outcome {
	uri: string;
	label: string;
	paperUri?: string;
	experimentUri?: string;
	measurementCategory?: string;
	measurementType?: string;
	value?: number;
	unit?: string;
	scope?: string;
	significant?: boolean;
	direction?: string;
	comparedTo?: string;
	dataSource?: string;
}

export interface FabricationMethod {
	uri: string;
	label: string;
	paperUri?: string;
	chemistry?: string;
	manufacturingMethod?: string;
	annealingChemistry?: string;
	annealingConditions?: string;
	monomer?: string;
	crosslinker?: string;
	surfactant?: string;
	enzyme?: string;
	peptides: string[];
	additionalReagents: string[];
}

export interface GeometryProfile {
	uri: string;
	label: string;
	matchType?: string;
	matchDescription?: string;
	matchMaterial?: string;
	matchSizeMin?: number;
	matchSizeMax?: number;
	scaffoldCount?: number;
}
