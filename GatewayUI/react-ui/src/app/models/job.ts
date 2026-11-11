
export interface Job {
	csvFile: File | null;
	datFile: File | null;
	jsonFile: File | null;
	jobId: string;
	dx: number;
	scaffoldGroupId: number;
}

export interface JobForList {
	id: string;
	submittedAt: string;
	status: string;
	jobType?: string;
	sourceJobId?: string;
	scaffoldGroupId?: number;
	scaffoldId?: number;
	creatorEmail?: string;
	errorMessage?: string | null;
}

export interface JobDetailed {
	id: string;
	submittedAt: string;
	completedAt?: string | null;
	status: string;
	hasResults: boolean;
	fileName?: string | null;
	jobType?: string;
	sourceJobId?: string;
	scaffoldGroupId?: number;
	scaffoldId?: number;
	errorMessage?: string | null;
	segmentationParams?: Record<string, string> | null;
}

export interface SegmentationJob {
	tifFile: File;
	fluorescentLabel: number; // 0 or 1
	radiusUm: number;
	dx: number;
	dy: number;
	dz: number;
}

export interface MeshJob {
	file: File;
	meshWorkflow: 'mesh_generation' | 'unite_meshes';
}

export interface LovamapFromSourceJob {
	sourceJobId: string;
	dx?: string;
	generateMesh?: boolean;
}

export interface MeshStatusResponse {
	poreMeshStatus: string | null;
	particleMeshStatus: string | null;
}

export interface SaveLovamapResultParticle {
	shape: string;
	stiffness: string;
	dispersity: string;
	sizeDistributionType?: string;
	material?: string;
	proportion: number;
	youngsModulus?: number | null;
}

export interface Pagination {
	currentPage: number;
	itemsPerPage: number;
	totalItems: number;
	totalPages: number;
}

export interface ToolVersions {
	lovamap: string | null;
	segmentationWorkflows: string | null;
	particleSegmentation: string | null;
}

export interface PreviewInfo {
	filename: string;
	dimensions: { x: number; y: number; z: number };
	voxel_size: { dx: number | null; dy: number | null; dz: number | null };
	voxel_size_sources: { dx: string; dy: string; dz: string };
	params?: Record<string, number | string | null>;
	slices: { name: string; z_index: number }[];
	segmented_slices?: { name: string; z_index: number }[];
	segmented_dimensions?: { x: number; y: number; z: number };
}

export type MeshReadiness = 'checking' | 'ready' | 'generating' | 'failed' | 'stopped' | 'unavailable' | 'not-available';

export interface SaveLovamapResultRequest {
	scaffoldGroupId?: number | null;
	isSimulated: boolean;
	packingConfiguration: string;
	containerShape: string;
	containerDimensions?: string;
	particles: SaveLovamapResultParticle[];
	interlinkingMechanism?: string;
	scaffoldOccupants?: string;
	imagingMethod?: string;
}