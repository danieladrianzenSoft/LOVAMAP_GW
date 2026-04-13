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

export interface PublicationToCreate {
	title: string;
	authors: string;
	journal: string;
	publishedAt: string;
	doi: string;
	citation: string | null;
}

export interface DescriptorRuleToCreate {
	descriptorTypeId: number;
	jobMode: number;
	jobId: string | null;
}