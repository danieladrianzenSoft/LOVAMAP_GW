export interface Publication {
	id: number;
	title: string;
	authors: string;
	journal: string;
	publishedAt: Date;
	doi: string;
	citation: string | null;
	scaffoldGroupIds: number[];
	descriptorTypeIds: number[];
}