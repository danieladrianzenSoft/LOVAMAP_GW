import { Parser, Quad } from 'n3';
import {
	RdfGraph,
	RdfGraphNode,
	RdfGraphEdge,
	RdfOntologySummary,
	RdfClassSummary,
	RdfPropertySummary,
} from '../models/rdfGraph';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// Predicates whose literal value should become the node's display label
const LABEL_PREDICATES = new Set([
	'http://www.w3.org/2000/01/rdf-schema#label',
	'http://xmlns.com/foaf/0.1/name',
	'http://purl.org/dc/terms/title',
]);

function extractLocalName(uri: string): string {
	const hashIdx = uri.lastIndexOf('#');
	if (hashIdx >= 0) return uri.substring(hashIdx + 1);
	const slashIdx = uri.lastIndexOf('/');
	if (slashIdx >= 0) return uri.substring(slashIdx + 1);
	return uri;
}

/**
 * Expand prefixed names containing '/' in the local part to full URIs.
 * The Turtle spec doesn't allow '/' in PN_LOCAL, but tools like Apache Jena
 * accept it. The n3 parser is strict, so we expand these before parsing.
 */
function expandSlashPrefixedNames(ttlContent: string): string {
	const prefixes = new Map<string, string>();
	const prefixRe = /@prefix\s+(\w+):\s*<([^>]+)>\s*\./g;
	let m;
	while ((m = prefixRe.exec(ttlContent)) !== null) {
		prefixes.set(m[1], m[2]);
	}
	if (prefixes.size === 0) return ttlContent;

	// Match prefixed names whose local part contains '/'.
	// Allow '.' mid-name (e.g. 10.1002) but not a trailing '.' (statement terminator).
	return ttlContent.replace(
		/\b(\w+):((?:[^\s;,.\)\]]|\.(?!\s))*\/(?:[^\s;,.\)\]]|\.(?!\s))*)/g,
		(full, prefix, local) => {
			const iri = prefixes.get(prefix);
			return iri ? `<${iri}${local}>` : full;
		}
	);
}

function parseQuads(ttlContent: string): Quad[] {
	const parser = new Parser();
	return parser.parse(expandSlashPrefixedNames(ttlContent));
}

/**
 * Builds a visualization graph matching the reference HTML approach:
 * - Only instance nodes (no separate class or literal nodes)
 * - rdf:type → sets the node's group (no class node created)
 * - ALL literals → stored as properties on the subject node
 * - Only URI/BlankNode objects create edges
 * - Uses rdfs:label / foaf:name / dc:title as human-readable labels
 */
export function parseTtlToGraph(ttlContent: string): RdfGraph {
	const quads = parseQuads(ttlContent);

	// First pass: collect rdf:type per subject
	const subjectTypes = new Map<string, string>();
	for (const q of quads) {
		if (q.predicate.value === RDF_TYPE) {
			subjectTypes.set(q.subject.value, q.object.value);
		}
	}

	const nodeMap = new Map<string, RdfGraphNode>();
	const edgeSet = new Set<string>();
	const edges: RdfGraphEdge[] = [];

	function addEdge(source: string, label: string, target: string) {
		const key = `${source}|${label}|${target}`;
		if (!edgeSet.has(key)) {
			edgeSet.add(key);
			edges.push({ source, target, label });
		}
	}

	function ensureNode(id: string, defaults: Omit<RdfGraphNode, 'id'>): RdfGraphNode {
		let node = nodeMap.get(id);
		if (!node) {
			node = { id, ...defaults };
			nodeMap.set(id, node);
		}
		return node;
	}

	// Second pass: build nodes + edges
	for (const q of quads) {
		const sVal = q.subject.value;
		const pVal = q.predicate.value;
		const oVal = q.object.value;
		const predLabel = extractLocalName(pVal);

		// Ensure subject node exists
		const sTypeUri = subjectTypes.get(sVal);
		const sGroup = sTypeUri ? extractLocalName(sTypeUri) : undefined;
		ensureNode(sVal, {
			label: extractLocalName(sVal),
			type: 'instance',
			group: sGroup,
			properties: {},
		});

		if (pVal === RDF_TYPE) {
			// Just set the group — no class node, no edge
			const node = nodeMap.get(sVal)!;
			if (!node.group) {
				node.group = extractLocalName(oVal);
			}
		} else if (q.object.termType === 'NamedNode' || q.object.termType === 'BlankNode') {
			// URI/blank node object → instance node + edge
			const oTypeUri = subjectTypes.get(oVal);
			const oGroup = oTypeUri ? extractLocalName(oTypeUri) : undefined;
			ensureNode(oVal, {
				label: extractLocalName(oVal),
				type: 'instance',
				group: oGroup,
				properties: {},
			});
			addEdge(sVal, predLabel, oVal);
		} else if (q.object.termType === 'Literal') {
			// ALL literals → properties on the subject node
			const subjectNode = nodeMap.get(sVal)!;
			const numVal = parseFloat(oVal);
			if (!isNaN(numVal) && isFinite(numVal) && /^-?\d/.test(oVal)) {
				subjectNode.properties[predLabel] = numVal;
			} else {
				subjectNode.properties[predLabel] = oVal;
			}

			// Use label predicates as the node's display label
			if (LABEL_PREDICATES.has(pVal)) {
				subjectNode.label = oVal;
			}
		}
	}

	return {
		nodes: Array.from(nodeMap.values()),
		edges,
	};
}

export function buildSummaryFromQuads(ttlContent: string): RdfOntologySummary {
	const quads = parseQuads(ttlContent);

	const classCounts = new Map<string, number>();
	const propertyUsage = new Map<string, number>();
	const propertyDatatypes = new Map<string, string>();
	const propertyValues = new Map<string, Set<string>>();
	let totalInstances = 0;

	for (const q of quads) {
		const pVal = q.predicate.value;

		if (pVal === RDF_TYPE) {
			const classUri = q.object.value;
			classCounts.set(classUri, (classCounts.get(classUri) || 0) + 1);
			totalInstances++;
		} else {
			propertyUsage.set(pVal, (propertyUsage.get(pVal) || 0) + 1);
			if (q.object.termType === 'Literal' && q.object.datatypeString) {
				propertyDatatypes.set(pVal, q.object.datatypeString);
			}
			if (!propertyValues.has(pVal)) {
				propertyValues.set(pVal, new Set());
			}
			const vals = propertyValues.get(pVal)!;
			if (vals.size < 10) {
				vals.add(q.object.value);
			}
		}
	}

	const classes: RdfClassSummary[] = Array.from(classCounts.entries()).map(([uri, count]) => ({
		uri,
		label: extractLocalName(uri),
		instanceCount: count,
	}));

	const properties: RdfPropertySummary[] = Array.from(propertyUsage.entries()).map(([uri, count]) => ({
		uri,
		label: extractLocalName(uri),
		usageCount: count,
		datatype: propertyDatatypes.get(uri),
		distinctValues: Array.from(propertyValues.get(uri) || []),
	}));

	return {
		classes,
		properties,
		totalTriples: quads.length,
		totalInstances,
	};
}
