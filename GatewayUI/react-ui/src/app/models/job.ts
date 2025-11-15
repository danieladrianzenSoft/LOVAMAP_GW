
export interface Job {
	csvFile: File | null;
	datFile: File | null;
	jsonFile: File | null;
	jobId: string;
	dx: number;
	scaffoldGroupId: number;
}