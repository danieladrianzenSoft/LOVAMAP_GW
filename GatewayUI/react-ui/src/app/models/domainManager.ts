export interface DomainListItem {
	id: number;
	scaffoldId: number;
	scaffoldGroupId: number;
	category: string;
	originalFileName: string | null;
	hasMesh: boolean;
	hasMetadata: boolean;
	createdAt: string;
}

export interface DomainSummary {
	totalDomains: number;
	withMesh: number;
	withMetadata: number;
	withoutMetadata: number;
	particleCount: number;
	poreCount: number;
}

export interface BatchMetadataUpdateRequest {
	sourcePath: string;
	dryRun: boolean;
	includeMeshes: boolean;
}

export interface BatchMetadataUpdateResult {
	dryRun: boolean;
	totalFilesScanned: number;
	matchedCount: number;
	unmatchedCount: number;
	succeededCount: number;
	failedCount: number;
	matched: BatchMetadataMatch[];
	unmatchedFiles: string[];
	errors: string[];
}

export interface BatchMetadataMatch {
	fileName: string;
	domainId: number;
	scaffoldId: number;
	category: string;
	matchedOriginalFileName: string;
	hasCompanionMesh: boolean;
	updated: boolean;
}

export interface DomainLookupItem {
	id: number;
	scaffoldId: number;
	category: string;
	originalFileName: string;
	hasMetadata: boolean;
}
