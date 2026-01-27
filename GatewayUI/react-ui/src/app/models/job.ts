
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
}

export interface JobDetailed {
	id: string;
	submittedAt: string;
	completedAt?: string | null;
	status: string;
	hasResults: boolean;
	fileName?: string | null;
}