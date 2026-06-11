
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
}

export interface SegmentationJob {
	tifFile: File;
	fluorescentLabel: number; // 0 or 1
	radiusUm: number;
	dx?: number;
	dy?: number;
	dz?: number;
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